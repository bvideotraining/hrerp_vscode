import { Injectable } from '@nestjs/common';
import { PayrollSourceData } from './payroll-data-source.service';

export interface PayrollBreakdown {
  // Earnings
  basicSalary: number;
  increaseAmount: number;
  grossSalary: number;           // basicSalary + increaseAmount
  saturdayShiftAllowance: number;
  dutyAllowance: number;
  pottyTrainingAllowance: number;
  afterSchoolAllowance: number;
  transportationAllowance: number;
  extraBonusAllowance: number;
  otherBonusAllowance: number;
  totalAllowances: number;
  bonuses: number;
  bonusNotes: string;
  totalSalary: number;           // grossSalary + totalAllowances + bonuses

  // Deductions
  medicalInsurance: number;
  socialInsurance: number;
  lateDeduction: number;         // attendanceDeductionDays * dailyRate
  absenceDeduction: number;      // (unpaidLeaveDays + attendanceAbsenceDays) * dailyRate
  cashAdvance: number;
  totalDeductions: number;

  // Final
  netSalary: number;             // totalSalary - totalDeductions
  dailyRate: number;             // basicSalary / 30 (used for deduction calculations)

  // Summary metadata
  lateMinutes: number;
  attendanceDeductionDays: number;
  unpaidLeaveDays: number;
  attendanceAbsenceDays: number;
}

@Injectable()
export class PayrollCalculationService {
  /**
   * Compute all payroll figures from pre-fetched source data.
   * All amounts are rounded to 2 decimal places.
   */
  calculate(source: PayrollSourceData): PayrollBreakdown {
    const r = (n: number) => Math.round(n * 100) / 100;

    // ── EARNINGS ──────────────────────────────────────────────────────────
    const basicSalary = r(source.basicSalary);
    const increaseAmount = r(source.increaseAmount);
    const grossSalary = r(basicSalary + increaseAmount);

    const saturdayShiftAllowance = r(source.saturdayShiftAllowance);
    const dutyAllowance = r(source.dutyAllowance);
    const pottyTrainingAllowance = r(source.pottyTrainingAllowance);
    const afterSchoolAllowance = r(source.afterSchoolAllowance);
    const transportationAllowance = r(source.transportationAllowance);
    const extraBonusAllowance = r(source.extraBonusAllowance);
    const otherBonusAllowance = r(source.otherBonusAllowance);
    const totalAllowances = r(source.totalAllowances);

    const bonuses = r(source.bonuses);
    const bonusNotes = source.bonusNotes ?? '';
    const totalSalary = r(grossSalary + totalAllowances + bonuses);

    // ── DEDUCTIONS ────────────────────────────────────────────────────────
    const dailyRate = basicSalary > 0 ? r(basicSalary / 30) : 0;

    const lateDeduction = r(source.attendanceDeductionDays * dailyRate);
    const absenceDeduction = r((source.unpaidLeaveDays + source.attendanceAbsenceDays) * dailyRate);
    const medicalInsurance = r(source.medicalInsurance);
    const socialInsurance = r(source.socialInsurance);
    const cashAdvance = r(source.cashAdvance);

    const totalDeductions = r(
      lateDeduction + absenceDeduction + medicalInsurance + socialInsurance + cashAdvance,
    );

    // ── FINAL ─────────────────────────────────────────────────────────────
    const netSalary = r(totalSalary - totalDeductions);

    return {
      basicSalary,
      increaseAmount,
      grossSalary,
      saturdayShiftAllowance,
      dutyAllowance,
      pottyTrainingAllowance,
      afterSchoolAllowance,
      transportationAllowance,
      extraBonusAllowance,
      otherBonusAllowance,
      totalAllowances,
      bonuses,
      bonusNotes,
      totalSalary,
      medicalInsurance,
      socialInsurance,
      lateDeduction,
      absenceDeduction,
      cashAdvance,
      totalDeductions,
      netSalary,
      dailyRate,
      lateMinutes: source.lateMinutes,
      attendanceDeductionDays: source.attendanceDeductionDays,
      unpaidLeaveDays: source.unpaidLeaveDays,
      attendanceAbsenceDays: source.attendanceAbsenceDays,
    };
  }
}
