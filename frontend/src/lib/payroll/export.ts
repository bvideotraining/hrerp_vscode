import type { PayrollRecord, PayrollExportRow } from '@/types/payroll';

// ─── Shared formatting helpers ─────────────────────────────────────────────

function fmtMonth(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toExportRow(r: PayrollRecord): PayrollExportRow {
  return {
    'Employee Code': r.employeeCode,
    'Employee Name': r.employeeName,
    Department: r.department,
    'Payroll Month': fmtMonth(r.payrollMonth),
    'Basic Salary (EGP)': r.basicSalary,
    'Increase Amount (EGP)': r.increaseAmount,
    'Gross Salary (EGP)': r.grossSalary,
    'Allowances (EGP)': r.totalAllowances,
    'Bonuses (EGP)': r.bonuses,
    'Total Salary (EGP)': r.totalSalary,
    'Medical Insurance (EGP)': r.medicalInsurance,
    'Social Insurance (EGP)': r.socialInsurance,
    'Late Deduction (EGP)': r.lateDeduction,
    'Absence Deduction (EGP)': r.absenceDeduction,
    'Cash Advance (EGP)': r.cashAdvance,
    'Total Deductions (EGP)': r.totalDeductions,
    'Net Salary (EGP)': r.netSalary,
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
  };
}

// ─── Excel export ──────────────────────────────────────────────────────────

export async function exportPayrollExcel(
  records: PayrollRecord[],
  filename?: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = records.map(toExportRow);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
    { wch: 16 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll Summary');
  XLSX.writeFile(wb, filename ?? `payroll_summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Export detailed breakdown of a single payroll record to Excel */
export async function exportPayrollDetailExcel(record: PayrollRecord): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = [
    // Company header placeholder
    ['Company Name', '[YOUR COMPANY]'],
    ['Report', 'Payroll Slip'],
    ['Employee', record.employeeName],
    ['Code', record.employeeCode],
    ['Department', record.department],
    ['Month', fmtMonth(record.payrollMonth)],
    ['Status', record.status.charAt(0).toUpperCase() + record.status.slice(1)],
    [],
    ['EARNINGS', '', 'AMOUNT (EGP)'],
    ['Basic Salary', '', record.basicSalary],
    ['Increase Amount', '', record.increaseAmount],
    ['Gross Salary', '', record.grossSalary],
    ['Saturday Shift', '', record.saturdayShiftAllowance],
    ['Duty', '', record.dutyAllowance],
    ['Potty Training', '', record.pottyTrainingAllowance],
    ['After School', '', record.afterSchoolAllowance],
    ['Transportation', '', record.transportationAllowance],
    ['Extra Bonus', '', record.extraBonusAllowance],
    ['Others', '', record.otherBonusAllowance],
    ['Total Allowances', '', record.totalAllowances],
    ['Bonuses', '', record.bonuses],
    ['Bonus Notes', '', record.bonusNotes || ''],
    ['TOTAL SALARY', '', record.totalSalary],
    [],
    ['DEDUCTIONS', '', 'AMOUNT (EGP)'],
    ['Medical Insurance', '', record.medicalInsurance],
    ['Social Insurance', '', record.socialInsurance],
    [`Late Deduction (${record.attendanceSummary?.deductionDays ?? 0} days, ${record.attendanceSummary?.lateMinutes ?? 0} min)`, '', record.lateDeduction],
    [`Absence / Unpaid Leave (${record.leaveSummary?.unpaidDays ?? 0} days)`, '', record.absenceDeduction],
    ['Cash in Advance', '', record.cashAdvance],
    ['TOTAL DEDUCTIONS', '', record.totalDeductions],
    [],
    ['NET SALARY', '', record.netSalary],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 42 }, { wch: 10 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll Slip');
  XLSX.writeFile(
    wb,
    `payroll_slip_${record.employeeCode}_${record.payrollMonth}.xlsx`,
  );
}

// ─── PDF export ───────────────────────────────────────────────────────────

export async function exportPayrollPDF(
  records: PayrollRecord[],
  filename?: string,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setFont(undefined as any, 'bold');
  doc.text('Payroll Summary Report', 14, 16);
  doc.setFont(undefined as any, 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [[
      'Code', 'Employee Name', 'Month', 'Gross Salary',
      'Total Salary', 'Total Deductions', 'Net Salary', 'Status',
    ]],
    body: records.map((r) => [
      r.employeeCode,
      r.employeeName,
      fmtMonth(r.payrollMonth),
      r.grossSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.totalSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.totalDeductions.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.netSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename ?? `payroll_summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Export detailed breakdown of a single payroll record to PDF */
export async function exportPayrollDetailPDF(record: PayrollRecord): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait' });

  // Header block (company branding placeholder)
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined as any, 'bold');
  doc.text('[YOUR COMPANY NAME]', 14, 14);
  doc.setFontSize(11);
  doc.setFont(undefined as any, 'normal');
  doc.text('Payroll Slip', 14, 22);
  doc.text(fmtMonth(record.payrollMonth), 140, 22);
  doc.setTextColor(0, 0, 0);

  // Employee info
  doc.setFontSize(10);
  doc.setFont(undefined as any, 'bold');
  doc.text('Employee Information', 14, 42);
  doc.setFont(undefined as any, 'normal');
  doc.setFontSize(9);
  const info = [
    ['Name', record.employeeName, 'Code', record.employeeCode],
    ['Department', record.department, 'Branch', record.branch || '—'],
    ['Status', record.status.charAt(0).toUpperCase() + record.status.slice(1), 'Daily Rate (EGP)',
      record.dailyRate.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
  ];
  autoTable(doc, {
    startY: 46,
    body: info,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { fontStyle: 'bold', cellWidth: 35 } },
    theme: 'plain',
  });

  const afterInfo = (doc as any).lastAutoTable?.finalY ?? 80;

  // Earnings table
  doc.setFontSize(10);
  doc.setFont(undefined as any, 'bold');
  doc.text('Earnings', 14, afterInfo + 8);
  autoTable(doc, {
    startY: afterInfo + 12,
    head: [['Description', 'Amount (EGP)']],
    body: [
      ['Basic Salary', record.basicSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Increase Amount', record.increaseAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Gross Salary', record.grossSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Saturday Shift', record.saturdayShiftAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Duty', record.dutyAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Potty Training', record.pottyTrainingAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['After School', record.afterSchoolAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Transportation', record.transportationAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Extra Bonus', record.extraBonusAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Others', record.otherBonusAllowance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Total Allowances', record.totalAllowances.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Bonuses', record.bonuses.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Bonus Notes', record.bonusNotes || '—'],
      ['TOTAL SALARY', record.totalSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
    bodyStyles: { textColor: [30, 30, 30] },
    didParseCell: (data: any) => {
      if (data.row.index === 13) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  const afterEarnings = (doc as any).lastAutoTable?.finalY ?? 160;

  // Deductions table
  doc.setFontSize(10);
  doc.setFont(undefined as any, 'bold');
  doc.text('Deductions', 14, afterEarnings + 8);
  autoTable(doc, {
    startY: afterEarnings + 12,
    head: [['Description', 'Amount (EGP)']],
    body: [
      ['Medical Insurance', record.medicalInsurance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['Social Insurance', record.socialInsurance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      [
        `Late Deduction (${record.attendanceSummary?.deductionDays ?? 0} days / ${record.attendanceSummary?.lateMinutes ?? 0} min)`,
        record.lateDeduction.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      ],
      [
        `Absence / Unpaid Leave (${record.leaveSummary?.unpaidDays ?? 0} days)`,
        record.absenceDeduction.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      ],
      ['Cash in Advance', record.cashAdvance.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
      ['TOTAL DEDUCTIONS', record.totalDeductions.toLocaleString('en-EG', { minimumFractionDigits: 2 })],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [239, 68, 68] },
    didParseCell: (data: any) => {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  const afterDeductions = (doc as any).lastAutoTable?.finalY ?? 240;

  // Net salary footer
  doc.setFillColor(37, 99, 235);
  doc.rect(14, afterDeductions + 6, 182, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.text('NET SALARY', 18, afterDeductions + 15);
  doc.text(
    `EGP ${record.netSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 })}`,
    145,
    afterDeductions + 15,
  );
  doc.setTextColor(0, 0, 0);

  doc.save(`payroll_slip_${record.employeeCode}_${record.payrollMonth}.pdf`);
}
