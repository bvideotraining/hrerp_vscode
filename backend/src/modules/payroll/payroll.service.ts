import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { PayrollDataSourceService } from './services/payroll-data-source.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import {
  GeneratePayrollDto,
  UpdatePayrollDto,
  PayrollFilterDto,
} from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private firebaseService: FirebaseService,
    private dataSource: PayrollDataSourceService,
    private calculator: PayrollCalculationService,
  ) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  /** Deterministic document ID prevents duplicates */
  private docId(employeeId: string, payrollMonth: string): string {
    return `${employeeId}_${payrollMonth}`;
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

    // Collect all source data in parallel
    const source = await this.dataSource.collectFor(
      dto.employeeId,
      dto.payrollMonth,
      dto.overrideBasicSalary,
      dto.overrideCashAdvance,
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
      housingAllowance: breakdown.housingAllowance,
      transportationAllowance: breakdown.transportationAllowance,
      mealAllowance: breakdown.mealAllowance,
      otherAllowances: breakdown.otherAllowances,
      totalAllowances: breakdown.totalAllowances,
      bonuses: breakdown.bonuses,
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

    // Re-run calculation with overrides
    const source = await this.dataSource.collectFor(
      current.employeeId,
      current.payrollMonth,
      dto.overrideBasicSalary ?? current.overrideBasicSalary,
      dto.overrideCashAdvance ?? current.cashAdvance,
    );
    const breakdown = this.calculator.calculate(source);
    const now = new Date().toISOString();

    const updateData = {
      basicSalary: breakdown.basicSalary,
      increaseAmount: breakdown.increaseAmount,
      grossSalary: breakdown.grossSalary,
      housingAllowance: breakdown.housingAllowance,
      transportationAllowance: breakdown.transportationAllowance,
      mealAllowance: breakdown.mealAllowance,
      otherAllowances: breakdown.otherAllowances,
      totalAllowances: breakdown.totalAllowances,
      bonuses: breakdown.bonuses,
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
    return { id, ...current, status: 'published', publishedAt: now, updatedAt: now };
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
