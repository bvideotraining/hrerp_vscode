import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { SalaryConfigService } from '@modules/salary-config/salary-config.service';
import { SalaryIncreasesService } from '@modules/salary-increases/salary-increases.service';
import { CashAdvancesService } from '@modules/cash-advances/cash-advances.service';
import { OrganizationService } from '@modules/organization/organization.service';

/**
 * Normalised data collected from all source collections.
 * All fields are guaranteed non-null; missing data falls back to zero.
 */
export interface PayrollSourceData {
  // Identity
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch: string;

  // From salary_config
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  mealAllowance: number;
  otherAllowances: number;
  totalAllowances: number;

  // From salary_increases (cumulatively effective up to payrollMonth)
  increaseAmount: number;

  // From bonuses collection for the payroll month
  bonuses: number;

  // From attendance within the payroll month
  lateMinutes: number;
  attendanceDeductionDays: number;

  // Absent days from attendance (status=absent), excluding dates also covered by unpaid leave
  attendanceAbsenceDays: number;

  // From leaves — unpaid leave days within the payroll month
  unpaidLeaveDays: number;

  // From social_insurance
  socialInsurance: number;

  // From medical_insurance
  medicalInsurance: number;

  // Cash advance placeholder
  cashAdvance: number;
}

@Injectable()
export class PayrollDataSourceService {
  constructor(
    private firebaseService: FirebaseService,
    private salaryConfigService: SalaryConfigService,
    private salaryIncreasesService: SalaryIncreasesService,
    private cashAdvancesService: CashAdvancesService,
    private organizationService: OrganizationService,
  ) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  /**
   * Collect all raw source data for a single employee/month
   * combination. All lookups are parallelized for performance.
   *
   * @param periodStart  Optional YYYY-MM-DD start date from organization month range.
   *                     When provided, date-based sources use this range instead of the
   *                     YYYY-MM month prefix for more accurate period filtering.
   * @param periodEnd    Optional YYYY-MM-DD end date (inclusive).
   */
  async collectFor(
    employeeId: string,
    payrollMonth: string,
    overrideBasicSalary?: number,
    overrideCashAdvance?: number,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<PayrollSourceData> {
    const [
      salaryConfig,
      increaseAmount,
      bonuses,
      attendance,
      unpaidLeaveDays,
      unpaidLeaveDateRanges,
      socialInsurance,
      medicalInsurance,
      employee,
      scheduledCashAdvance,
    ] = await Promise.all([
      this.salaryConfigService.findByEmployeeAndMonth(employeeId, payrollMonth),
      this.salaryIncreasesService.getTotalIncreaseAmount(employeeId, payrollMonth),
      this.fetchBonuses(employeeId, payrollMonth),
      this.fetchAttendanceSummary(employeeId, payrollMonth, periodStart, periodEnd),
      this.fetchUnpaidLeaveDays(employeeId, payrollMonth, periodStart, periodEnd),
      this.fetchUnpaidLeaveDateRanges(employeeId, payrollMonth, periodStart, periodEnd),
      this.fetchSocialInsurance(employeeId),
      this.fetchMedicalInsurance(employeeId),
      this.fetchEmployee(employeeId),
      this.cashAdvancesService.getDueInstallment(employeeId, payrollMonth),
    ]);

    const cfg = salaryConfig as any;
    const emp = employee as any;

    // Compute deduction days from attendance rules for the employee's category.
    // Priority: category from attendance records → category from employee doc.
    // This replaces reading per-record deductionDays (which are often null/zero)
    // and correctly applies the rule's freeMinutes threshold + deduction schedule.
    const employeeCategory = attendance.category || emp?.category || '';
    const attendanceDeductionDays = await this.computeDeductionDays(
      attendance.lateMinutes,
      employeeCategory,
    );

    // Fetch absence days after obtaining the unpaid leave date ranges to avoid double-counting
    const absenceResult = await this.fetchAbsenceDays(
      employeeId,
      payrollMonth,
      periodStart,
      periodEnd,
      unpaidLeaveDateRanges,
    );
    const attendanceAbsenceDays = absenceResult.absentDays;
    // Unpaid leave days: from leaves collection + attendance unpaid_leave records not in leaves
    const totalUnpaidLeaveDays = unpaidLeaveDays + absenceResult.unpaidLeaveDays;

    const basicSalary = overrideBasicSalary ?? (cfg?.basicSalary ?? 0);

    // ─── Map itemized allowances to payroll calculation fields ────────────
    // Salary config now stores allowances as a [{name,amount,source}] array.
    // We map them to the named fields expected by PayrollCalculationService.
    // Un-matched items are summed into otherAllowances.
    let housingAllowance = 0;
    let transportationAllowance = 0;
    let mealAllowance = 0;
    let otherAllowances = 0;

    if (cfg?.allowances && Array.isArray(cfg.allowances)) {
      for (const item of cfg.allowances as any[]) {
        const name = (item.name || '').toLowerCase();
        const amount = item.amount ?? 0;
        if (name.includes('housing')) housingAllowance += amount;
        else if (name.includes('transport')) transportationAllowance += amount;
        else if (name.includes('meal') || name.includes('food')) mealAllowance += amount;
        else otherAllowances += amount;
      }
    }

    const totalAllowances =
      housingAllowance + transportationAllowance + mealAllowance + otherAllowances;

    // ─── Map itemized deductions to named deduction fields ─────────────────
    // Social insurance and medical insurance may come from salary config deductions
    // (after admin imports) or fall back to their source collections.
    const rawSocial = (socialInsurance as any)?.employeeShare ?? 0;
    const rawMedical = (medicalInsurance as any)?.payrollDeductionAmount ?? 0;

    let resolvedSocialInsurance = rawSocial;
    let resolvedMedicalInsurance = rawMedical;

    if (cfg?.deductions && Array.isArray(cfg.deductions)) {
      for (const item of cfg.deductions as any[]) {
        const name = (item.name || '').toLowerCase();
        const amount = item.amount ?? 0;
        if (name.includes('social insurance')) resolvedSocialInsurance = amount;
        else if (name.includes('medical insurance')) resolvedMedicalInsurance = amount;
      }
    }

    return {
      employeeId,
      employeeCode: emp?.employeeCode ?? '',
      employeeName: emp?.fullName ?? '',
      department: emp?.department ?? '',
      branch: emp?.branch ?? '',
      basicSalary,
      housingAllowance,
      transportationAllowance,
      mealAllowance,
      otherAllowances,
      totalAllowances,
      increaseAmount,
      bonuses,
      lateMinutes: attendance.lateMinutes,
      attendanceDeductionDays,
      attendanceAbsenceDays,
      unpaidLeaveDays: totalUnpaidLeaveDays,
      socialInsurance: resolvedSocialInsurance,
      medicalInsurance: resolvedMedicalInsurance,
      cashAdvance: overrideCashAdvance ?? scheduledCashAdvance,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private async fetchEmployee(employeeId: string) {
    const snap = await this.db.collection('employees').doc(employeeId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  private async fetchBonuses(employeeId: string, payrollMonth: string): Promise<number> {
    const docId = `${employeeId}_${payrollMonth}`;
    const doc = await this.db.collection('bonuses').doc(docId).get();
    if (!doc.exists) return 0;
    return (doc.data() as any)?.total ?? 0;
  }

  /**
   * Sum lateMinutes and deductionDays for the employee within the given period.
   * When periodStart/periodEnd are provided, filter by date range; otherwise fall back
   * to the YYYY-MM prefix match.
   */
  private async fetchAttendanceSummary(
    employeeId: string,
    payrollMonth: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<{ lateMinutes: number; deductionDays: number; category: string }> {
    const snap = await this.db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .get();

    let lateMinutes = 0;
    let deductionDays = 0;
    let category = '';
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      // Capture the employee category from any attendance record (all records share the same value)
      if (!category && data.category) category = data.category;
      const date: string = data.date || '';
      if (!this.isDateInPeriod(date, payrollMonth, periodStart, periodEnd)) continue;
      lateMinutes += data.lateMinutes ?? 0;
      deductionDays += data.deductionDays ?? 0;
    }
    return { lateMinutes, deductionDays, category };
  }

  /**
   * Count attendance records with status === 'absent' within the period,
   * excluding dates that are already covered by unpaid leave (to avoid double-deduction).
   */
  private async fetchAbsenceDays(
    employeeId: string,
    payrollMonth: string,
    periodStart?: string,
    periodEnd?: string,
    unpaidLeaveDateRanges: Array<{ start: string; end: string }> = [],
  ): Promise<{ absentDays: number; unpaidLeaveDays: number }> {
    // Fetch both 'absent' and 'unpaid_leave' attendance records.
    // 'unpaid_leave' records whose dates are covered by the leaves collection are
    // excluded via unpaidLeaveDateRanges to prevent double-counting.
    const snap = await this.db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('status', 'in', ['absent', 'unpaid_leave'])
      .get();

    let absentDays = 0;
    let unpaidLeaveDays = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const date: string = data.date || '';
      if (!date) continue;
      if (!this.isDateInPeriod(date, payrollMonth, periodStart, periodEnd)) continue;
      if (data.status === 'absent') {
        absentDays += 1;
      } else {
        // unpaid_leave — skip if already covered by leave from the leaves collection
        if (!this.isDateCoveredByUnpaidLeave(date, unpaidLeaveDateRanges)) {
          unpaidLeaveDays += 1;
        }
      }
    }
    return { absentDays, unpaidLeaveDays };
  }

  /** Return true when a YYYY-MM-DD date falls inside the given period. */
  private isDateInPeriod(
    date: string,
    payrollMonth: string,
    periodStart?: string,
    periodEnd?: string,
  ): boolean {
    if (!date) return false;
    if (periodStart && periodEnd) {
      return date >= periodStart && date <= periodEnd;
    }
    // Fallback: YYYY-MM prefix match
    return date.startsWith(payrollMonth);
  }

  /** Return true when a YYYY-MM-DD date falls inside any of the given leave ranges. */
  private isDateCoveredByUnpaidLeave(
    date: string,
    ranges: Array<{ start: string; end: string }>,
  ): boolean {
    return ranges.some((r) => date >= r.start && date <= (r.end || r.start));
  }

  /**
   * Count unpaid leave days within the payroll period.
   * When periodStart/periodEnd are provided, use exact date-range overlap;
   * otherwise use the YYYY-MM month boundary.
   */
  private async fetchUnpaidLeaveDays(
    employeeId: string,
    payrollMonth: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<number> {
    const snap = await this.db
      .collection('leaves')
      .where('employeeId', '==', employeeId)
      .where('type', '==', 'unpaid')
      .get();

    let days = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const start: string = data.startDate ?? '';
      const end: string = data.endDate ?? data.startDate ?? '';
      if (!start) continue;
      if (periodStart && periodEnd) {
        days += this.daysInDateRange(start, end, periodStart, periodEnd);
      } else {
        days += this.daysWithinMonth(start, end, payrollMonth);
      }
    }
    return days;
  }

  /**
   * Return raw leave date ranges for unpaid leaves within the period.
   * Used to build an exclusion set when counting absence days.
   */
  private async fetchUnpaidLeaveDateRanges(
    employeeId: string,
    payrollMonth: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const snap = await this.db
      .collection('leaves')
      .where('employeeId', '==', employeeId)
      .where('type', '==', 'unpaid')
      .get();

    const ranges: Array<{ start: string; end: string }> = [];
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const start: string = data.startDate ?? '';
      const end: string = data.endDate ?? data.startDate ?? '';
      if (!start) continue;
      // Only include ranges that overlap with the target period
      const overlapDays = periodStart && periodEnd
        ? this.daysInDateRange(start, end, periodStart, periodEnd)
        : this.daysWithinMonth(start, end, payrollMonth);
      if (overlapDays > 0) {
        ranges.push({ start, end: end || start });
      }
    }
    return ranges;
  }

  private async fetchSocialInsurance(employeeId: string) {
    const doc = await this.db.collection('social_insurance').doc(employeeId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  private async fetchMedicalInsurance(employeeId: string) {
    const doc = await this.db.collection('medical_insurance').doc(employeeId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Compute monthly late-deduction days by applying the attendance rule for the
   * given employee category.
   *
   * Logic:
   *  1. Fetch the rule from `attendance_rules/{category}` (falls back to no deduction if absent)
   *  2. Subtract `freeMinutes` from totalLateMinutes → netMinutes
   *  3. Walk the deductionSchedule (sorted ascending by upToMinutes) and return
   *     the `days` of the first bracket where netMinutes ≤ upToMinutes.
   */
  private async computeDeductionDays(
    totalLateMinutes: number,
    category: string,
  ): Promise<number> {
    if (totalLateMinutes <= 0) return 0;

    // Use OrganizationService so Firestore rules are seeded on first access
    // and we get a reliable rule list regardless of doc naming.
    const allRules: any[] = await this.organizationService.getAttendanceRules();

    // Case-insensitive category match; fall back to first rule (all share the same schedule)
    const rule =
      allRules.find(
        (r: any) => (r.category ?? '').toLowerCase() === (category ?? '').toLowerCase(),
      ) ?? allRules[0];

    if (!rule) return 0;

    const freeMinutes: number = rule.freeMinutes ?? 0;
    const schedule: Array<{ upToMinutes: number; days: number }> =
      rule.deductionSchedule ?? [];

    const netMinutes = Math.max(0, totalLateMinutes - freeMinutes);
    if (netMinutes <= 0 || schedule.length === 0) return 0;

    // Sort ascending and find the first bracket that covers netMinutes
    const sorted = [...schedule].sort((a, b) => a.upToMinutes - b.upToMinutes);
    for (const bracket of sorted) {
      if (netMinutes <= bracket.upToMinutes) return bracket.days;
    }
    // netMinutes exceeds all brackets → use the last (highest) bracket
    return sorted[sorted.length - 1].days;
  }

  /**
   * Count how many calendar days of a leave range fall inside payrollMonth.
   * start/end are 'YYYY-MM-DD', payrollMonth is 'YYYY-MM'.
   */
  private daysWithinMonth(start: string, end: string, payrollMonth: string): number {
    const monthStart = new Date(`${payrollMonth}-01T00:00:00`);
    // Last day of month
    const [y, m] = payrollMonth.split('-').map(Number);
    const monthEnd = new Date(y, m, 0); // day 0 of next month = last day of current month

    const rangeStart = new Date(start + 'T00:00:00');
    const rangeEnd = new Date((end || start) + 'T00:00:00');

    const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
    const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;

    if (overlapEnd < overlapStart) return 0;
    const ms = overlapEnd.getTime() - overlapStart.getTime();
    return Math.round(ms / 86_400_000) + 1; // inclusive day count
  }

  /**
   * Count how many calendar days of a leave range overlap with [periodStart, periodEnd].
   * All dates are 'YYYY-MM-DD'. Comparison is inclusive on both ends.
   */
  private daysInDateRange(
    leaveStart: string,
    leaveEnd: string,
    periodStart: string,
    periodEnd: string,
  ): number {
    const ps = new Date(periodStart + 'T00:00:00');
    const pe = new Date(periodEnd + 'T00:00:00');
    const ls = new Date(leaveStart + 'T00:00:00');
    const le = new Date((leaveEnd || leaveStart) + 'T00:00:00');

    const overlapStart = ls > ps ? ls : ps;
    const overlapEnd = le < pe ? le : pe;

    if (overlapEnd < overlapStart) return 0;
    const ms = overlapEnd.getTime() - overlapStart.getTime();
    return Math.round(ms / 86_400_000) + 1;
  }
}
