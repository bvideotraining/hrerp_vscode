import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { ScopeService } from '../common/scope.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';
import { LeaveBalanceService } from './leave-balance.service';
import { AttendanceService } from '../attendance/attendance.service';

const ADMIN_ROLES = ['admin', 'hr_manager'];
const APPROVER_ROLES = ['approver', 'branch_approver'];
const ALL_PRIVILEGED = [...ADMIN_ROLES, ...APPROVER_ROLES];

/** Normalize role strings: "Branch Approver" → "branch_approver" */
function normalizeRole(role: string): string {
  return (role || '').toLowerCase().replace(/[\s-]+/g, '_');
}

/** Application Admin has role='employee' but accessType='full' — treat as admin */
function isAdmin(role: string, accessType: string): boolean {
  return ADMIN_ROLES.includes(normalizeRole(role)) || accessType === 'full';
}

@Injectable()
export class LeavesService {
  constructor(
    private firebaseService: FirebaseService,
    private leaveBalanceService: LeaveBalanceService,
    private attendanceService: AttendanceService,
    private scopeService: ScopeService,
  ) {}

  async create(dto: CreateLeaveDto, createdBy: string, creatorRole?: string, creatorAccessType?: string, creatorEmployeeId?: string) {
    if (dto.leaveType === 'sick' && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException('Medical report attachment is required for sick leave');
    }

    // Scope check: approvers and custom-role users can only create leaves for employees in their scope
    const normalizedCreatorRole = normalizeRole(creatorRole || '');
    const needsScopeCheck =
      normalizedCreatorRole === 'approver' ||
      normalizedCreatorRole === 'branch_approver' ||
      creatorAccessType === 'custom';
    if (needsScopeCheck) {
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(createdBy, creatorRole || '', creatorAccessType || '', creatorEmployeeId);
      // allowedIds === null means admin (no restriction); empty Set with no scope means no restriction either
      if (allowedIds !== null && allowedIds.size > 0 && !allowedIds.has(dto.employeeId)) {
        throw new ForbiddenException('You can only create leave requests for employees in your assigned scope');
      }
    }
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('leaves').doc();
    const data = {
      ...dto,
      attachments: dto.attachments || [],
      status: 'pending',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  /**
   * Find leave requests with optional filters.
   * Role-aware: branch_approver automatically filtered to their branch.
   */
  async findAll(
    employeeId?: string,
    status?: string,
    requesterRole?: string,
    requesterId?: string,
    accessType?: string,
    requesterEmployeeId?: string,
  ) {
    const db = this.firebaseService.getFirestore();
    let query: any;
    if (employeeId) {
      query = db.collection('leaves').where('employeeId', '==', employeeId);
    } else {
      query = db.collection('leaves').orderBy('createdAt', 'desc');
    }
    const snap = await query.get();
    let records = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];

    // Filter by status in-memory to avoid composite Firestore indexes
    if (status) {
      records = records.filter((r: any) => r.status === status);
    }

    // Application Admin (accessType='full') sees all — no branch filter
    if (isAdmin(requesterRole || '', accessType || '')) return records;

    // Approver: restrict to leaves for employees in their configured departments
    if (normalizeRole(requesterRole || '') === 'approver' && requesterId) {
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, 'approver', '', requesterEmployeeId);
      if (allowedIds !== null) {
        records = records.filter((r: any) => allowedIds.has(r.employeeId));
      }
    }

    // Branch approver: restrict to leaves for employees in their branch
    if (normalizeRole(requesterRole || '') === 'branch_approver' && requesterId) {
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, 'branch_approver', '', requesterEmployeeId);
      if (allowedIds !== null) {
        records = records.filter((r: any) => allowedIds.has(r.employeeId));
      }
    }

    // Custom-role user: restrict to leaves for employees in their job title scope
    if (accessType === 'custom' && requesterId) {
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, requesterRole || '', accessType);
      if (allowedIds !== null && allowedIds.size > 0) {
        records = records.filter((r: any) => allowedIds.has(r.employeeId));
      }
    }

    // Sort in-memory descending by createdAt
    records.sort((a: any, b: any) => {
      const ta = a.createdAt?._seconds ?? 0;
      const tb = b.createdAt?._seconds ?? 0;
      return tb - ta;
    });
    return records;
  }

  async findOne(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');
    return { id: doc.id, ...doc.data() };
  }

  async update(
    id: string,
    dto: UpdateLeaveDto,
    requesterId: string,
    requesterRole: string,
    accessType: string = '',
    requesterEmployeeId?: string,
  ) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');

    const existing = doc.data() as any;
    const isAdminUser = isAdmin(requesterRole, accessType);
    const isApprover = normalizeRole(requesterRole) === 'approver';
    const isBranchApprover = normalizeRole(requesterRole) === 'branch_approver';

    if (isAdminUser) {
      // Admin/HR: full access — no restrictions
    } else if (isApprover) {
      // Approver: can only approve/reject pending leaves in their assigned departments
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be approved or rejected');
      }
      // Scope check: ensure target employee is in allowed departments
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, 'approver', '', requesterEmployeeId);
      if (allowedIds !== null && !allowedIds.has(existing.employeeId)) {
        throw new ForbiddenException('You can only approve leave requests for employees in your assigned departments');
      }
      const allowed = new Set(['status', 'approvedBy', 'rejectedReason']);
      (Object.keys(dto) as (keyof UpdateLeaveDto)[]).forEach((k) => {
        if (!allowed.has(k)) delete dto[k];
      });
    } else if (isBranchApprover) {
      // Branch approver: can only approve/reject pending leaves for employees in their branch AND allowed departments
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be approved or rejected');
      }
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, 'branch_approver', '', requesterEmployeeId);
      if (allowedIds !== null && !allowedIds.has(existing.employeeId)) {
        throw new ForbiddenException('You can only approve leave requests for employees in your branch');
      }
      const allowed = new Set(['status', 'approvedBy', 'rejectedReason']);
      (Object.keys(dto) as (keyof UpdateLeaveDto)[]).forEach((k) => {
        if (!allowed.has(k)) delete dto[k];
      });
    } else if (accessType === 'custom') {
      // Custom-role approver: can only approve/reject pending leaves for employees in their scoped job titles
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be approved or rejected');
      }
      const allowedIds = await this.scopeService.getAllowedEmployeeIds(requesterId, requesterRole || '', accessType);
      if (allowedIds !== null && !allowedIds.has(existing.employeeId)) {
        throw new ForbiddenException('You can only approve leave requests for employees in your assigned scope');
      }
      const allowed = new Set(['status', 'approvedBy', 'rejectedReason']);
      (Object.keys(dto) as (keyof UpdateLeaveDto)[]).forEach((k) => {
        if (!allowed.has(k)) delete dto[k];
      });
    } else {
      // Regular employee: can only edit their own pending requests (no approve/reject)
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only modify your own leave requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be modified');
      }
      delete dto.status;
      delete dto.approvedBy;
      delete dto.rejectedReason;
    }

    // Block approving a sick leave that has no medical report
    if (dto.status === 'approved' && existing.leaveType === 'sick') {
      const existingAttachments: any[] = existing.attachments || [];
      if (existingAttachments.length === 0) {
        throw new BadRequestException('Cannot approve sick leave without a medical report attachment');
      }
    }

    const wasApproved = existing.status === 'approved';
    const nowApproved = dto.status === 'approved';
    const nowRejected = dto.status === 'rejected';

    const data = { ...dto, updatedAt: new Date() };
    await db.collection('leaves').doc(id).update(data);

    // Sync leave balance
    const leaveYear = existing.startDate
      ? new Date(existing.startDate).getFullYear()
      : new Date().getFullYear();

    if (!wasApproved && nowApproved) {
      // Newly approved → deduct from balance
      await this.leaveBalanceService.deductBalance(
        existing.employeeId,
        existing.leaveType,
        existing.totalDays,
        leaveYear,
      );
      // Auto-create attendance records for each day of the approved leave
      await this.createLeaveAttendanceRecords({ ...existing, id }, requesterId);
    } else if (wasApproved && (nowRejected || dto.status === 'pending')) {
      // Un-approved → restore balance and remove the generated attendance records
      await this.leaveBalanceService.restoreBalance(
        existing.employeeId,
        existing.leaveType,
        existing.totalDays,
        leaveYear,
      );
      await this.removeLeaveAttendanceRecords(existing.id ?? id, existing.employeeId);
    } else if (wasApproved && nowApproved === undefined && isAdminUser) {
      // Admin editing an already-approved leave (dates, type, etc.) — re-sync attendance
      const datesChanged = (dto.startDate && dto.startDate !== existing.startDate) ||
                           (dto.endDate && dto.endDate !== existing.endDate);
      const typeChanged = dto.leaveType && dto.leaveType !== existing.leaveType;
      if (datesChanged || typeChanged) {
        // Restore old balance, remove old attendance
        await this.leaveBalanceService.restoreBalance(
          existing.employeeId,
          existing.leaveType,
          existing.totalDays,
          leaveYear,
        );
        await this.removeLeaveAttendanceRecords(existing.id ?? id, existing.employeeId);
        // Deduct new balance, create new attendance
        const merged = { ...existing, ...dto, id };
        const newYear = merged.startDate
          ? new Date(merged.startDate).getFullYear()
          : leaveYear;
        await this.leaveBalanceService.deductBalance(
          merged.employeeId,
          merged.leaveType,
          merged.totalDays,
          newYear,
        );
        await this.createLeaveAttendanceRecords(merged, requesterId);
      }
    }

    return { id, ...existing, ...data };
  }

  async remove(id: string, requesterId: string, requesterRole: string, accessType: string = '') {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');

    const existing = doc.data() as any;

    if (!isAdmin(requesterRole, accessType)) {
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only cancel your own leave requests');
      }
      if (existing.status !== 'pending') {
        throw new ForbiddenException('Only pending requests can be cancelled');
      }
    }

    // If deleting an approved leave, restore balance and remove generated attendance
    if (existing.status === 'approved') {
      const leaveYear = existing.startDate
        ? new Date(existing.startDate).getFullYear()
        : new Date().getFullYear();
      await this.leaveBalanceService.restoreBalance(
        existing.employeeId,
        existing.leaveType,
        existing.totalDays,
        leaveYear,
      );
      await this.removeLeaveAttendanceRecords(id, existing.employeeId);
    }

    await db.collection('leaves').doc(id).delete();
    return { deleted: true };
  }

  /** Upload an attachment file to Firebase Storage and return its metadata (no leave ID needed) */
  async uploadAttachment(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
    const storagePath = `medical-reports/pending/${uuidv4()}${ext ? '.' + ext : ''}`;
    const url = await this.firebaseService.uploadToStorage(file.buffer, file.mimetype, storagePath);
    return { url, name: file.originalname, mimeType: file.mimetype };
  }

  /** Upload a medical report to an existing leave and append it to the attachments array */
  async uploadMedicalReport(
    id: string,
    file: Express.Multer.File,
    requesterId: string,
    requesterRole: string,
    accessType: string = '',
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('leaves').doc(id).get();
    if (!doc.exists) throw new NotFoundException('Leave request not found');
    const existing = doc.data() as any;

    if (!isAdmin(requesterRole, accessType)) {
      if (existing.employeeId !== requesterId && existing.createdBy !== requesterId) {
        throw new ForbiddenException('You can only upload attachments for your own leave requests');
      }
    }

    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
    const storagePath = `medical-reports/${id}/${uuidv4()}${ext ? '.' + ext : ''}`;
    const url = await this.firebaseService.uploadToStorage(file.buffer, file.mimetype, storagePath);
    const attachment = { name: file.originalname, url, mimeType: file.mimetype, uploadedAt: new Date() };
    const updatedAttachments = [...(existing.attachments || []), attachment];
    await db.collection('leaves').doc(id).update({ attachments: updatedAttachments, updatedAt: new Date() });
    return { id, attachment, attachments: updatedAttachments };
  }

  /** Look up the branch associated with a user from systemUsers / users collection */
  private async getUserBranch(userId: string): Promise<string | null> {
    const db = this.firebaseService.getFirestore();
    const sysDoc = await db.collection('systemUsers').doc(userId).get();
    if (sysDoc.exists) {
      const d = sysDoc.data() as any;
      return d?.branch || d?.employeeBranch || null;
    }
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const d = userDoc.data() as any;
      return d?.branch || d?.employeeBranch || null;
    }
    return null;
  }

  /**
   * Map leave type to the correct attendance status.
   * annual, casual, sick → 'on_leave'
   * unpaid → 'unpaid_leave'
   */
  private leaveTypeToAttendanceStatus(leaveType: string): 'on_leave' | 'unpaid_leave' {
    return leaveType === 'unpaid' ? 'unpaid_leave' : 'on_leave';
  }

  /**
   * Enumerate every calendar date between startDate and endDate inclusive (YYYY-MM-DD).
   */
  private dateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (current <= end) {
      // Use local date parts to avoid UTC timezone shift
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /**
   * Create one attendance record per leave day when a leave is approved.
   * Skips any date that already has an attendance record for this employee.
   * Stores leaveId on each record so they can be removed if the leave is un-approved.
   */
  private async createLeaveAttendanceRecords(leave: any, approvedBy: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const status = this.leaveTypeToAttendanceStatus(leave.leaveType);
    const dates = this.dateRange(leave.startDate, leave.endDate ?? leave.startDate);

    // Fetch employee doc to get employeeCode and category (not always stored on the leave)
    let employeeCode = leave.employeeCode ?? '';
    let employeeCategory = leave.employeeCategory ?? '';
    if (!employeeCode || !employeeCategory) {
      const empDoc = await db.collection('employees').doc(leave.employeeId).get();
      if (empDoc.exists) {
        const emp = empDoc.data() as any;
        if (!employeeCode) employeeCode = emp.employeeCode ?? '';
        if (!employeeCategory) employeeCategory = emp.category ?? '';
      }
    }

    for (const date of dates) {
      // Skip if attendance record already exists for this date
      const existing = await db
        .collection('attendance')
        .where('employeeId', '==', leave.employeeId)
        .where('date', '==', date)
        .limit(1)
        .get();
      if (!existing.empty) continue;

      const dto: any = {
        employeeId: leave.employeeId,
        employeeCode,
        employeeName: leave.employeeName ?? '',
        branch: leave.employeeBranch ?? '',
        category: employeeCategory,
        date,
        status,
        leaveId: leave.id,
        leaveType: leave.leaveType,
      };

      await this.attendanceService.create(dto, approvedBy);
    }
  }

  /**
   * Remove attendance records that were auto-generated for a specific leave
   * when that leave is un-approved or rejected.
   */
  private async removeLeaveAttendanceRecords(leaveId: string, employeeId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('leaveId', '==', leaveId)
      .get();

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    if (!snap.empty) await batch.commit();
  }
}
