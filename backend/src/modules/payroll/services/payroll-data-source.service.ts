import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { SalaryConfigService } from '@modules/salary-config/salary-config.service';
import { SalaryIncreasesService } from '@modules/salary-increases/salary-increases.service';

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
  ) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  /**
   * Collect all raw source data for a single employee/month
   * combination. All lookups are parallelized for performance.
   */
  async collectFor(
    employeeId: string,
    payrollMonth: string,
    overrideBasicSalary?: number,
    overrideCashAdvance?: number,
  ): Promise<PayrollSourceData> {
    const [
      salaryConfig,
      increaseAmount,
      bonuses,
      attendance,
      unpaidLeaveDays,
      socialInsurance,
      medicalInsurance,
      employee,
    ] = await Promise.all([
      this.salaryConfigService.findByEmployeeAndMonth(employeeId, payrollMonth),
      this.salaryIncreasesService.getTotalIncreaseAmount(employeeId, payrollMonth),
      this.fetchBonuses(employeeId, payrollMonth),
      this.fetchAttendanceSummary(employeeId, payrollMonth),
      this.fetchUnpaidLeaveDays(employeeId, payrollMonth),
      this.fetchSocialInsurance(employeeId),
      this.fetchMedicalInsurance(employeeId),
      this.fetchEmployee(employeeId),
    ]);

    const cfg = salaryConfig as any;
    const emp = employee as any;

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
      attendanceDeductionDays: attendance.deductionDays,
      unpaidLeaveDays,
      socialInsurance: resolvedSocialInsurance,
      medicalInsurance: resolvedMedicalInsurance,
      cashAdvance: overrideCashAdvance ?? 0,
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
   * Sum lateMinutes and deductionDays for the employee within the given month.
   * We query by employeeId and then filter in-memory by date to avoid
   * requiring a composite Firestore index.
   */
  private async fetchAttendanceSummary(
    employeeId: string,
    payrollMonth: string,
  ): Promise<{ lateMinutes: number; deductionDays: number }> {
    const snap = await this.db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .get();

    // payrollMonth is 'YYYY-MM': filter records whose date starts with that prefix
    let lateMinutes = 0;
    let deductionDays = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      if ((data.date || '').startsWith(payrollMonth)) {
        lateMinutes += data.lateMinutes ?? 0;
        deductionDays += data.deductionDays ?? 0;
      }
    }
    return { lateMinutes, deductionDays };
  }

  /**
   * Count unpaid leave days within the payroll month using actual leave records.
   * status = 'unpaid_leave' and the leave startDate falls within the month.
   */
  private async fetchUnpaidLeaveDays(
    employeeId: string,
    payrollMonth: string,
  ): Promise<number> {
    const snap = await this.db
      .collection('leaves')
      .where('employeeId', '==', employeeId)
      .where('type', '==', 'unpaid')
      .get();

    let days = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      // Count the overlap of leave days within the payroll month
      const start: string = data.startDate ?? '';
      const end: string = data.endDate ?? data.startDate ?? '';
      if (!start) continue;
      days += this.daysWithinMonth(start, end, payrollMonth);
    }
    return days;
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
}
