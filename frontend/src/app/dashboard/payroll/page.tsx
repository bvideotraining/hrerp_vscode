'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { usePayroll } from '@/hooks/use-payroll';
import { payrollService } from '@/lib/services/payroll.service';
import { employeeService } from '@/lib/services/employee.service';
import type { PayrollRecord, GeneratePayrollPayload, GenerateMode, BatchGeneratePayrollPayload, BatchGenerateResult } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import { SalaryConfigSection } from '@/components/payroll/salary-config-section';
import { SalaryIncreaseScheduleSection } from '@/components/payroll/salary-increase-schedule-section';
import { CashAdvancesSection } from '@/components/payroll/cash-advances-section';
import {
  Banknote,
  Plus,
  Search,
  Download,
  Eye,
  CheckCircle,
  Trash2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Minus,
  FileText,
  RefreshCw,
  Settings,
  Users,
  User,
} from 'lucide-react';

const EMPLOYEE_CATEGORIES = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

function fmtAmt(n: number): string {
  return (n ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(yyyymm: string): string {
  if (!yyyymm) return '—';
  const [y, m] = yyyymm.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function currentMonthValue(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function generateMonthOptions(yearsBack = 2, yearsForward = 1) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear() - yearsBack, now.getMonth(), 1);
  const total = (yearsBack + yearsForward) * 12;
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

const MONTH_OPTIONS = generateMonthOptions();

// ─── Export helpers ────────────────────────────────────────────────────────

async function exportDetailExcel(record: PayrollRecord) {
  const XLSX = await import('xlsx');
  type CellRow = [string, string | number];
  const rows: CellRow[] = [
    ['Company', 'HR ERP System'],
    ['Report', 'Salary Slip'],
    ['Employee', record.employeeName],
    ['Code', record.employeeCode],
    ['Department', record.department],
    ['Month', monthLabel(record.payrollMonth)],
    ['Status', record.status.toUpperCase()],
    ['', ''],
    ['── EARNINGS ──', ''],
    ['Basic Salary (EGP)', record.basicSalary],
    ['Increase Amount (EGP)', record.increaseAmount],
    ['Gross Salary (EGP)', record.grossSalary],
    ['Saturday Shift (EGP)', record.saturdayShiftAllowance],
    ['Duty (EGP)', record.dutyAllowance],
    ['Potty Training (EGP)', record.pottyTrainingAllowance],
    ['After School (EGP)', record.afterSchoolAllowance],
    ['Transportation (EGP)', record.transportationAllowance],
    ['Extra Bonus (EGP)', record.extraBonusAllowance],
    ['Others (EGP)', record.otherBonusAllowance],
    ['Total Allowances (EGP)', record.totalAllowances],
    ['Bonuses (EGP)', record.bonuses],
    ['Bonus Notes', record.bonusNotes || ''],
    ['Total Salary (EGP)', record.totalSalary],
    ['', ''],
    ['── DEDUCTIONS ──', ''],
    ['Medical Insurance (EGP)', record.medicalInsurance],
    ['Social Insurance (EGP)', record.socialInsurance],
    [`Late Deduction (${record.attendanceSummary?.lateMinutes ?? 0} min / ${record.attendanceSummary?.deductionDays ?? 0} days) (EGP)`, record.lateDeduction],
    [`Absence Deduction (${record.leaveSummary?.unpaidDays ?? 0} unpaid days) (EGP)`, record.absenceDeduction],
    ['Cash Advance (EGP)', record.cashAdvance],
    ['Total Deductions (EGP)', record.totalDeductions],
    ['', ''],
    ['NET SALARY (EGP)', record.netSalary],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 58 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Slip');
  XLSX.writeFile(wb, `payslip_${record.employeeCode}_${record.payrollMonth}.xlsx`);
}

async function exportDetailPDF(record: PayrollRecord) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait' });

  // Branding header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(undefined as any, 'bold');
  doc.text('HR ERP System  —  Salary Slip', 14, 13);
  doc.setFontSize(8);
  doc.setFont(undefined as any, 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 22);

  // Employee block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont(undefined as any, 'bold');
  doc.text(`${record.employeeName}  (${record.employeeCode})`, 14, 38);
  doc.setFont(undefined as any, 'normal');
  doc.setFontSize(9);
  doc.text(
    `Dept: ${record.department || '—'}   |   Month: ${monthLabel(record.payrollMonth)}   |   Status: ${record.status.toUpperCase()}`,
    14, 45,
  );

  // Earnings table
  autoTable(doc, {
    startY: 52,
    head: [['EARNINGS', 'Amount (EGP)']],
    body: [
      ['Basic Salary', fmtAmt(record.basicSalary)],
      ['Increase Amount', fmtAmt(record.increaseAmount)],
      ['Gross Salary  (Basic + Increase)', fmtAmt(record.grossSalary)],
      ['Saturday Shift', fmtAmt(record.saturdayShiftAllowance)],
      ['Duty', fmtAmt(record.dutyAllowance)],
      ['Potty Training', fmtAmt(record.pottyTrainingAllowance)],
      ['After School', fmtAmt(record.afterSchoolAllowance)],
      ['Transportation', fmtAmt(record.transportationAllowance)],
      ['Extra Bonus', fmtAmt(record.extraBonusAllowance)],
      ['Others', fmtAmt(record.otherBonusAllowance)],
      ['Total Allowances', fmtAmt(record.totalAllowances)],
      ['Bonuses', fmtAmt(record.bonuses)],
      ['Bonus Notes', record.bonusNotes || '—'],
      ['TOTAL SALARY', fmtAmt(record.totalSalary)],
    ],
    headStyles: { fillColor: [21, 128, 61], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 12) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
    margin: { left: 14, right: 14 },
  });

  const earningsEndY = (doc as any).lastAutoTable?.finalY ?? 160;

  // Deductions table
  autoTable(doc, {
    startY: earningsEndY + 8,
    head: [['DEDUCTIONS', 'Amount (EGP)']],
    body: [
      ['Medical Insurance', fmtAmt(record.medicalInsurance)],
      ['Social Insurance', fmtAmt(record.socialInsurance)],
      [
        `Late Deduction  (${record.attendanceSummary?.lateMinutes ?? 0} min / ${record.attendanceSummary?.deductionDays ?? 0} late days)`,
        fmtAmt(record.lateDeduction),
      ],
      [
        `Absence Deduction  (${record.leaveSummary?.unpaidDays ?? 0} unpaid days)`,
        fmtAmt(record.absenceDeduction),
      ],
      ['Cash Advance', fmtAmt(record.cashAdvance)],
      ['TOTAL DEDUCTIONS', fmtAmt(record.totalDeductions)],
    ],
    headStyles: { fillColor: [185, 28, 28], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Net salary footer block
  const deductsEndY = (doc as any).lastAutoTable?.finalY ?? 220;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, deductsEndY + 8, 182, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined as any, 'bold');
  doc.text('NET SALARY', 18, deductsEndY + 19);
  doc.text(`EGP ${fmtAmt(record.netSalary)}`, 196, deductsEndY + 19, { align: 'right' });

  doc.save(`payslip_${record.employeeCode}_${record.payrollMonth}.pdf`);
}

async function exportTableExcel(records: PayrollRecord[]) {
  const XLSX = await import('xlsx');
  const rows = records.map((r) => ({
    'Employee Code': r.employeeCode,
    'Employee Name': r.employeeName,
    Department: r.department,
    'Payroll Month': r.payrollMonth,
    'Basic Salary (EGP)': r.basicSalary,
    'Increase Amount (EGP)': r.increaseAmount,
    'Gross Salary (EGP)': r.grossSalary,
    'Total Allowances (EGP)': r.totalAllowances,
    'Bonuses (EGP)': r.bonuses,
    'Total Salary (EGP)': r.totalSalary,
    'Medical Insurance (EGP)': r.medicalInsurance,
    'Social Insurance (EGP)': r.socialInsurance,
    'Late Deduction (EGP)': r.lateDeduction,
    'Absence Deduction (EGP)': r.absenceDeduction,
    'Cash Advance (EGP)': r.cashAdvance,
    'Total Deductions (EGP)': r.totalDeductions,
    'Net Salary (EGP)': r.netSalary,
    Status: r.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll Summary');
  XLSX.writeFile(wb, `payroll_summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportTablePDF(records: PayrollRecord[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined as any, 'bold');
  doc.text('HR ERP System  —  Payroll Summary Report', 14, 14);
  doc.setFontSize(8);
  doc.setFont(undefined as any, 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')}   |   Total Records: ${records.length}`,
    283, 14, { align: 'right' },
  );

  autoTable(doc, {
    startY: 28,
    head: [['Code', 'Employee Name', 'Month', 'Increase', 'Gross', 'Allowances', 'Bonuses', 'Total Salary', 'Deductions', 'Net Salary', 'Status']],
    body: records.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.payrollMonth,
      fmtAmt(r.increaseAmount),
      fmtAmt(r.grossSalary),
      fmtAmt(r.totalAllowances),
      fmtAmt(r.bonuses),
      fmtAmt(r.totalSalary),
      fmtAmt(r.totalDeductions),
      fmtAmt(r.netSalary),
      r.status.toUpperCase(),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 41, 59] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 10) {
        const v = data.cell.raw as string;
        data.cell.styles.textColor = v === 'PUBLISHED' ? [21, 128, 61] : [180, 83, 9];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`payroll_summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PayrollRecord['status'] }) {
  return status === 'published' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle className="h-3 w-3" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <FileText className="h-3 w-3" /> Draft
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: i === 0 ? '75%' : '55%' }} />
        </td>
      ))}
    </tr>
  );
}

function EarningRow({ label, amount, highlight = false, sub = false }: { label: string; amount: number; highlight?: boolean; sub?: boolean }) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        sub ? 'pl-4 text-xs text-slate-500' : 'text-sm text-slate-700'
      } ${highlight ? 'font-semibold text-slate-900 bg-green-50 -mx-4 px-4 rounded border-t border-b border-green-100 my-1' : 'border-b border-slate-50 last:border-0'}`}
    >
      <span>{label}</span>
      <span className={highlight ? 'text-green-700' : ''}>{fmtAmt(amount)}</span>
    </div>
  );
}

function DeductRow({ label, amount, highlight = false, placeholder = false }: { label: string; amount: number; highlight?: boolean; placeholder?: boolean }) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        highlight ? 'font-semibold text-slate-900 bg-red-50 -mx-4 px-4 rounded border-t border-b border-red-100 my-1' : 'text-sm text-slate-700 border-b border-slate-50 last:border-0'
      }`}
    >
      <span>{label}</span>
      {placeholder ? (
        <span className="text-slate-400 text-xs">—</span>
      ) : (
        <span className={highlight ? 'text-red-700' : amount > 0 ? 'text-red-600' : 'text-slate-400'}>
          {amount > 0 ? `-${fmtAmt(amount)}` : '—'}
        </span>
      )}
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel, busy }: { name: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Delete Payroll Record</h3>
            <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Delete payroll for <strong>{name}</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Publish Confirm ──────────────────────────────────────────────────────

function PublishConfirm({ name, month, onConfirm, onCancel, busy }: { name: string; month: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-full shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Publish Payroll</h3>
            <p className="text-sm text-slate-500 mt-0.5">Record will be locked from editing.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Publish <strong>{name}</strong> — <strong>{monthLabel(month)}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Details Modal ────────────────────────────────────────────────────────

interface DetailsModalProps {
  record: PayrollRecord;
  isAdmin: boolean;
  onClose: () => void;
  onPublishRequest: (r: PayrollRecord) => void;
  onDeleteRequest: (r: PayrollRecord) => void;
}

function DetailsModal({ record, isAdmin, onClose, onPublishRequest, onDeleteRequest }: DetailsModalProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Payroll Slip</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {record.employeeName} &mdash; {record.employeeCode} &mdash; {monthLabel(record.payrollMonth)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <StatusBadge status={record.status} />
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Total Salary</p>
              <p className="text-xl font-bold text-green-700 mt-1">{fmtAmt(record.totalSalary)}</p>
              <p className="text-xs text-green-500 mt-0.5">EGP</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Deductions</p>
              <p className="text-xl font-bold text-red-700 mt-1">{fmtAmt(record.totalDeductions)}</p>
              <p className="text-xs text-red-500 mt-0.5">EGP</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-300 font-semibold uppercase tracking-wide">Net Salary</p>
              <p className="text-xl font-bold text-white mt-1">{fmtAmt(record.netSalary)}</p>
              <p className="text-xs text-slate-400 mt-0.5">EGP</p>
            </div>
          </div>

          {/* Earnings section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-green-700 px-4 py-2.5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Earnings</span>
            </div>
            <div className="px-4 py-3">
              <EarningRow label="Basic Salary" amount={record.basicSalary} />
              <EarningRow label="Increase Amount" amount={record.increaseAmount} />
              <EarningRow label="Gross Salary  (Basic + Increase)" amount={record.grossSalary} highlight />
              <EarningRow label="Saturday Shift" amount={record.saturdayShiftAllowance} sub />
              <EarningRow label="Duty" amount={record.dutyAllowance} sub />
              <EarningRow label="Potty Training" amount={record.pottyTrainingAllowance} sub />
              <EarningRow label="After School" amount={record.afterSchoolAllowance} sub />
              <EarningRow label="Transportation" amount={record.transportationAllowance} sub />
              <EarningRow label="Extra Bonus" amount={record.extraBonusAllowance} sub />
              <EarningRow label="Others" amount={record.otherBonusAllowance} sub />
              <EarningRow label="Total Allowances" amount={record.totalAllowances} />
              <EarningRow label="Bonuses" amount={record.bonuses} />
              {record.bonusNotes && (
                <div className="flex justify-between items-center py-1.5 text-xs text-slate-500 border-b border-slate-50">
                  <span className="text-slate-400">Notes</span>
                  <span className="italic">{record.bonusNotes}</span>
                </div>
              )}
              <EarningRow label="Total Salary  (Gross + Allowances + Bonuses)" amount={record.totalSalary} highlight />
            </div>
          </div>

          {/* Deductions section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-red-700 px-4 py-2.5 flex items-center gap-2">
              <Minus className="h-4 w-4 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Deductions</span>
            </div>
            <div className="px-4 py-3">
              <DeductRow label="Medical Insurance" amount={record.medicalInsurance} />
              <DeductRow label="Social Insurance" amount={record.socialInsurance} />
              <DeductRow
                label={`Late Deduction  (${record.attendanceSummary?.lateMinutes ?? 0} min / ${record.attendanceSummary?.deductionDays ?? 0} days)`}
                amount={record.lateDeduction}
              />
              <DeductRow
                label={`Absence Deduction  (${record.leaveSummary?.unpaidDays ?? 0} unpaid days)`}
                amount={record.absenceDeduction}
              />
              <DeductRow label="Cash Advance" amount={record.cashAdvance} />
              <DeductRow label="Total Deductions" amount={record.totalDeductions} highlight />
            </div>
          </div>

          {/* Net salary block */}
          <div className="bg-slate-900 rounded-xl px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Net Salary</p>
              <p className="text-xs text-slate-500 mt-1">Total Salary &minus; Total Deductions</p>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              EGP {fmtAmt(record.netSalary)}
            </p>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
            <span>Daily Rate: EGP {fmtAmt(record.dailyRate)}</span>
            <span>Generated: {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : '—'}</span>
            {record.publishedAt && <span>Published: {new Date(record.publishedAt).toLocaleDateString('en-GB')}</span>}
            {record.notes && <span>Notes: {record.notes}</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between shrink-0">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportOpen && (
              <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 min-w-[160px]">
                <button
                  type="button"
                  onClick={() => { setExportOpen(false); exportDetailExcel(record); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as Excel
                </button>
                <button
                  type="button"
                  onClick={() => { setExportOpen(false); exportDetailPDF(record); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isAdmin && record.status === 'draft' && (
              <button
                onClick={() => onPublishRequest(record)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Publish
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onDeleteRequest(record)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Payroll Modal ────────────────────────────────────────────────

const MODE_OPTIONS: { value: GenerateMode; label: string; desc: string }[] = [
  { value: 'single',     label: 'Single Employee',          desc: 'Generate payroll for one specific employee' },
  { value: 'all',        label: 'All Employees',            desc: 'Generate payroll for every active employee' },
  { value: 'branch',     label: 'By Branch',                desc: 'Generate for all employees in selected branch(es)' },
  { value: 'categories', label: 'By Category',              desc: 'Generate for all employees of selected category(ies)' },
  { value: 'mix',        label: 'Branch + Category (Mix)',  desc: 'Intersect branch AND category filters' },
];

interface GenerateModalProps {
  employees: Employee[];
  onClose: () => void;
  onGenerated: () => void;
}

function GenerateModal({ employees, onClose, onGenerated }: GenerateModalProps) {
  const [mode, setMode] = useState<GenerateMode>('single');
  const [employeeId, setEmployeeId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState(currentMonthValue());
  const [overrideBasicSalary, setOverrideBasicSalary] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [batchResult, setBatchResult] = useState<BatchGenerateResult | null>(null);

  // Derive unique branches from loaded employees
  const branchOptions = Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort();

  function toggleBranch(b: string) {
    setSelectedBranches((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  }

  function toggleCategory(c: string) {
    setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  async function handleGenerate() {
    setError('');
    if (!payrollMonth || !/^\d{4}-\d{2}$/.test(payrollMonth)) {
      setError('Payroll month must be in YYYY-MM format.'); return;
    }

    if (mode === 'single') {
      if (!employeeId) { setError('Please select an employee.'); return; }
      setSaving(true);
      try {
        const payload: GeneratePayrollPayload = {
          employeeId,
          payrollMonth,
          ...(overrideBasicSalary ? { overrideBasicSalary: parseFloat(overrideBasicSalary) } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        };
        await payrollService.generate(payload);
        onGenerated();
      } catch (e: any) {
        setError(e.message || 'Failed to generate payroll');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Batch modes
    if ((mode === 'branch' || mode === 'mix') && selectedBranches.length === 0) {
      setError('Please select at least one branch.'); return;
    }
    if ((mode === 'categories' || mode === 'mix') && selectedCategories.length === 0) {
      setError('Please select at least one category.'); return;
    }

    setSaving(true);
    try {
      const payload: BatchGeneratePayrollPayload = {
        mode,
        payrollMonth,
        ...(selectedBranches.length ? { branches: selectedBranches } : {}),
        ...(selectedCategories.length ? { categories: selectedCategories } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      const result = await payrollService.generateBatchFiltered(payload);
      setBatchResult(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate payroll');
    } finally {
      setSaving(false);
    }
  }

  // After a successful batch — show summary
  if (batchResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Batch Complete</h3>
              <p className="text-xs text-slate-400 mt-0.5">{monthLabel(batchResult.payrollMonth)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Generated: {batchResult.succeeded.length}</p>
                <p className="text-xs text-green-600">Draft payroll records created / updated</p>
              </div>
            </div>
            {batchResult.skipped.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Skipped: {batchResult.skipped.length}</p>
                  <p className="text-xs text-amber-600">Already published — not overwritten</p>
                </div>
              </div>
            )}
            {batchResult.failed.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">Failed: {batchResult.failed.length}</p>
                <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {batchResult.failed.map((f) => (
                    <li key={f.employeeId}>{f.employeeName}: {f.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <button
              onClick={() => { onGenerated(); onClose(); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentMode = MODE_OPTIONS.find((m) => m.value === mode)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Generate Payroll</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculate and store monthly salary records</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Mode selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Generation Scope *</label>
            <select
              value={mode}
              onChange={(e) => { setMode(e.target.value as GenerateMode); setError(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{currentMode.desc}</p>
          </div>

          {/* Payroll Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payroll Month *</label>
            <select
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Single employee: employee selector + override */}
          {mode === 'single' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Employee *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">Select Employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.employeeCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Override Basic Salary (EGP)
                  <span className="ml-1 text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={overrideBasicSalary}
                  onChange={(e) => setOverrideBasicSalary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </>
          )}

          {/* Branch selector */}
          {(mode === 'branch' || mode === 'mix') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Branch(es) * <span className="font-normal text-slate-400 normal-case">— select one or more</span>
              </label>
              {branchOptions.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No branches found in employee data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {branchOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedBranches.includes(b)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category selector */}
          {(mode === 'categories' || mode === 'mix') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Category(ies) * <span className="font-normal text-slate-400 normal-case">— select one or more</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYEE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedCategories.includes(c)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <button onClick={onClose} disabled={saving} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {mode === 'single' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {saving ? 'Generating…' : mode === 'single' ? 'Generate Payroll' : 'Generate Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────

// ─── Tab definitions ──────────────────────────────────────────────────────
type PayrollTab = 'summary' | 'salary-config' | 'salary-increase-schedule' | 'cash-advances';

const PAYROLL_TABS: { id: PayrollTab; label: string }[] = [
  { id: 'summary', label: 'Payroll Summary' },
  { id: 'salary-config', label: 'Salary Config' },
  { id: 'salary-increase-schedule', label: 'Increase Schedule' },
  { id: 'cash-advances', label: 'Cash in Advance' },
];

function PayrollContent() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);
  const [activeTab, setActiveTab] = useState<PayrollTab>('summary');

  const {
    records,
    total,
    page,
    limit,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    reload,
    publish: hookPublish,
    remove: hookRemove,
    statusMsg,
    clearStatus,
  } = usePayroll({ payrollMonth: currentMonthValue() });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<PayrollRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [tableExportOpen, setTableExportOpen] = useState(false);
  const tableExportRef = useRef<HTMLDivElement>(null);

  // Local filter state — applied on button click / Enter
  const [localSearch, setLocalSearch] = useState(filters.search ?? '');
  const [localMonth, setLocalMonth] = useState(filters.payrollMonth ?? currentMonthValue());
  const [localDept, setLocalDept] = useState(filters.department ?? '');
  const [localStatus, setLocalStatus] = useState<string>(filters.status ?? '');

  useEffect(() => {
    if (admin) {
      employeeService.getAllEmployees().then(setEmployees).catch(() => {});
    }
  }, [admin]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tableExportRef.current && !tableExportRef.current.contains(e.target as Node)) {
        setTableExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function applyFilters() {
    setFilters({
      search: localSearch.trim() || undefined,
      payrollMonth: localMonth || undefined,
      department: localDept.trim() || undefined,
      status: (localStatus as 'draft' | 'published') || undefined,
    });
  }

  async function handlePublishConfirm() {
    if (!publishTarget) return;
    setActionBusy(true);
    try {
      await hookPublish(publishTarget.id);
      if (detailRecord?.id === publishTarget.id) setDetailRecord(null);
      setPublishTarget(null);
    } catch {
      // error handled in hook
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      await hookRemove(deleteTarget.id);
      if (detailRecord?.id === deleteTarget.id) setDetailRecord(null);
      setDeleteTarget(null);
    } catch {
      // error handled in hook
    } finally {
      setActionBusy(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl shrink-0">
            <Banknote className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
            <p className="text-sm text-slate-500">Manage payroll and salary configurations</p>
          </div>
        </div>
        {admin && activeTab === 'summary' && (
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Generate Payroll
          </button>
        )}
      </div>

      {/* ── Tab navigation ── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px" aria-label="Payroll tabs">
          {PAYROLL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.id === 'salary-config' && <Settings className="h-3.5 w-3.5" />}
              {tab.id === 'salary-increase-schedule' && <TrendingUp className="h-3.5 w-3.5" />}
              {tab.id === 'cash-advances' && <Banknote className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          ))}
          {/* Config History navigates to a dedicated page */}
          <Link
            href="/dashboard/payroll/salary-config-history"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors whitespace-nowrap"
          >
            <Settings className="h-3.5 w-3.5" />
            Config History
          </Link>
        </nav>
      </div>

      {/* ── Salary Config tab ── */}
      {activeTab === 'salary-config' && <SalaryConfigSection />}

      {/* ── Increase Schedule tab ── */}
      {activeTab === 'salary-increase-schedule' && <SalaryIncreaseScheduleSection />}

      {/* ── Cash in Advance tab ── */}
      {activeTab === 'cash-advances' && <CashAdvancesSection />}

      {/* ── Payroll Summary tab ── */}
      {activeTab === 'summary' && (
        <>

      {/* Toast messages */}
      {statusMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {statusMsg}
          <button onClick={clearStatus} className="ml-auto text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or code…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Month */}
          <select
            value={localMonth}
            onChange={(e) => setLocalMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[170px]"
          >
            <option value="">All Months</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Department */}
          <input
            type="text"
            placeholder="Department…"
            value={localDept}
            onChange={(e) => setLocalDept(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[140px]"
          />

          {/* Status */}
          <select
            value={localStatus}
            onChange={(e) => setLocalStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[130px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          {/* Apply */}
          <button
            onClick={applyFilters}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Apply
          </button>

          {/* Export table */}
          <div className="relative" ref={tableExportRef}>
            <button
              type="button"
              onClick={() => setTableExportOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {tableExportOpen && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 min-w-[160px]">
                <button
                  type="button"
                  onClick={() => { setTableExportOpen(false); exportTableExcel(records); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as Excel
                </button>
                <button
                  type="button"
                  onClick={() => { setTableExportOpen(false); exportTablePDF(records); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Increase</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Gross Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-900 uppercase tracking-wider whitespace-nowrap">Net Salary</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Banknote className="h-12 w-12 text-slate-200" />
                      <p className="font-medium">No payroll records found</p>
                      <p className="text-sm">Adjust your filters or generate a new payroll</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{rec.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{rec.employeeCode}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{monthLabel(rec.payrollMonth)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {rec.increaseAmount > 0 ? (
                        <span className="text-emerald-600 font-medium">+{fmtAmt(rec.increaseAmount)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{fmtAmt(rec.grossSalary)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{fmtAmt(rec.totalSalary)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">{fmtAmt(rec.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailRecord(rec)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {admin && rec.status === 'draft' && (
                          <button
                            onClick={() => setPublishTarget(rec)}
                            title="Publish"
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {admin && (
                          <button
                            onClick={() => setDeleteTarget(rec)}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    p === page ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-200 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showGenerate && admin && (
        <GenerateModal
          employees={employees}
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { setShowGenerate(false); reload(); }}
        />
      )}

      {detailRecord && (
        <DetailsModal
          record={detailRecord}
          isAdmin={admin}
          onClose={() => setDetailRecord(null)}
          onPublishRequest={(r) => { setDetailRecord(null); setPublishTarget(r); }}
          onDeleteRequest={(r) => { setDetailRecord(null); setDeleteTarget(r); }}
        />
      )}

      {publishTarget && (
        <PublishConfirm
          name={publishTarget.employeeName}
          month={publishTarget.payrollMonth}
          onConfirm={handlePublishConfirm}
          onCancel={() => setPublishTarget(null)}
          busy={actionBusy}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={`${deleteTarget.employeeName} (${monthLabel(deleteTarget.payrollMonth)})`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          busy={actionBusy}
        />
      )}
        </>
      )}
    </div>
  );
}

// ─── Default export ────────────────────────────────────────────────────────

export default function PayrollPage() {
  return (
    <ProtectedRoute moduleId="payroll">
      <DashboardLayout>
        <PayrollContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
