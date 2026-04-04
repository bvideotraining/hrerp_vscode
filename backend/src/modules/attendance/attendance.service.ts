import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { OrganizationService } from '@modules/organization/organization.service';
import { ScopeService } from '@modules/common/scope.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';

export interface AttendanceRequestUser {
  userId: string;
  role: string;
  accessType: string;
  employeeId?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Injectable()
export class AttendanceService {
  constructor(
    private firebaseService: FirebaseService,
    private organizationService: OrganizationService,
    private scopeService: ScopeService,
  ) {}

  // ═══ HELPERS ══════════════════════════════════════════════════════════════

  /** Parse "HH:MM" into total minutes from midnight */
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Calculate late minutes for a given check-in time and employee category.
   * Returns 0 for PartTime (flexible) unless a manual override is provided.
   */
  calculateLateMinutes(
    checkIn: string,
    category: string,
    rules: any[],
  ): number {
    const rule = rules.find(
      (r) => (r.category ?? '').toLowerCase() === (category ?? '').toLowerCase(),
    );
    if (!rule) return 0;
    if (rule.isFlexible) return 0; // PartTime — manual only

    const workStartMin = this.timeToMinutes(rule.workStart);
    const checkInMin = this.timeToMinutes(checkIn);

    // Late minutes = check-in minus official work start.
    // freeMinutes is NOT a grace window on check-in time; it is already
    // represented by the first deduction-schedule tier (0–freeMinutes → 0 days).
    const late = checkInMin - workStartMin;
    return late > 0 ? late : 0;
  }

  /**
   * Look up deduction days from the deduction schedule for given late minutes.
   * deductionSchedule is sorted ascending by upToMinutes.
   */
  getDeductionDays(lateMinutes: number, deductionSchedule: any[]): number {
    if (!deductionSchedule || deductionSchedule.length === 0) return 0;
    const sorted = [...deductionSchedule].sort((a, b) => a.upToMinutes - b.upToMinutes);
    for (const entry of sorted) {
      if (lateMinutes <= entry.upToMinutes) return entry.days;
    }
    // Past maximum threshold — return max deduction
    return sorted[sorted.length - 1].days;
  }

  /**
   * Build all derived fields from a DTO + attendance rules.
   */
  private async deriveFields(dto: CreateAttendanceDto | UpdateAttendanceDto) {
    const rules: any[] = await this.organizationService.getAttendanceRules();

    const dateObj = new Date(dto.date + 'T00:00:00');
    const dayIndex = dateObj.getDay(); // 0=Sun … 6=Sat
    const dayOfWeek = DAYS[dayIndex];
    const isSaturday = dayIndex === 6;

    // saturdayWork: can be overridden or auto-set when date IS Saturday
    const saturdayWork =
      dto.saturdayWorkOverride !== undefined
        ? dto.saturdayWorkOverride
        : isSaturday;

    // Late minutes
    let lateMinutes = 0;
    if (dto.lateMinutesOverride !== undefined) {
      lateMinutes = dto.lateMinutesOverride;
    } else if (dto.checkIn && dto.status !== 'absent' && dto.status !== 'on_leave' && dto.status !== 'unpaid_leave') {
      lateMinutes = this.calculateLateMinutes(dto.checkIn as string, dto.category as string, rules);
    }

    // Deduction days
    let deductionDays = 0;
    if (dto.deductionDaysOverride !== undefined) {
      deductionDays = dto.deductionDaysOverride;
    } else if (dto.status === 'absent' || dto.status === 'unpaid_leave') {
      deductionDays = 1;
    } else if (lateMinutes > 0) {
      const rule = rules.find(
        (r) => (r.category ?? '').toLowerCase() === (dto.category ?? '').toLowerCase(),
      );
      const schedule = rule?.deductionSchedule || [];
      deductionDays = this.getDeductionDays(lateMinutes, schedule);
    }

    return { dayOfWeek, saturdayWork, lateMinutes, deductionDays };
  }

  // ═══ CRUD ══════════════════════════════════════════════════════════════════

  async create(dto: CreateAttendanceDto, userId: string) {
    const db = this.firebaseService.getFirestore();

    // Duplicate check: same employee + same date
    const existing = await db.collection('attendance')
      .where('employeeId', '==', dto.employeeId)
      .where('date', '==', dto.date)
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new ConflictException('This log already exists');
    }

    const derived = await this.deriveFields(dto);

    const ref = db.collection('attendance').doc();
    const data = {
      ...dto,
      ...derived,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async findAll(filters?: AttendanceFilterDto, userContext?: AttendanceRequestUser) {
    // Resolve allowed employee IDs for scoped users
    let allowedIds: Set<string> | null = null;
    if (userContext) {
      const scope = await this.scopeService.resolveScope(
        userContext.userId,
        userContext.role,
        userContext.accessType,
        userContext.employeeId,
      );
      if (scope.isOwnScopeOnly && userContext.employeeId) {
        // Own-scope: force filter to their own employee record
        filters = { ...filters, employeeId: userContext.employeeId } as AttendanceFilterDto;
      } else if (!scope.isAdmin) {
        // Approver / branch_approver: resolve the allowed employee IDs
        allowedIds = await this.scopeService.getAllowedEmployeeIds(
          userContext.userId,
          userContext.role,
          userContext.accessType,
          userContext.employeeId,
        );
      }
    }

    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection('attendance');

    // Determine which filters require composite indexes if combined with orderBy/range.
    // Strategy: push ONLY a single equality field to Firestore, do everything else in memory.
    // This avoids ALL composite index requirements.
    const hasEqualityFilter = !!(
      filters?.employeeId || filters?.employeeCode || filters?.branch || filters?.status
    );

    if (filters?.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    } else if (filters?.employeeCode) {
      query = query.where('employeeCode', '==', filters.employeeCode);
    } else if (filters?.branch) {
      query = query.where('branch', '==', filters.branch);
    } else if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    // Only push date-range filters to Firestore when there is NO equality filter,
    // because combining equality + range on different fields needs a composite index.
    if (!hasEqualityFilter) {
      if (filters?.startDate) query = query.where('date', '>=', filters.startDate);
      if (filters?.endDate) query = query.where('date', '<=', filters.endDate);
      query = query.orderBy('date', 'desc');
    }

    const snap = await query.get();
    let records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    // In-memory filters for fields not pushed to Firestore
    if (hasEqualityFilter) {
      if (filters?.branch) records = records.filter((r: any) => r.branch === filters.branch);
      if (filters?.status) records = records.filter((r: any) => r.status === filters.status);
      if (filters?.startDate) records = records.filter((r: any) => r.date >= filters.startDate!);
      if (filters?.endDate) records = records.filter((r: any) => r.date <= filters.endDate!);
    }

    // Case-insensitive employee name filter
    if (filters?.employeeName) {
      const term = filters.employeeName.toLowerCase();
      records = records.filter((r: any) => r.employeeName?.toLowerCase().includes(term));
    }

    // Scope enforcement: approver/branch_approver sees only their allowed employees
    if (allowedIds !== null) {
      console.log('[AttendanceService] Allowed employee IDs for scope:', Array.from(allowedIds));
      records = records.filter((r: any) => allowedIds!.has(r.employeeId));
      console.log('[AttendanceService] Attendance records found after scope filter:', records.length);
    }

    // Sort by date descending
    records.sort((a: any, b: any) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

    // Pagination
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(filters?.limit) || 200));
    records = records.slice((page - 1) * limit, page * limit);

    return records;
  }

  async findById(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('attendance').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Attendance record ${id} not found`);
    return { id: doc.id, ...doc.data() };
  }

  async update(id: string, dto: UpdateAttendanceDto, userId: string) {
    const db = this.firebaseService.getFirestore();
    const existing = await this.findById(id);

    // Merge dto with existing data to allow partial updates with full re-calculation
    const merged: any = { ...existing, ...dto };
    const derived = await this.deriveFields(merged as CreateAttendanceDto);

    const data = {
      ...dto,
      ...derived,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    await db.collection('attendance').doc(id).set(data, { merge: true });
    return { ...existing, ...data, id };
  }

  async delete(id: string) {
    const db = this.firebaseService.getFirestore();
    await db.collection('attendance').doc(id).delete();
    return { deleted: true };
  }

  async bulkImport(records: CreateAttendanceDto[], userId: string) {
    const db = this.firebaseService.getFirestore();
    const rules: any[] = await this.organizationService.getAttendanceRules();
    const batch = db.batch();
    const results: any[] = [];

    for (const dto of records) {
      const ref = db.collection('attendance').doc();
      const dateObj = new Date(dto.date + 'T00:00:00');
      const dayIndex = dateObj.getDay();
      const dayOfWeek = DAYS[dayIndex];
      const saturdayWork = dto.saturdayWorkOverride !== undefined ? dto.saturdayWorkOverride : dayIndex === 6;

      let lateMinutes = 0;
      if (dto.lateMinutesOverride !== undefined) {
        lateMinutes = dto.lateMinutesOverride;
      } else if (dto.checkIn && dto.status !== 'absent' && dto.status !== 'on_leave' && dto.status !== 'unpaid_leave') {
        lateMinutes = this.calculateLateMinutes(dto.checkIn, dto.category, rules);
      }

      let deductionDays = 0;
      if (dto.deductionDaysOverride !== undefined) {
        deductionDays = dto.deductionDaysOverride;
      } else if (dto.status === 'absent' || dto.status === 'unpaid_leave') {
        deductionDays = 1;
      } else if (lateMinutes > 0) {
        const rule = rules.find(
          (r) => (r.category ?? '').toLowerCase() === (dto.category ?? '').toLowerCase(),
        );
        deductionDays = this.getDeductionDays(lateMinutes, rule?.deductionSchedule || []);
      }

      const data = {
        ...dto,
        dayOfWeek,
        saturdayWork,
        lateMinutes,
        deductionDays,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      batch.set(ref, data);
      results.push({ id: ref.id, ...data });
    }

    await batch.commit();
    return { imported: results.length, records: results };
  }

  async getExportData(filters?: AttendanceFilterDto, userContext?: AttendanceRequestUser) {
    // Resolve allowed employee IDs for scoped users (same scope logic as findAll)
    let allowedIds: Set<string> | null = null;
    if (userContext) {
      const scope = await this.scopeService.resolveScope(
        userContext.userId,
        userContext.role,
        userContext.accessType,
      );
      if (scope.isOwnScopeOnly && userContext.employeeId) {
        filters = { ...filters, employeeId: userContext.employeeId } as AttendanceFilterDto;
      } else if (!scope.isAdmin) {
        allowedIds = await this.scopeService.getAllowedEmployeeIds(
          userContext.userId,
          userContext.role,
          userContext.accessType,
        );
      }
    }

    // Same as findAll but no pagination cap — return everything for export
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection('attendance');

    const exportHasEqualityFilter = !!(filters?.employeeId || filters?.branch || filters?.status);

    // Use only one equality filter in Firestore; do the rest in-memory to avoid composite index errors
    if (filters?.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    } else if (filters?.branch) {
      query = query.where('branch', '==', filters.branch);
    } else if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    if (!exportHasEqualityFilter) {
      if (filters?.startDate) query = query.where('date', '>=', filters.startDate);
      if (filters?.endDate) query = query.where('date', '<=', filters.endDate);
      query = query.orderBy('date', 'asc');
    }

    const snap = await query.get();
    let records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    // In-memory secondary filters when equality filter is active
    if (exportHasEqualityFilter) {
      if (filters?.branch) records = records.filter((r: any) => r.branch === filters.branch);
      if (filters?.status) records = records.filter((r: any) => r.status === filters.status);
      if (filters?.startDate) records = records.filter((r: any) => r.date >= filters.startDate!);
      if (filters?.endDate) records = records.filter((r: any) => r.date <= filters.endDate!);
    }

    if (filters?.employeeName) {
      const term = filters.employeeName.toLowerCase();
      records = records.filter((r: any) => r.employeeName?.toLowerCase().includes(term));
    }

    // Scope enforcement
    if (allowedIds !== null) {
      records = records.filter((r: any) => allowedIds!.has(r.employeeId));
    }

    // Ensure ascending date order
    records.sort((a: any, b: any) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    return records;
  }

  getImportTemplate() {
    return {
      description: 'Attendance bulk import template columns',
      required: [
        { column: 'employeeId', type: 'string', example: 'abc123', note: 'Firestore employee ID' },
        { column: 'employeeCode', type: 'string', example: 'EMP-001', note: 'Employee code' },
        { column: 'employeeName', type: 'string', example: 'Ahmed Ali', note: 'Full name' },
        { column: 'branch', type: 'string', example: 'Cairo Branch', note: 'Branch name' },
        { column: 'category', type: 'string', example: 'WhiteCollar', note: 'WhiteCollar | BlueCollar | Management | PartTime' },
        { column: 'date', type: 'string', example: '2026-03-24', note: 'YYYY-MM-DD' },
        { column: 'status', type: 'string', example: 'present', note: 'present | late | absent | on_leave | unpaid_leave' },
      ],
      optional: [
        { column: 'checkIn', type: 'string', example: '08:10', note: 'HH:MM 24-hour' },
        { column: 'checkOut', type: 'string', example: '16:30', note: 'HH:MM 24-hour' },
        { column: 'excuse', type: 'string', example: 'Traffic', note: 'Reason for late / absence' },
        { column: 'lateMinutesOverride', type: 'number', example: '15', note: 'Override auto-calculated late minutes' },
        { column: 'deductionDaysOverride', type: 'number', example: '1', note: 'Override deduction days' },
        { column: 'saturdayWorkOverride', type: 'boolean', example: 'true', note: 'Override Saturday work flag' },
        { column: 'notes', type: 'string', example: 'Approved by manager', note: 'Any additional notes' },
      ],
      exampleRow: {
        employeeId: 'abc123',
        employeeCode: 'EMP-001',
        employeeName: 'Ahmed Ali',
        branch: 'Cairo Branch',
        category: 'WhiteCollar',
        date: '2026-03-24',
        status: 'late',
        checkIn: '08:25',
        checkOut: '16:30',
        excuse: '',
        lateMinutesOverride: '',
        deductionDaysOverride: '',
        saturdayWorkOverride: '',
        notes: '',
      },
    };
  }
}
