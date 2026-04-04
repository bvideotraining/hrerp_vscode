import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { PayrollDataSourceService } from './services/payroll-data-source.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { CashAdvancesService } from '@modules/cash-advances/cash-advances.service';
import { OrganizationService } from '@modules/organization/organization.service';
import {
  GeneratePayrollDto,
  UpdatePayrollDto,
  PayrollFilterDto,
  BatchGeneratePayrollDto,
  BatchGenerateFilteredDto,
  BatchGenerateResultDto,
} from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private firebaseService: FirebaseService,
    private dataSource: PayrollDataSourceService,
    private calculator: PayrollCalculationService,
    private cashAdvancesService: CashAdvancesService,
    private organizationService: OrganizationService,
  ) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  /** Deterministic document ID prevents duplicates */
  private docId(employeeId: string, payrollMonth: string): string {
    return `${employeeId}_${payrollMonth}`;
  }

  /**
   * Look up the month range whose endDate falls in payrollMonth (YYYY-MM).
   * Returns { periodStart, periodEnd } when found; both undefined as fallback.
   * This ensures single-employee generate/update uses the same period window as batch.
   */
  private async resolvePeriod(payrollMonth: string): Promise<{ periodStart?: string; periodEnd?: string }> {
    try {
      const monthRanges = await this.organizationService.getMonthRanges();
      const range = (monthRanges as any[]).find(
        (r: any) => (r.endDate ?? '').substring(0, 7) === payrollMonth,
      );
      if (range?.startDate && range?.endDate) {
        return { periodStart: range.startDate, periodEnd: range.endDate };
      }
    } catch { /* non-critical; fall back to month-prefix matching */ }
    return {};
  }

  // ─── LIST ────────────────────────────────────────────────────────────────

  async findAll(filters: PayrollFilterDto = {}, scopeEmployeeId?: string) {
    let query: FirebaseFirestore.Query = this.db.collection('payroll');

    // Server-side filter by month (indexed field)
    if (filters.payrollMonth) {
      query = query.where('payrollMonth', '==', filters.payrollMonth);
    }
    // Scope to one employee (admin filtering or employee role)
    const effectiveEmployeeId = scopeEmployeeId ?? filters.employeeId;
    if (effectiveEmployeeId) {
      query = query.where('employeeId', '==', effectiveEmployeeId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    const snap = await query.get();
    let records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    // In-memory filters
    if (filters.department) {
      records = records.filter((r) => r.department === filters.department);
    }
    if (filters.branch) {
      records = records.filter((r) => r.branch === filters.branch);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      records = records.filter(
        (r) =>
          (r.employeeName || '').toLowerCase().includes(q) ||
          (r.employeeCode || '').toLowerCase().includes(q),
      );
    }

    // Sort by employeeName
    records.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));

    // Pagination
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 50);
    const total = records.length;
    const items = records.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit };
  }

  // ─── DETAIL ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const doc = await this.db.collection('payroll').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Payroll record '${id}' not found`);
    return { id: doc.id, ...doc.data() };
  }

  // ─── GENERATE / CREATE ───────────────────────────────────────────────────

  /**
   * Generate (or regenerate as Draft) a payroll record for a single employee/month.
   * If a Draft already exists it is overwritten with fresh calculations.
   * A Published record cannot be regenerated.
   */
  async generate(dto: GeneratePayrollDto) {
    const id = this.docId(dto.employeeId, dto.payrollMonth);
    const existing = await this.db.collection('payroll').doc(id).get();

    if (existing.exists) {
      const data = existing.data() as any;
      if (data.status === 'published') {
        throw new BadRequestException(
          'This payroll record is published and cannot be regenerated. Delete it first if correction is needed.',
        );
      }
    }

    // Resolve period boundaries so date filtering matches batch generation
    const { periodStart, periodEnd } = await this.resolvePeriod(dto.payrollMonth);

    // Collect all source data in parallel
    const source = await this.dataSource.collectFor(
      dto.employeeId,
      dto.payrollMonth,
      dto.overrideBasicSalary,
      dto.overrideCashAdvance,
      periodStart,
      periodEnd,
    );

    // Run calculation engine
    const breakdown = this.calculator.calculate(source);

    const now = new Date().toISOString();
    const payrollData = {
      // Identity
      employeeId: source.employeeId,
      employeeCode: source.employeeCode,
      employeeName: source.employeeName,
      department: source.department,
      branch: source.branch,
      payrollMonth: dto.payrollMonth,

      // Earnings
      basicSalary: breakdown.basicSalary,
      increaseAmount: breakdown.increaseAmount,
      grossSalary: breakdown.grossSalary,
      saturdayShiftAllowance: breakdown.saturdayShiftAllowance,
      dutyAllowance: breakdown.dutyAllowance,
      pottyTrainingAllowance: breakdown.pottyTrainingAllowance,
      afterSchoolAllowance: breakdown.afterSchoolAllowance,
      transportationAllowance: breakdown.transportationAllowance,
      extraBonusAllowance: breakdown.extraBonusAllowance,
      otherBonusAllowance: breakdown.otherBonusAllowance,
      totalAllowances: breakdown.totalAllowances,
      bonuses: breakdown.bonuses,
      bonusNotes: breakdown.bonusNotes,
      totalSalary: breakdown.totalSalary,

      // Deductions
      medicalInsurance: breakdown.medicalInsurance,
      socialInsurance: breakdown.socialInsurance,
      lateDeduction: breakdown.lateDeduction,
      absenceDeduction: breakdown.absenceDeduction,
      cashAdvance: breakdown.cashAdvance,
      totalDeductions: breakdown.totalDeductions,

      // Final
      netSalary: breakdown.netSalary,
      dailyRate: breakdown.dailyRate,

      // Metadata summary
      attendanceSummary: {
        lateMinutes: breakdown.lateMinutes,
        deductionDays: breakdown.attendanceDeductionDays,
        absenceDays: breakdown.attendanceAbsenceDays,
      },
      leaveSummary: {
        unpaidDays: breakdown.unpaidLeaveDays,
      },

      // Workflow
      status: 'draft',
      notes: dto.notes ?? null,
      updatedAt: now,
    };

    if (existing.exists) {
      await this.db.collection('payroll').doc(id).update(payrollData);
    } else {
      await this.db.collection('payroll').doc(id).set({
        ...payrollData,
        createdAt: now,
      });
    }

    return { id, ...payrollData };
  }

  // ─── UPDATE DRAFT ────────────────────────────────────────────────────────

  /**
   * Recalculate a Draft payroll record with optional overrides.
   * Triggers a full data-source re-fetch and recalculation.
   */
  async update(id: string, dto: UpdatePayrollDto) {
    const ref = this.db.collection('payroll').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Payroll record '${id}' not found`);
    const current = existing.data() as any;

    if (current.status === 'published') {
      throw new ForbiddenException('Published payroll records cannot be edited.');
    }

    // Re-run calculation with overrides, using the same period window as batch generation
    const { periodStart, periodEnd } = await this.resolvePeriod(current.payrollMonth);
    const source = await this.dataSource.collectFor(
      current.employeeId,
      current.payrollMonth,
      dto.overrideBasicSalary ?? current.overrideBasicSalary,
      dto.overrideCashAdvance ?? current.cashAdvance,
      periodStart,
      periodEnd,
    );
    const breakdown = this.calculator.calculate(source);
    const now = new Date().toISOString();

    const updateData = {
      basicSalary: breakdown.basicSalary,
      increaseAmount: breakdown.increaseAmount,
      grossSalary: breakdown.grossSalary,
      saturdayShiftAllowance: breakdown.saturdayShiftAllowance,
      dutyAllowance: breakdown.dutyAllowance,
      pottyTrainingAllowance: breakdown.pottyTrainingAllowance,
      afterSchoolAllowance: breakdown.afterSchoolAllowance,
      transportationAllowance: breakdown.transportationAllowance,
      extraBonusAllowance: breakdown.extraBonusAllowance,
      otherBonusAllowance: breakdown.otherBonusAllowance,
      totalAllowances: breakdown.totalAllowances,
      bonuses: breakdown.bonuses,
      bonusNotes: breakdown.bonusNotes,
      totalSalary: breakdown.totalSalary,
      medicalInsurance: breakdown.medicalInsurance,
      socialInsurance: breakdown.socialInsurance,
      lateDeduction: breakdown.lateDeduction,
      absenceDeduction: breakdown.absenceDeduction,
      cashAdvance: breakdown.cashAdvance,
      totalDeductions: breakdown.totalDeductions,
      netSalary: breakdown.netSalary,
      dailyRate: breakdown.dailyRate,
      attendanceSummary: {
        lateMinutes: breakdown.lateMinutes,
        deductionDays: breakdown.attendanceDeductionDays,
        absenceDays: breakdown.attendanceAbsenceDays,
      },
      leaveSummary: { unpaidDays: breakdown.unpaidLeaveDays },
      notes: dto.notes !== undefined ? dto.notes : current.notes,
      updatedAt: now,
    };

    await ref.update(updateData);
    return { id, ...current, ...updateData };
  }

  // ─── PUBLISH ─────────────────────────────────────────────────────────────

  /** Lock a Draft payroll → Published. Once published it cannot be recalculated. */
  async publish(id: string) {
    const ref = this.db.collection('payroll').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Payroll record '${id}' not found`);
    const current = existing.data() as any;

    if (current.status === 'published') {
      throw new BadRequestException('Payroll record is already published.');
    }

    const now = new Date().toISOString();
    await ref.update({ status: 'published', publishedAt: now, updatedAt: now });

    // Mark any cash-advance installment due this month as paid
    if (current.employeeId && current.payrollMonth) {
      await this.cashAdvancesService
        .markInstallmentPaid(current.employeeId, current.payrollMonth)
        .catch(() => { /* non-critical — advance may have no due installment */ });
    }

    return { id, ...current, status: 'published', publishedAt: now, updatedAt: now };
  }

  // ─── BATCH GENERATE ──────────────────────────────────────────────────────

  /**
   * Generate payroll for ALL employees that have a salary config for the
   * derived payrollMonth (YYYY-MM from the month range's startDate).
   *
   * Already-published records are skipped (not overwritten).
   * Failures are collected and returned in the result; the batch continues
   * for all remaining employees regardless of individual errors.
   */
  async generateBatch(dto: BatchGeneratePayrollDto): Promise<BatchGenerateResultDto> {
    // 1. Resolve month range
    const monthRanges = await this.organizationService.getMonthRanges();
    const range = (monthRanges as any[]).find((r: any) => r.id === dto.monthRangeId);
    if (!range) {
      throw new NotFoundException(`Month range '${dto.monthRangeId}' not found`);
    }

    const startDate: string = range.startDate;
    const endDate: string = range.endDate;
    const monthName: string = range.monthName ?? '';

    // Derive the YYYY-MM key used by month-keyed collections (salary_config, bonuses, etc.)
    // Use endDate because month ranges often start in the previous month
    // (e.g. "March 2026" range: 2026-02-25 → 2026-03-24, endDate gives "2026-03")
    const payrollMonth = endDate.substring(0, 7); // e.g. "2026-03"

    // 2. Find all salary config docs for this payrollMonth to determine employee scope
    const salaryConfigSnap = await this.db
      .collection('salary_configs')
      .where('month', '==', payrollMonth)
      .get();

    if (salaryConfigSnap.empty) {
      return {
        payrollMonth,
        period: { startDate, endDate, monthName },
        succeeded: [],
        failed: [],
        skipped: [],
      };
    }

    // Collect unique employee IDs from salary config docs
    const employeeMap = new Map<string, string>(); // employeeId → employeeName
    for (const doc of salaryConfigSnap.docs) {
      const d = doc.data() as any;
      if (d.employeeId) {
        employeeMap.set(d.employeeId, d.employeeName ?? d.employeeId);
      }
    }

    // 3. Run generation for each employee in parallel (allSettled = no short-circuit)
    const employeeIds = Array.from(employeeMap.keys());

    const results = await Promise.allSettled(
      employeeIds.map(async (employeeId) => {
        // Check if a published record already exists — skip without overwriting
        const existingDoc = await this.db
          .collection('payroll')
          .doc(this.docId(employeeId, payrollMonth))
          .get();

        if (existingDoc.exists && (existingDoc.data() as any)?.status === 'published') {
          return { employeeId, skipped: true as const };
        }

        // Run single-employee generation with full period awareness
        await this.generateInternal(employeeId, payrollMonth, startDate, endDate);
        return { employeeId, skipped: false as const };
      }),
    );

    // 4. Aggregate results
    const succeeded: string[] = [];
    const failed: { employeeId: string; employeeName: string; error: string }[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const employeeId = employeeIds[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        if (result.value.skipped) {
          skipped.push(employeeId);
        } else {
          succeeded.push(employeeId);
        }
      } else {
        failed.push({
          employeeId,
          employeeName: employeeMap.get(employeeId) ?? employeeId,
          error: result.reason?.message ?? 'Unknown error',
        });
      }
    }

    return { payrollMonth, period: { startDate, endDate, monthName }, succeeded, failed, skipped };
  }

  // ─── BATCH GENERATE (FILTERED) ─────────────────────────────────────────────

  /**
   * Generate payroll for employees scoped by mode:
   *   all        → every active employee with a salary config
   *   branch     → employees whose branch matches dto.branches[]
   *   categories → employees whose category matches dto.categories[]
   *   mix        → employees matching BOTH branch AND category filters
   *
   * Published records are skipped. Failures do not abort the batch.
   */
  async generateBatchFiltered(dto: BatchGenerateFilteredDto): Promise<BatchGenerateResultDto> {
    const payrollMonth = dto.payrollMonth;

    // Resolve period boundaries from organisation month ranges (best-effort)
    const { periodStart, periodEnd } = await this.resolvePeriod(payrollMonth);

    // Fetch all active employees from Firestore
    const empSnap = await this.db
      .collection('employees')
      .where('employmentStatus', '==', 'Active')
      .get();

    let employees = empSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    // Apply mode filters
    if (dto.mode === 'branch' || dto.mode === 'mix') {
      if (dto.branches && dto.branches.length > 0) {
        employees = employees.filter((e) => dto.branches!.includes(e.branch));
      }
    }
    if (dto.mode === 'categories' || dto.mode === 'mix') {
      if (dto.categories && dto.categories.length > 0) {
        employees = employees.filter((e) => dto.categories!.includes(e.category));
      }
    }

    if (employees.length === 0) {
      return {
        payrollMonth,
        period: {
          startDate: periodStart ?? payrollMonth + '-01',
          endDate: periodEnd ?? payrollMonth + '-28',
          monthName: '',
        },
        succeeded: [],
        failed: [],
        skipped: [],
      };
    }

    // Run generation for each employee; allSettled = no short-circuit on failure
    const results = await Promise.allSettled(
      employees.map(async (emp) => {
        const existingDoc = await this.db
          .collection('payroll')
          .doc(this.docId(emp.id, payrollMonth))
          .get();

        if (existingDoc.exists && (existingDoc.data() as any)?.status === 'published') {
          return { employeeId: emp.id, employeeName: emp.fullName ?? emp.id, skipped: true as const };
        }

        if (periodStart && periodEnd) {
          await this.generateInternal(emp.id, payrollMonth, periodStart, periodEnd);
        } else {
          // Fallback: generate via standard single-employee path
          await this.generate({ employeeId: emp.id, payrollMonth, notes: dto.notes });
        }
        return { employeeId: emp.id, employeeName: emp.fullName ?? emp.id, skipped: false as const };
      }),
    );

    const succeeded: string[] = [];
    const failed: { employeeId: string; employeeName: string; error: string }[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const emp = employees[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        result.value.skipped ? skipped.push(emp.id) : succeeded.push(emp.id);
      } else {
        failed.push({
          employeeId: emp.id,
          employeeName: emp.fullName ?? emp.id,
          error: result.reason?.message ?? 'Unknown error',
        });
      }
    }

    return {
      payrollMonth,
      period: {
        startDate: periodStart ?? payrollMonth + '-01',
        endDate: periodEnd ?? payrollMonth + '-28',
        monthName: '',
      },
      succeeded,
      failed,
      skipped,
    };
  }

  /**
   * Internal helper: generate (or overwrite draft) for a single employee
   * using an explicit date range for period-aware data collection.
   */
  private async generateInternal(
    employeeId: string,
    payrollMonth: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<void> {
    const source = await this.dataSource.collectFor(
      employeeId,
      payrollMonth,
      undefined,
      undefined,
      periodStart,
      periodEnd,
    );

    const breakdown = this.calculator.calculate(source);
    const id = this.docId(employeeId, payrollMonth);
    const now = new Date().toISOString();

    const payrollData = {
      employeeId: source.employeeId,
      employeeCode: source.employeeCode,
      employeeName: source.employeeName,
      department: source.department,
      branch: source.branch,
      payrollMonth,
      periodStart,
      periodEnd,
      basicSalary: breakdown.basicSalary,
      increaseAmount: breakdown.increaseAmount,
      grossSalary: breakdown.grossSalary,
      saturdayShiftAllowance: breakdown.saturdayShiftAllowance,
      dutyAllowance: breakdown.dutyAllowance,
      pottyTrainingAllowance: breakdown.pottyTrainingAllowance,
      afterSchoolAllowance: breakdown.afterSchoolAllowance,
      transportationAllowance: breakdown.transportationAllowance,
      extraBonusAllowance: breakdown.extraBonusAllowance,
      otherBonusAllowance: breakdown.otherBonusAllowance,
      totalAllowances: breakdown.totalAllowances,
      bonuses: breakdown.bonuses,
      bonusNotes: breakdown.bonusNotes,
      totalSalary: breakdown.totalSalary,
      medicalInsurance: breakdown.medicalInsurance,
      socialInsurance: breakdown.socialInsurance,
      lateDeduction: breakdown.lateDeduction,
      absenceDeduction: breakdown.absenceDeduction,
      cashAdvance: breakdown.cashAdvance,
      totalDeductions: breakdown.totalDeductions,
      netSalary: breakdown.netSalary,
      dailyRate: breakdown.dailyRate,
      attendanceSummary: {
        lateMinutes: breakdown.lateMinutes,
        deductionDays: breakdown.attendanceDeductionDays,
        absenceDays: breakdown.attendanceAbsenceDays,
      },
      leaveSummary: { unpaidDays: breakdown.unpaidLeaveDays },
      status: 'draft',
      notes: null,
      updatedAt: now,
    };

    const existingDoc = await this.db.collection('payroll').doc(id).get();
    if (existingDoc.exists) {
      await this.db.collection('payroll').doc(id).update(payrollData);
    } else {
      await this.db.collection('payroll').doc(id).set({ ...payrollData, createdAt: now });
    }
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────

  async remove(id: string) {
    const ref = this.db.collection('payroll').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Payroll record '${id}' not found`);
    await ref.delete();
    return { id };
  }
}
