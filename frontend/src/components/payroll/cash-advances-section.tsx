'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Banknote,
  ChevronDown,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCashAdvances } from '@/hooks/use-cash-advances';
import { employeeService } from '@/lib/services/employee.service';
import type { Employee } from '@/types/employee';
import type {
  CashAdvance,
  CashAdvanceStatus,
  CreateCashAdvancePayload,
  DecideCashAdvancePayload,
} from '@/types/cash-advances';

// ─── Role helpers ────────────────────────────────────────────────────────────

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}
function isFinanceManager(user: any): boolean {
  return user?.role === 'finance_manager';
}
function canViewAll(user: any): boolean {
  return isAppAdmin(user) || isFinanceManager(user);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtAmt(n: number | undefined): string {
  return (n ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(yyyymm: string): string {
  if (!yyyymm || yyyymm === '—') return '—';
  const [y, m] = yyyymm.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function currentMonthValue(): string {
  const n = new Date();
  // Clamp to minimum Jan 2026
  const y = Math.max(n.getFullYear(), 2026);
  const m = y > 2026 ? n.getMonth() + 1 : Math.max(n.getMonth() + 1, 1);
  return `${y}-${String(m).padStart(2, '0')}`;
}

function generateMonthOptions(_yearsBack = 0, yearsForward = 2) {
  const opts: { value: string; label: string }[] = [];
  // Always start from January 2026
  const start = new Date(2026, 0, 1);
  const now = new Date();
  const end = new Date(Math.max(now.getFullYear(), 2026) + yearsForward, 11, 1);
  let d = new Date(start);
  while (d <= end) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return opts;
}

const MONTH_OPTIONS = generateMonthOptions();

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CashAdvanceStatus }) {
  const map: Record<CashAdvanceStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-600',
  };
  const label: Record<CashAdvanceStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function exportToExcel(rows: CashAdvance[]) {
  const XLSX = await import('xlsx');
  const data = rows.map((r) => ({
    'Emp Code': r.employeeCode,
    'Emp Name': r.employeeName,
    'Amount (EGP)': r.amount,
    'Remaining (EGP)': r.remainingAmount,
    'Installments (months)': r.installmentMonths,
    'Monthly Installment (EGP)': r.monthlyInstallment,
    'Repayment Start': monthLabel(r.repaymentStartMonth),
    Reason: r.reason ?? '',
    Status: r.status,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cash Advances');
  XLSX.writeFile(wb, 'cash-advances.xlsx');
}

async function exportToPdf(rows: CashAdvance[]) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(13);
  doc.text('Cash Advance Requests', 40, 36);
  autoTable(doc, {
    startY: 52,
    head: [['Emp Code', 'Emp Name', 'Amount', 'Remaining', 'Installments', 'Monthly', 'Start Month', 'Status']],
    body: rows.map((r) => [
      r.employeeCode,
      r.employeeName,
      fmtAmt(r.amount),
      fmtAmt(r.remainingAmount),
      r.installmentMonths,
      fmtAmt(r.monthlyInstallment),
      monthLabel(r.repaymentStartMonth),
      r.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save('cash-advances.pdf');
}

// ─── Request Form Modal ───────────────────────────────────────────────────────

interface RequestFormProps {
  employees: Employee[];
  initial?: CashAdvance | null;
  currentUser: any;
  isAdmin: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCashAdvancePayload) => Promise<boolean>;
}

function RequestFormModal({ employees, initial, currentUser, isAdmin, onClose, onSubmit }: RequestFormProps) {
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? (isAdmin ? '' : currentUser?.employeeId ?? ''));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [installmentMonths, setInstallmentMonths] = useState(initial ? String(initial.installmentMonths) : '1');
  const [repaymentStartMonth, setRepaymentStartMonth] = useState(initial?.repaymentStartMonth ?? currentMonthValue());
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill employee details
  const selectedEmp = employees.find((e) => e.id === employeeId);
  const branchValue = initial?.branch ?? selectedEmp?.branch ?? '';

  async function handleSubmit() {
    if (!employeeId) { setError('Please select an employee.'); return; }
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) { setError('Please enter a valid amount greater than 0.'); return; }
    const instNum = parseInt(installmentMonths, 10);
    if (!instNum || instNum < 1) { setError('Number of installments must be at least 1.'); return; }
    if (!repaymentStartMonth || !/^\d{4}-\d{2}$/.test(repaymentStartMonth)) {
      setError('Please select a valid payment start month.');
      return;
    }

    setError('');
    setSaving(true);
    const emp = employees.find((e) => e.id === employeeId);
    const ok = await onSubmit({
      employeeId,
      employeeName: emp?.fullName ?? '',
      employeeCode: emp?.employeeCode ?? '',
      branch: emp?.branch ?? branchValue ?? '',
      amount: amtNum,
      installmentMonths: instNum,
      repaymentStartMonth,
      reason: reason.trim() || undefined,
    });
    setSaving(false);
    if (ok) onClose();
  }

  const amtNum = parseFloat(amount) || 0;
  const instNum = parseInt(installmentMonths, 10) || 1;
  const preview = amtNum > 0 && instNum >= 1 ? Math.round((amtNum / instNum) * 100) / 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
              {initial ? 'Edit Cash Advance' : 'Request Cash Advance'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Fill in the details below</p>
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

          {/* Employee selector — shown to admins only; for employees it's pre-filled */}
          {isAdmin ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Employee *
              </label>
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
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Employee</label>
              <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700">
                {selectedEmp ? `${selectedEmp.fullName} — ${selectedEmp.employeeCode}` : currentUser?.displayName ?? 'You'}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Branch
            </label>
            <div className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700">
              {branchValue || <span className="text-slate-400 italic">Auto-filled from employee</span>}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Amount (EGP) *
            </label>
            <input
              type="number"
              min={1}
              step={0.01}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Start month */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Payment Start Month *
            </label>
            <select
              value={repaymentStartMonth}
              onChange={(e) => setRepaymentStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Number of installments */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Number of Installments (months) *
            </label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="1"
              value={installmentMonths}
              onChange={(e) => setInstallmentMonths(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {preview > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Monthly deduction from salary: <span className="font-semibold text-slate-700">EGP {fmtAmt(preview)}</span>
              </p>
            )}
          </div>

          {/* Reason (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Reason <span className="font-normal text-slate-400 normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Briefly describe the reason for the advance…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <Banknote className="h-4 w-4" />
            {saving ? 'Submitting…' : initial ? 'Save Changes' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve/Reject Confirm Modal ────────────────────────────────────────────

interface DecideModalProps {
  record: CashAdvance;
  decision: 'approved' | 'rejected';
  onConfirm: (payload: DecideCashAdvancePayload) => Promise<void>;
  onCancel: () => void;
}

function DecideModal({ record, decision, onConfirm, onCancel }: DecideModalProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (decision === 'rejected' && !reason.trim()) return;
    setBusy(true);
    await onConfirm({ status: decision, rejectionReason: decision === 'rejected' ? reason.trim() : undefined });
    setBusy(false);
  }

  const isApprove = decision === 'approved';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full shrink-0 ${isApprove ? 'bg-green-100' : 'bg-red-100'}`}>
            {isApprove
              ? <CheckCircle className="h-5 w-5 text-green-600" />
              : <XCircle className="h-5 w-5 text-red-600" />
            }
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {isApprove ? 'Approve' : 'Reject'} Cash Advance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.employeeName} — EGP {fmtAmt(record.amount)}
            </p>
          </div>
        </div>

        {!isApprove && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Rejection Reason *</label>
            <textarea
              rows={2}
              placeholder="Reason for rejection…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
        )}

        {isApprove && (
          <p className="text-sm text-slate-700 mb-5">
            This will generate a repayment schedule of <strong>{record.installmentMonths} monthly installments</strong> starting{' '}
            <strong>{monthLabel(record.repaymentStartMonth)}</strong>. The employee's payroll will be deducted{' '}
            <strong>EGP {fmtAmt(record.monthlyInstallment)}</strong> per month.
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={busy || (!isApprove && !reason.trim())}
            className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors ${
              isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {busy ? 'Processing…' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Delete Request</h3>
            <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Delete cash advance request for <strong>{label}</strong>?
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

// ─── Month options for filter (starting Jan 2026) ─────────────────────────────

function generateFilterMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const start = new Date(2026, 0, 1); // January 2026
  const end = new Date();
  end.setMonth(end.getMonth() + 24); // 2 years ahead
  let d = new Date(start);
  while (d <= end) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return opts;
}

const FILTER_MONTH_OPTIONS = generateFilterMonthOptions();

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: i === 0 ? '70%' : '55%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function CashAdvancesSection() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);
  const viewAll = canViewAll(user);

  const ca = useCashAdvances();

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CashAdvance | null>(null);
  const [decideTarget, setDecideTarget] = useState<{ record: CashAdvance; decision: 'approved' | 'rejected' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashAdvance | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load employees
  useEffect(() => {
    employeeService.getAllEmployees()
      .then(setEmployees)
      .catch(() => {});
  }, []);

  // Load records — scope for non-admin standard employees
  useEffect(() => {
    if (viewAll) {
      ca.load();
    } else {
      // Standard employee: pass their own employeeId to scope the query
      const empId = (user as any)?.employeeId;
      empId ? ca.load(empId) : ca.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAll]);

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  // Derive unique branches from loaded records
  const branchOptions = Array.from(new Set(ca.records.map((r) => r.branch).filter(Boolean))).sort();

  const filtered = ca.records.filter((r) => {
    if (ca.search) {
      const q = ca.search.toLowerCase();
      const matchSearch =
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.status.includes(q);
      if (!matchSearch) return false;
    }
    if (filterEmployee && r.employeeId !== filterEmployee) return false;
    if (filterBranch && r.branch !== filterBranch) return false;
    if (filterMonth && r.repaymentStartMonth !== filterMonth) return false;
    return true;
  });

  const hasActiveFilters = filterEmployee || filterBranch || filterMonth;

  function clearFilters() {
    setFilterEmployee('');
    setFilterBranch('');
    setFilterMonth('');
  }

  async function handleFormSubmit(payload: CreateCashAdvancePayload) {
    if (editTarget) {
      return ca.update(editTarget.id, {
        amount: payload.amount,
        installmentMonths: payload.installmentMonths,
        repaymentStartMonth: payload.repaymentStartMonth,
        reason: payload.reason,
      });
    }
    return ca.create(payload);
  }

  async function handleDecide(payload: DecideCashAdvancePayload) {
    if (!decideTarget) return;
    await ca.decide(decideTarget.record.id, payload);
    setDecideTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    await ca.remove(deleteTarget.id);
    setDeleteBusy(false);
    setDeleteTarget(null);
  }

  const canEdit = (record: CashAdvance): boolean => {
    if (admin) return true;
    return record.status === 'pending' && record.employeeId === (user as any)?.employeeId;
  };

  const canDelete = (record: CashAdvance): boolean => {
    if (admin) return true;
    return record.status === 'pending' && record.employeeId === (user as any)?.employeeId;
  };

  return (
    <div className="space-y-4">
      {/* Status flash */}
      {ca.status && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium border flex items-center gap-2 ${
            ca.status.kind === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {ca.status.kind === 'success'
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertTriangle className="h-4 w-4 shrink-0" />
          }
          {ca.status.text}
        </div>
      )}

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Card header — top row: title, export, search, request button */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Cash in Advance Requests</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  enabled:border-slate-300 enabled:text-slate-700 enabled:hover:bg-slate-50"
              >
                <Banknote className="h-4 w-4" />
                Export
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { exportToExcel(filtered); setExportOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Export as Excel
                  </button>
                  <button
                    onClick={() => { exportToPdf(filtered); setExportOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search…"
                value={ca.search}
                onChange={(e) => ca.setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Request button — admins and standard employees can request */}
            {!isFinanceManager(user) && (
              <button
                onClick={() => { setEditTarget(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" />
                Request
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Filter by:</span>

          {/* Employee Name filter */}
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[160px]"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} — {emp.employeeCode}
              </option>
            ))}
          </select>

          {/* Branch filter */}
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[140px]"
          >
            <option value="">All Branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[160px]"
          >
            <option value="">All Months</option>
            {FILTER_MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Emp Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Employee Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Branch
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Remaining
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Installment
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Monthly Installment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Repayment Start
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {ca.loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Banknote className="h-10 w-10 text-slate-200" />
                      <p className="font-medium text-sm">No cash advance requests found</p>
                      {!isFinanceManager(user) && (
                        <button
                          onClick={() => { setEditTarget(null); setShowForm(true); }}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Submit the first request
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{record.employeeCode}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{record.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{record.branch || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700 whitespace-nowrap">
                      {fmtAmt(record.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {record.remainingAmount > 0
                        ? <span className="text-amber-600 font-medium">{fmtAmt(record.remainingAmount)}</span>
                        : <span className="text-emerald-600 font-medium">0.00</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-700">
                      {record.installmentMonths} mo
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700 whitespace-nowrap">
                      {fmtAmt(record.monthlyInstallment)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {monthLabel(record.repaymentStartMonth)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Approve / Reject — admin only, pending only */}
                        {admin && record.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setDecideTarget({ record, decision: 'approved' })}
                              title="Approve"
                              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDecideTarget({ record, decision: 'rejected' })}
                              title="Reject"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {/* Edit */}
                        {canEdit(record) && (
                          <button
                            onClick={() => { setEditTarget(record); setShowForm(true); }}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {/* Delete */}
                        {canDelete(record) && (
                          <button
                            onClick={() => setDeleteTarget(record)}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {/* No actions for approved/rejected non-admin rows */}
                        {!admin && record.status !== 'pending' && (
                          <span className="text-xs text-slate-300 px-1">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <RequestFormModal
          employees={employees}
          initial={editTarget}
          currentUser={user}
          isAdmin={admin}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSubmit={handleFormSubmit}
        />
      )}

      {decideTarget && (
        <DecideModal
          record={decideTarget.record}
          decision={decideTarget.decision}
          onConfirm={handleDecide}
          onCancel={() => setDecideTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          label={`${deleteTarget.employeeName} — EGP ${fmtAmt(deleteTarget.amount)}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}
