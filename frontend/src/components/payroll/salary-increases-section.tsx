'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Save,
  Trash2,
  Edit2,
  Plus,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { employeeService } from '@/lib/services/employee.service';
import { useSalaryIncreases, type IncreaseRow, type DraftRow, type SavedRow } from '@/hooks/use-salary-increases';
import type { Employee } from '@/types/employee';
import type { UpdateSalaryIncreasePayload } from '@/types/salary-increases';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

function fmtAmt(n: number | undefined): string {
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

function generateMonthOptions(yearsBack = 3, yearsForward = 2) {
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

function currentYearOptions(): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  const opts = [{ value: '', label: 'All Years' }];
  for (let y = now - 3; y <= now + 2; y++) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Remove Increase Record</h3>
            <p className="text-sm text-slate-500 mt-0.5">This will be removed on Save All.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Mark <strong>{name}</strong>'s increase for removal?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Edit Row ──────────────────────────────────────────────────────────

interface InlineEditProps {
  row: IncreaseRow;
  onSave: (update: UpdateSalaryIncreasePayload) => void;
  onCancel: () => void;
}

function InlineEditRow({ row, onSave, onCancel }: InlineEditProps) {
  const [increaseAmount, setIncreaseAmount] = useState(String(row.increaseAmount ?? ''));
  const [applyMonth, setApplyMonth] = useState(row.applyMonth ?? '');
  const [basicSalary, setBasicSalary] = useState(String(row.basicSalary ?? ''));
  const [grossSalary, setGrossSalary] = useState(String(row.grossSalary ?? ''));
  const [hiringDate, setHiringDate] = useState(row.hiringDate ?? '');
  const [jobTitle, setJobTitle] = useState(row.jobTitle ?? '');
  const [previousIncreaseDate, setPreviousIncreaseDate] = useState(row.previousIncreaseDate ?? '');
  const [nextIncreaseMonth, setNextIncreaseMonth] = useState(row.nextIncreaseMonth ?? '');
  const [newGrossSalary, setNewGrossSalary] = useState(String(row.newGrossSalary ?? ''));
  const [reason, setReason] = useState(row.reason ?? '');

  // Auto-compute newGrossSalary
  const gross = parseFloat(grossSalary) || 0;
  const inc = parseFloat(increaseAmount) || 0;

  function handleSave() {
    onSave({
      increaseAmount: parseFloat(increaseAmount) || 0,
      applyMonth,
      basicSalary: parseFloat(basicSalary) || undefined,
      grossSalary: parseFloat(grossSalary) || undefined,
      hiringDate: hiringDate || undefined,
      jobTitle: jobTitle || undefined,
      previousIncreaseDate: previousIncreaseDate || undefined,
      nextIncreaseMonth: nextIncreaseMonth || undefined,
      newGrossSalary: parseFloat(newGrossSalary) || (gross + inc) || undefined,
      reason: reason || undefined,
    });
  }

  return (
    <tr className="bg-indigo-50 border-b border-indigo-200">
      <td className="px-3 py-2 text-xs text-slate-500">{row.employeeCode}</td>
      <td className="px-3 py-2 text-xs text-slate-700 font-medium">{row.employeeName}</td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={hiringDate}
          onChange={(e) => setHiringDate(e.target.value)}
          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">{row.branch || '—'}</td>
      <td className="px-3 py-2">
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={basicSalary}
          onChange={(e) => setBasicSalary(e.target.value)}
          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
          min={0}
          step={0.01}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={grossSalary}
          onChange={(e) => setGrossSalary(e.target.value)}
          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
          min={0}
          step={0.01}
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={previousIncreaseDate}
          onChange={(e) => setPreviousIncreaseDate(e.target.value)}
          placeholder="YYYY-MM"
          className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={nextIncreaseMonth}
          onChange={(e) => setNextIncreaseMonth(e.target.value)}
          placeholder="YYYY-MM"
          className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={increaseAmount}
          onChange={(e) => setIncreaseAmount(e.target.value)}
          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
          min={0}
          step={0.01}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={newGrossSalary}
          onChange={(e) => setNewGrossSalary(e.target.value)}
          placeholder={gross + inc > 0 ? String(gross + inc) : ''}
          className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
          min={0}
          step={0.01}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={applyMonth}
          onChange={(e) => setApplyMonth(e.target.value)}
          className="w-36 px-2 py-1 border border-slate-300 rounded text-xs"
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
          >
            OK
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function exportToExcel(rows: IncreaseRow[], year: string, branch: string) {
  const XLSX = await import('xlsx');
  const data = rows.map((r) => ({
    'Employee Code': r.employeeCode,
    'Employee Name': r.employeeName,
    'Hiring Date': r.hiringDate || '—',
    Branch: r.branch || '—',
    'Job Title': r.jobTitle || '—',
    'Basic Salary (EGP)': r.basicSalary ?? '',
    'Current Gross (EGP)': r.grossSalary ?? '',
    'Prev. Increase Date': r.previousIncreaseDate || '—',
    'Next Increase Month': r.nextIncreaseMonth ? monthLabel(r.nextIncreaseMonth) : '—',
    'New Increase Amount (EGP)': r.increaseAmount,
    'New Gross Salary (EGP)': r.newGrossSalary ?? '',
    'Apply Month': monthLabel(r.applyMonth),
    Reason: r.reason || '',
    Notes: r.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Increases');
  const suffix = [year, branch].filter(Boolean).join('_') || 'all';
  XLSX.writeFile(wb, `salary_increases_${suffix}.xlsx`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalaryIncreasesSection() {
  const { user } = useAuth();
  const isAdmin = isAppAdmin(user);

  const {
    displayRows,
    loading,
    error,
    isDirty,
    saving,
    flashMsg,
    flashType,
    filterYear,
    setFilterYear,
    filterBranch,
    setFilterBranch,
    searchQuery,
    setSearchQuery,
    form,
    updateForm,
    resetForm,
    scheduleIncrease,
    editDraft,
    deleteDraft,
    editSaved,
    deleteSaved,
    saveAll,
    discardAll,
    reload,
  } = useSalaryIncreases();

  // ── Employees for the form dropdown ─────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    setEmpLoading(true);
    employeeService
      .getAllEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  // ── Modal / confirm state ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<IncreaseRow | null>(null);
  const [editTarget, setEditTarget] = useState<IncreaseRow | null>(null);
  const [formError, setFormError] = useState('');

  // ── Unique branch list from display rows ─────────────────────────────────
  const branches = Array.from(
    new Set(displayRows.map((r) => r.branch).filter(Boolean) as string[]),
  ).sort();

  // ── Employee selection handler ───────────────────────────────────────────
  const handleEmployeeSelect = useCallback(
    (empId: string) => {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) {
        updateForm('employeeId', '');
        updateForm('employeeCode', '');
        updateForm('employeeName', '');
        updateForm('branch', '');
        updateForm('department', '');
        updateForm('jobTitle', '');
        updateForm('hiringDate', '');
        updateForm('basicSalary', '');
        return;
      }
      updateForm('employeeId', emp.id);
      updateForm('employeeCode', emp.employeeCode);
      updateForm('employeeName', emp.fullName);
      updateForm('branch', emp.branch || '');
      updateForm('department', emp.department || '');
      updateForm('jobTitle', emp.jobTitle || '');
      updateForm('hiringDate', emp.startDate || '');
      updateForm('basicSalary', String(emp.currentSalary ?? ''));
      // Auto-compute grossSalary from existing saves for this employee
      const existingTotal = displayRows
        .filter(
          (r) =>
            r.employeeId === emp.id &&
            r.applyMonth <= (form.applyMonth || currentMonthValue()) &&
            !r._isDraft,
        )
        .reduce((s, r) => s + (r.increaseAmount || 0), 0);
      updateForm('grossSalary', String((emp.currentSalary || 0) + existingTotal));
    },
    [employees, displayRows, form.applyMonth, updateForm],
  );

  // ── Schedule Increase handler ────────────────────────────────────────────
  function handleSchedule() {
    setFormError('');
    const err = scheduleIncrease();
    if (err) setFormError(err);
  }

  // ── Delete confirm ───────────────────────────────────────────────────────
  function requestDelete(row: IncreaseRow) {
    setDeleteTarget(row);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget._isDraft) {
      deleteDraft((deleteTarget as DraftRow)._draftId);
    } else {
      deleteSaved((deleteTarget as SavedRow).id);
    }
    setDeleteTarget(null);
  }

  // ── Edit handling ────────────────────────────────────────────────────────
  function handleEditSave(row: IncreaseRow, update: UpdateSalaryIncreasePayload) {
    if (row._isDraft) {
      editDraft((row as DraftRow)._draftId, update as any);
    } else {
      editSaved((row as SavedRow).id, update);
    }
    setEditTarget(null);
  }

  // ── Save All handler ──────────────────────────────────────────────────────
  async function handleSaveAll() {
    await saveAll();
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Flash message ────────────────────────────────────────────────── */}
      {flashMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
            flashType === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {flashType === 'error' ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          {flashMsg}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1 — Entry Data                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              Entry Data
            </span>
          </div>

          <div className="p-5 space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            {/* Row 1: Employee + Apply Month + Increase Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Employee *
                </label>
                <select
                  value={form.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  disabled={empLoading}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">{empLoading ? 'Loading…' : 'Select Employee…'}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.employeeCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Apply Month *
                </label>
                <select
                  value={form.applyMonth}
                  onChange={(e) => updateForm('applyMonth', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  New Increase Amount (EGP) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={form.increaseAmount}
                  onChange={(e) => updateForm('increaseAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                />
              </div>
            </div>

            {/* Row 2: Context fields (pre-filled from employee, admin can adjust) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Basic Salary (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Auto-filled"
                  value={form.basicSalary}
                  onChange={(e) => updateForm('basicSalary', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Current Gross (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Auto-filled"
                  value={form.grossSalary}
                  onChange={(e) => updateForm('grossSalary', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Prev. Increase Date
                </label>
                <input
                  type="month"
                  value={form.previousIncreaseDate}
                  onChange={(e) => updateForm('previousIncreaseDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Next Increase Month
                </label>
                <input
                  type="month"
                  value={form.nextIncreaseMonth}
                  onChange={(e) => updateForm('nextIncreaseMonth', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Row 3: New Gross (computed) + Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  New Gross Salary (EGP)
                  <span className="ml-1 font-normal text-slate-400 normal-case">(auto-computed)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Auto"
                  value={form.newGrossSalary}
                  onChange={(e) => updateForm('newGrossSalary', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right bg-slate-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Reason <span className="font-normal text-slate-400 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Annual review, promotion…"
                  value={form.reason}
                  onChange={(e) => updateForm('reason', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSchedule}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Schedule Increase
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2 — Recorded List                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Recorded Increases</span>
            {isDirty && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={reload}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Save All */}
            {isAdmin && isDirty && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save All'}
              </button>
            )}

            {/* Discard */}
            {isAdmin && isDirty && (
              <button
                onClick={discardAll}
                disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Discard
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Code</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Employee Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Hiring Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Branch</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Job Title</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Basic Salary</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Curr. Gross</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Prev. Increase</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Next Month</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">New Increase</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">New Gross</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Apply Month</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Reason</th>
                {isAdmin && (
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && displayRows.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-sm text-slate-400">
                    No salary increase records.
                    {isAdmin && ' Use the Entry Data form above to schedule increases.'}
                  </td>
                </tr>
              )}
              {!loading &&
                displayRows.map((row) => {
                  const key = row._isDraft
                    ? (row as DraftRow)._draftId
                    : (row as SavedRow).id;

                  const isEditing = editTarget
                    ? row._isDraft
                      ? (row as DraftRow)._draftId ===
                        ((editTarget as DraftRow)._draftId ?? null)
                      : (row as SavedRow).id === ((editTarget as SavedRow).id ?? null)
                    : false;

                  const hasLocalEdits =
                    !row._isDraft &&
                    (row as SavedRow)._localEdits &&
                    Object.keys((row as SavedRow)._localEdits!).length > 0;

                  if (isEditing) {
                    return (
                      <InlineEditRow
                        key={key}
                        row={row}
                        onSave={(update) => handleEditSave(row, update)}
                        onCancel={() => setEditTarget(null)}
                      />
                    );
                  }

                  return (
                    <tr
                      key={key}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        row._isDraft
                          ? 'bg-indigo-50/40'
                          : hasLocalEdits
                          ? 'bg-amber-50/40'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-xs text-slate-500 font-mono">
                        {row.employeeCode}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                        {row.employeeName}
                        {row._isDraft && (
                          <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">
                            NEW
                          </span>
                        )}
                        {hasLocalEdits && (
                          <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-semibold">
                            EDITED
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {row.hiringDate
                          ? new Date(row.hiringDate).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{row.branch || '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {row.jobTitle || '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-700 font-mono">
                        {row.basicSalary != null ? fmtAmt(row.basicSalary) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-700 font-mono">
                        {row.grossSalary != null ? fmtAmt(row.grossSalary) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {row.previousIncreaseDate ? monthLabel(row.previousIncreaseDate) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {row.nextIncreaseMonth ? monthLabel(row.nextIncreaseMonth) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-green-700 font-mono whitespace-nowrap">
                        + {fmtAmt(row.increaseAmount)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-800 font-mono whitespace-nowrap">
                        {row.newGrossSalary != null ? fmtAmt(row.newGrossSalary) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap">
                        {monthLabel(row.applyMonth)}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400 max-w-[140px] truncate">
                        {row.reason || '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditTarget(row)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => requestDelete(row)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-5 py-3 bg-red-50 border-t border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3 — Filters & Export                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[110px]"
            >
              {currentYearOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Branch filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Branch
            </label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[140px]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export */}
        <button
          onClick={() => exportToExcel(displayRows, filterYear, filterBranch)}
          disabled={displayRows.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.employeeName}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
