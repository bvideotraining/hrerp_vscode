'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Lock,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { employeeService } from '@/lib/services/employee.service';
import { salaryIncreasesService } from '@/lib/services/salary-config.service';
import type { Employee } from '@/types/employee';
import type { SalaryIncrease, CreateSalaryIncreasePayload, UpdateSalaryIncreasePayload } from '@/types/salary-increases';

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

function dateLabel(d: string | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB');
}

function currentMonthValue(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function generateMonthOptions(yearsBack = 2, yearsForward = 3) {
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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  record,
  onConfirm,
  onCancel,
  busy,
}: {
  record: SalaryIncrease;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Delete Scheduled Increase</h3>
            <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Delete scheduled increase for <strong>{record.employeeName}</strong>{' '}
          ({record.applyMonth ? monthLabel(record.applyMonth) : '—'})?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  record,
  onSave,
  onCancel,
  saving,
}: {
  record: SalaryIncrease;
  onSave: (id: string, payload: UpdateSalaryIncreasePayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [increaseAmount, setIncreaseAmount] = useState(String(record.increaseAmount ?? ''));
  const [applyMonth, setApplyMonth] = useState(record.applyMonth ?? currentMonthValue());
  const [notes, setNotes] = useState(record.notes ?? '');
  const [nextIncreaseMonth, setNextIncreaseMonth] = useState(record.nextIncreaseMonth ?? '');

  async function handleSave() {
    const amt = parseFloat(increaseAmount);
    if (isNaN(amt) || amt < 0) return;
    await onSave(record.id, {
      increaseAmount: amt,
      applyMonth,
      notes: notes.trim() || undefined,
      nextIncreaseMonth: nextIncreaseMonth || undefined,
      newGrossSalary: (record.basicSalary ?? 0) + amt,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Edit Scheduled Increase</h2>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Employee info (read-only) */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Employee</p>
            <p className="text-sm font-semibold text-slate-900">{record.employeeName}</p>
            <p className="text-xs text-slate-500">{record.employeeCode}{record.branch ? ` · ${record.branch}` : ''}</p>
          </div>

          {/* Increase Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Increase Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={increaseAmount}
              onChange={(e) => setIncreaseAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="0.00"
            />
            {record.basicSalary != null && increaseAmount && !isNaN(parseFloat(increaseAmount)) && (
              <p className="text-xs text-indigo-600 mt-1">
                New Gross = {fmtAmt((record.basicSalary ?? 0) + parseFloat(increaseAmount))}
              </p>
            )}
          </div>

          {/* Apply Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Apply Month <span className="text-red-500">*</span>
            </label>
            <select
              value={applyMonth}
              onChange={(e) => setApplyMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Next Increase Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Next Increase Month <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <select
              value={nextIncreaseMonth}
              onChange={(e) => setNextIncreaseMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Not set —</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !increaseAmount || isNaN(parseFloat(increaseAmount)) || parseFloat(increaseAmount) < 0}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function SalaryIncreaseScheduleSection() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);

  // ── Data ──────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [records, setRecords] = useState<SalaryIncrease[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Form state ────────────────────────────────────────────────────────
  const [formEmployee, setFormEmployee] = useState<Employee | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formMonth, setFormMonth] = useState(currentMonthValue());
  const [formNextMonth, setFormNextMonth] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Filter state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'applied'>('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  // ── Modal state ───────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<SalaryIncrease | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryIncrease | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // ── Status toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function showToast(text: string, kind: 'success' | 'error' = 'success') {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await salaryIncreasesService.getAll();
      setRecords(data as SalaryIncrease[]);
    } catch (e: any) {
      showToast(e.message || 'Failed to load records', 'error');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    employeeService
      .getAllEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Employee select handler ───────────────────────────────────────────

  function handleEmployeeSelect(empId: string) {
    const emp = employees.find((e) => e.id === empId) ?? null;
    setFormEmployee(emp);
  }

  // ── Schedule increase ─────────────────────────────────────────────────

  async function handleSchedule() {
    if (!formEmployee) { setFormError('Please select an employee.'); return; }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) { setFormError('Increase amount must be greater than 0.'); return; }
    if (!formMonth) { setFormError('Please select an apply month.'); return; }

    setFormError('');
    setScheduling(true);
    try {
      const payload: CreateSalaryIncreasePayload = {
        employeeId: formEmployee.id,
        employeeCode: formEmployee.employeeCode,
        employeeName: formEmployee.fullName,
        department: formEmployee.department || '',
        branch: formEmployee.branch || '',
        jobTitle: formEmployee.jobTitle || '',
        hiringDate: formEmployee.startDate || '',
        basicSalary: formEmployee.currentSalary ?? 0,
        grossSalary: formEmployee.currentSalary ?? 0,
        increaseAmount: amt,
        newGrossSalary: (formEmployee.currentSalary ?? 0) + amt,
        applyMonth: formMonth,
        nextIncreaseMonth: formNextMonth || undefined,
        notes: formNotes.trim() || undefined,
        status: 'pending',
        effectiveDate: `${formMonth}-01`,
      };
      await salaryIncreasesService.create(payload);
      showToast(`Salary increase scheduled for ${formEmployee.fullName} — ${monthLabel(formMonth)}`);
      // Reset form
      setFormEmployee(null);
      setFormAmount('');
      setFormMonth(currentMonthValue());
      setFormNextMonth('');
      setFormNotes('');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to schedule increase', 'error');
    } finally {
      setScheduling(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────

  async function handleEdit(id: string, payload: UpdateSalaryIncreasePayload) {
    setEditSaving(true);
    try {
      await salaryIncreasesService.update(id, payload);
      showToast('Changes saved successfully');
      setEditTarget(null);
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to save changes', 'error');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleteBusy(true);
    try {
      await salaryIncreasesService.remove(id);
      showToast('Deleted successfully');
      setDeleteTarget(null);
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────

  async function handleApply(record: SalaryIncrease) {
    setApplyingId(record.id);
    try {
      await salaryIncreasesService.apply(record.id);
      showToast(
        `Increase applied for ${record.employeeName} — ${record.applyMonth ? monthLabel(record.applyMonth) : ''}. Salary config updated.`,
      );
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to apply increase', 'error');
    } finally {
      setApplyingId(null);
    }
  }

  // ── Filtered & sorted records ─────────────────────────────────────────

  const filtered = records
    .filter((r) => {
      if (filterStatus !== 'all' && (r.status ?? 'pending') !== filterStatus) return false;
      if (filterMonth && r.applyMonth !== filterMonth) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.employeeName.toLowerCase().includes(q) &&
          !r.employeeCode.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ma = a.applyMonth ?? '';
      const mb = b.applyMonth ?? '';
      return sortDesc ? mb.localeCompare(ma) : ma.localeCompare(mb);
    });

  // ── Computed form preview ─────────────────────────────────────────────
  const formAmtNum = parseFloat(formAmount) || 0;
  const formGross = (formEmployee?.currentSalary ?? 0) + formAmtNum;

  // ─────────────────────────────────────────────────────────────────────

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Lock className="h-16 w-16 text-slate-200" />
        <p className="text-lg font-semibold text-slate-500">Access Restricted</p>
        <p className="text-sm text-center max-w-xs">Only Application Admins can manage salary increase schedules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Modals ── */}
      {editTarget && (
        <EditModal
          record={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
          saving={editSaving}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          record={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
            toast.kind === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.kind === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══ SCHEDULE FORM ══════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Schedule Salary Increase</h3>
        </div>

        <div className="px-5 py-5">
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Employee */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Employee <span className="text-red-500">*</span>
              </label>
              {empLoading ? (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <div className="relative">
                  <select
                    value={formEmployee?.id ?? ''}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none pr-8"
                  >
                    <option value="">— Select employee —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              )}
              {/* Employee detail chip */}
              {formEmployee && (
                <p className="text-xs text-slate-500 mt-1">
                  {formEmployee.branch ? `${formEmployee.branch} · ` : ''}{formEmployee.jobTitle || ''}
                  {formEmployee.currentSalary != null ? ` · Basic: ${fmtAmt(formEmployee.currentSalary)}` : ''}
                </p>
              )}
            </div>

            {/* Increase Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Increase Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {formEmployee && formAmtNum > 0 && (
                <p className="text-xs text-indigo-600 mt-1">New Gross: {fmtAmt(formGross)}</p>
              )}
            </div>

            {/* Apply Month */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Apply Month <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none pr-8"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Next Increase Month */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Next Increase Month <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={formNextMonth}
                  onChange={(e) => setFormNextMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none pr-8"
                >
                  <option value="">— Not set —</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notes + Submit */}
          <div className="flex items-start gap-4 mt-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Reason or internal note…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="pt-6">
              <button
                onClick={handleSchedule}
                disabled={scheduling || !formEmployee || !formAmount || parseFloat(formAmount) <= 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {scheduling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {scheduling ? 'Scheduling…' : 'Schedule Increase'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TABLE ══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* Table header / filters */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Scheduled Increases
            {filtered.length > 0 && (
              <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{filtered.length}</span>
            )}
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-44"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'applied')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
            </select>

            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Sort */}
            <button
              onClick={() => setSortDesc((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              title={sortDesc ? 'Newest first' : 'Oldest first'}
            >
              {sortDesc ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {sortDesc ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hiring Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Job Title</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Basic Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Increase Amt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap">Gross Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Increase</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Next Increase</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Apply Month</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 12 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <User className="h-10 w-10 text-slate-200" />
                      <p className="font-medium text-sm">No salary increase schedules found</p>
                      {filtered.length === 0 && records.length > 0 && (
                        <p className="text-xs text-slate-300">Try clearing your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const basicSalary = r.basicSalary ?? 0;
                  const increaseAmt = r.increaseAmount ?? 0;
                  const grossSalary = basicSalary + increaseAmt;
                  const status = r.status ?? 'pending';
                  const isApplying = applyingId === r.id;

                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-slate-500 whitespace-nowrap">{r.employeeCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{r.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{dateLabel(r.hiringDate)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {r.branch || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {r.jobTitle || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700 whitespace-nowrap">
                        {fmtAmt(basicSalary)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700 whitespace-nowrap">
                        +{fmtAmt(increaseAmt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700 whitespace-nowrap">
                        {fmtAmt(grossSalary)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {r.previousIncreaseDate ? monthLabel(r.previousIncreaseDate) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {r.nextIncreaseMonth ? monthLabel(r.nextIncreaseMonth) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        {r.applyMonth ? monthLabel(r.applyMonth) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {status === 'applied' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Applied
                            </span>
                          ) : (
                            <>
                              {/* Apply button */}
                              <button
                                onClick={() => handleApply(r)}
                                disabled={isApplying}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                                title="Apply this increase to salary config"
                              >
                                {isApplying ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {isApplying ? '…' : 'Apply'}
                              </button>
                              {/* Edit */}
                              <button
                                onClick={() => setEditTarget(r)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => setDeleteTarget(r)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
