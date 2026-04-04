'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { bonusesService, BonusRecord, CreateBonusPayload } from '@/lib/services/bonuses.service';
import { organizationService, MonthRange } from '@/lib/services/organization.service';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/types/employee';

const CATEGORIES = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];

function isAdmin(user: any): boolean {
  const ADMIN_ROLES = ['admin', 'hr_manager'];
  return ADMIN_ROLES.includes(user?.role) || user?.accessType === 'full';
}

function computeTotal(b: Partial<CreateBonusPayload>): number {
  return (
    (b.saturday || 0) +
    (b.duty || 0) +
    (b.potty || 0) +
    (b.afterSchool || 0) +
    (b.transportation || 0) +
    (b.extraBonus || 0)
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────
function exportCSV(records: BonusRecord[], monthName: string) {
  const headers = ['Employee', 'Code', 'Branch', 'Category', 'Month', 'Saturday', 'Duty', 'Potty', 'After School', 'Transportation', 'Extra', 'Total', 'Notes'];
  const rows = records.map((r) => [
    r.employeeName, r.employeeCode, r.branch, r.category, r.monthName,
    r.saturday, r.duty, r.potty, r.afterSchool, r.transportation, r.extraBonus, r.total, r.notes,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bonuses_${monthName || 'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportExcel(records: BonusRecord[], monthName: string) {
  const data = records.map((r) => ({
    Employee: r.employeeName,
    Code: r.employeeCode,
    Branch: r.branch,
    Category: r.category,
    Month: r.monthName,
    'Saturday (EGP)': r.saturday ?? 0,
    'Duty (EGP)': r.duty ?? 0,
    'Potty (EGP)': r.potty ?? 0,
    'After School (EGP)': r.afterSchool ?? 0,
    'Transportation (EGP)': r.transportation ?? 0,
    'Extra Bonus (EGP)': r.extraBonus ?? 0,
    'Total (EGP)': r.total ?? 0,
    Notes: r.notes ?? '',
  }));
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bonuses');
  XLSX.writeFile(wb, `bonuses_${monthName || 'all'}.xlsx`);
}

// ─── Bonus Form Modal ─────────────────────────────────────────────────────────
interface BonusFormModalProps {
  employees: Employee[];
  monthRanges: MonthRange[];
  editRecord?: BonusRecord | null;
  defaultMonthId?: string;
  onClose: () => void;
  onSave: (payload: CreateBonusPayload) => Promise<void>;
}

function BonusFormModal({ employees, monthRanges, editRecord, defaultMonthId, onClose, onSave }: BonusFormModalProps) {
  const [employeeId, setEmployeeId] = useState(editRecord?.employeeId || '');
  const [monthId, setMonthId] = useState(editRecord?.monthId || defaultMonthId || '');
  const [saturday, setSaturday] = useState(String(editRecord?.saturday ?? 0));
  const [duty, setDuty] = useState(String(editRecord?.duty ?? 0));
  const [potty, setPotty] = useState(String(editRecord?.potty ?? 0));
  const [afterSchool, setAfterSchool] = useState(String(editRecord?.afterSchool ?? 0));
  const [transportation, setTransportation] = useState(String(editRecord?.transportation ?? 0));
  const [extraBonus, setExtraBonus] = useState(String(editRecord?.extraBonus ?? 0));
  const [notes, setNotes] = useState(editRecord?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const selectedMonth = monthRanges.find((m) => m.id === monthId);
  const total = computeTotal({
    saturday: Number(saturday), duty: Number(duty), potty: Number(potty),
    afterSchool: Number(afterSchool), transportation: Number(transportation), extraBonus: Number(extraBonus),
  });

  function handleRecalculate() {
    // Reset to zero — user can re-enter or trigger sync
    setSaturday('0'); setDuty('0'); setPotty('0');
    setAfterSchool('0'); setTransportation('0'); setExtraBonus('0');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !monthId) { setError('Employee and month are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        employeeId,
        employeeName: selectedEmployee?.fullName || editRecord?.employeeName || '',
        employeeCode: selectedEmployee?.employeeCode || editRecord?.employeeCode || '',
        branch: selectedEmployee?.branch || editRecord?.branch || '',
        category: selectedEmployee?.category || editRecord?.category || '',
        monthId,
        monthName: selectedMonth?.monthName || editRecord?.monthName || '',
        saturday: Number(saturday), duty: Number(duty), potty: Number(potty),
        afterSchool: Number(afterSchool), transportation: Number(transportation),
        extraBonus: Number(extraBonus), notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save bonus record.');
    } finally {
      setSaving(false);
    }
  }

  const fields: { label: string; value: string; set: (v: string) => void }[] = [
    { label: 'Saturday Shift', value: saturday, set: setSaturday },
    { label: 'Duty Allowance', value: duty, set: setDuty },
    { label: 'Potty Training', value: potty, set: setPotty },
    { label: 'After School', value: afterSchool, set: setAfterSchool },
    { label: 'Transportation', value: transportation, set: setTransportation },
    { label: 'Extra Bonus', value: extraBonus, set: setExtraBonus },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Dark header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 rounded-t-xl flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {editRecord ? 'Edit Bonus Entry' : 'New Bonus Entry'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-4 flex-1">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
            )}

            {/* Employee */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!!editRecord}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 bg-white"
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedEmployee.branch} &middot; {selectedEmployee.category} &middot; {selectedEmployee.jobTitle}
                </p>
              )}
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
              <select
                value={monthId}
                onChange={(e) => setMonthId(e.target.value)}
                disabled={!!editRecord}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 bg-white"
              >
                <option value="">Select a month...</option>
                {monthRanges.map((m) => (
                  <option key={m.id} value={m.id}>{m.monthName}</option>
                ))}
              </select>
            </div>

            {/* COMPONENTS divider */}
            <div className="flex items-center justify-between border-t border-b border-slate-200 bg-slate-50 -mx-6 px-6 py-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Components</span>
              <button
                type="button"
                onClick={handleRecalculate}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recalculate
              </button>
            </div>

            {/* 2-column EGP input grid */}
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <span className="px-2.5 py-2 bg-slate-100 text-slate-500 text-xs font-medium border-r border-slate-300 flex items-center select-none">
                      EGP
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white text-slate-900 min-w-0"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Excellent performance"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Total Bonus bar */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Total Bonus</span>
              <span className="text-base font-bold text-blue-600">EGP {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Import Guide Modal ───────────────────────────────────────────────────────
function ImportGuideModal({ onClose, onImport }: { onClose: () => void; onImport: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const columns = [
    { col: 'employeeId', desc: 'Employee ID (from system)', example: 'abc123' },
    { col: 'employeeName', desc: 'Full name', example: 'Ahmed Ali' },
    { col: 'employeeCode', desc: 'Employee number', example: 'EMP001' },
    { col: 'branch', desc: 'Branch name', example: 'Cairo' },
    { col: 'category', desc: 'WhiteCollar / BlueCollar / Management / PartTime', example: 'BlueCollar' },
    { col: 'monthId', desc: 'Month ID from system', example: 'month_01' },
    { col: 'monthName', desc: 'Display name for month', example: 'January 2025' },
    { col: 'saturday', desc: 'Saturday bonus (EGP)', example: '400' },
    { col: 'duty', desc: 'Duty bonus (EGP)', example: '100' },
    { col: 'potty', desc: 'Potty bonus (EGP)', example: '50' },
    { col: 'afterSchool', desc: 'After school bonus (EGP)', example: '75' },
    { col: 'transportation', desc: 'Transportation (EGP)', example: '200' },
    { col: 'extraBonus', desc: 'Extra bonus (EGP)', example: '0' },
    { col: 'notes', desc: 'Optional notes', example: '' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import Bonuses (CSV)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Upload a CSV file with the following columns (header row required):</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">Column</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">Description</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">Example</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((c, i) => (
                  <tr key={c.col} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-1.5 font-mono text-blue-700">{c.col}</td>
                    <td className="px-3 py-1.5 text-slate-600">{c.desc}</td>
                    <td className="px-3 py-1.5 text-slate-500">{c.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-2">
            <input type="file" accept=".csv" ref={fileRef} className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) { onImport(e.target.files[0]); onClose(); } }} />
            <button onClick={() => fileRef.current?.click()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Choose CSV File</button>
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────
function BonusesContent() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  // Standard employees (non-admin) can only view their own bonuses
  const isEmployee = !admin;

  const [monthRanges, setMonthRanges] = useState<MonthRange[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<BonusRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<BonusRecord | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // Incrementing this counter forces the records useEffect to re-run after
  // any write (create / update / delete / import) without any race conditions.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      organizationService.getMonthRanges(),
      employeeService.getAllEmployees(),
      organizationService.getBranches(),
    ])
      .then(([months, emps, branchList]) => {
        setMonthRanges(months);
        setEmployees(emps);
        setBranches(branchList.map((b: any) => b.name));
      })
      .catch((err) => showToast(err.message || 'Failed to load reference data', 'error'));
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadRecords(selectedMonthId);
  }, [selectedMonthId, mounted, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadRecords(monthId: string) {
    setLoading(true);
    try {
      const data = await bonusesService.getAll(monthId || undefined);
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload: CreateBonusPayload) {
    if (editRecord) {
      await bonusesService.update(editRecord.id, payload);
      showToast('Bonus record updated.', 'success');
      setEditRecord(null);
      // React 18 batches both updates → one render → effect fires once
      setReloadKey((k) => k + 1);
    } else {
      await bonusesService.create(payload);
      showToast('Bonus record added.', 'success');
      setEditRecord(null);
      // Switch the month selector to the saved month so the new record is visible.
      // setReloadKey guarantees the effect fires even if the month was already selected.
      // React 18 batches both setState calls → single render → effect fires once.
      setSelectedMonthId(payload.monthId);
      setReloadKey((k) => k + 1);
    }
  }

  async function handleDelete(record: BonusRecord) {
    try {
      await bonusesService.delete(record.id);
      showToast('Record deleted.', 'success');
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  }

  async function handleSyncSaturdays() {
    const month = monthRanges.find((m) => m.id === selectedMonthId);
    if (!month) { showToast('Please select a month first.', 'error'); return; }
    setSyncing(true);
    try {
      const result = await bonusesService.syncSaturdays({
        monthId: month.id!,
        startDate: month.startDate,
        endDate: month.endDate,
        monthName: month.monthName,
      });
      showToast(result.message, 'success');
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { showToast('CSV file is empty or has no data rows.', 'error'); return; }
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
      let imported = 0;
      for (const row of lines.slice(1)) {
        const values = row.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        if (!obj.employeeId || !obj.monthId) continue;
        await bonusesService.create({
          employeeId: obj.employeeId,
          employeeName: obj.employeeName || '',
          employeeCode: obj.employeeCode || '',
          branch: obj.branch || '',
          category: obj.category || '',
          monthId: obj.monthId,
          monthName: obj.monthName || '',
          saturday: Number(obj.saturday) || 0,
          duty: Number(obj.duty) || 0,
          potty: Number(obj.potty) || 0,
          afterSchool: Number(obj.afterSchool) || 0,
          transportation: Number(obj.transportation) || 0,
          extraBonus: Number(obj.extraBonus) || 0,
          notes: obj.notes || '',
        });
        imported += 1;
      }
      showToast(`Imported ${imported} record(s) successfully.`, 'success');
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    }
  }

  const filteredRecords = records.filter((r) => {
    // Employees can only see their own records
    if (isEmployee && r.employeeId !== user?.employeeId) return false;
    if (filterBranch && r.branch !== filterBranch) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.employeeName?.toLowerCase().includes(q) || r.employeeCode?.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedMonthObj = monthRanges.find((m) => m.id === selectedMonthId);

  if (!mounted) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonus Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage extra incentives and shift bonuses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`px-2.5 py-2 ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`px-2.5 py-2 border-l border-slate-300 ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          {/* Month selector */}
          <select
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Months</option>
            {monthRanges.map((m) => <option key={m.id} value={m.id}>{m.monthName}</option>)}
          </select>

          {/* Add Bonus — admin/hr only */}
          {admin && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Bonus
            </button>
          )}

          {/* Sync Saturdays — admin/hr only */}
          {admin && (
            <button
              onClick={handleSyncSaturdays}
              disabled={syncing || !selectedMonthId}
              title={!selectedMonthId ? 'Select a month first' : 'Auto-calculate Saturday bonuses from attendance (Helper=200 EGP/day, Cleaner=100 EGP/day)'}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Saturdays'}
            </button>
          )}

          {admin && (
            <>
              {/* Export dropdown */}
              <div className="relative group">
                <button
                  disabled={filteredRecords.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {filteredRecords.length > 0 && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 hidden group-hover:block">
                    <button
                      onClick={() => exportExcel(filteredRecords, selectedMonthObj?.monthName || '')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                    >
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      Export Excel
                    </button>
                    <button
                      onClick={() => exportCSV(filteredRecords, selectedMonthObj?.monthName || '')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Import */}
              {user?.accessType === 'full' && (
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Info banner — admin/hr only ──────────────────────────────── */}
      {!isEmployee && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Auto-Calculation Active:</strong> Saturday bonuses for{' '}
            <span className="font-semibold text-blue-700">Helpers (200 EGP/day)</span> and{' '}
            <span className="font-semibold text-blue-700">Cleaners (100 EGP/day)</span> are automatically calculated.
          </span>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {!isEmployee && (
          <>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        <span className="text-sm text-slate-500 ml-auto whitespace-nowrap">
          {filteredRecords.length} {filteredRecords.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-500 text-sm shadow-sm">
          Loading records...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="text-5xl mb-3">🎁</div>
          <h3 className="text-slate-700 font-semibold mb-1">No bonus records found</h3>
          <p className="text-slate-500 text-sm">
            {selectedMonthId ? 'No bonuses recorded for this month yet.' : 'Select a month or add a new record.'}
          </p>
          {admin && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Record
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecords.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{r.employeeName}</div>
                  <div className="text-xs text-slate-500">{r.employeeCode} &middot; {r.branch}</div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium whitespace-nowrap">{r.monthName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {([
                  { label: 'Saturday', value: r.saturday },
                  { label: 'Duty', value: r.duty },
                  { label: 'Potty', value: r.potty },
                  { label: 'After School', value: r.afterSchool },
                  { label: 'Transport', value: r.transportation },
                  { label: 'Extra', value: r.extraBonus },
                ] as { label: string; value: number | undefined }[]).map(({ label, value }) => (
                  <div key={label} className="flex justify-between bg-slate-50 rounded px-2 py-1">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-700">{(value ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-xs text-slate-500">Total</span>
                <span className="font-bold text-blue-600 text-sm">EGP {(r.total ?? 0).toLocaleString()}</span>
              </div>
              {admin && (
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => { setEditRecord(r); setShowForm(true); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(r)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── List / Table View ── */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saturday</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Potty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">After School</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Extra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  {admin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{r.employeeName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.employeeCode} &middot; {r.branch}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 tabular-nums">EGP {(r.saturday ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-slate-600 tabular-nums">EGP {(r.duty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-slate-600 tabular-nums">EGP {(r.potty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-slate-600 tabular-nums">EGP {(r.afterSchool ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-slate-600 tabular-nums">EGP {((r.extraBonus ?? 0) + (r.transportation ?? 0)).toLocaleString()}</td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <span className="font-bold text-blue-600">EGP {(r.total ?? 0).toLocaleString()}</span>
                    </td>
                    {admin && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditRecord(r); setShowForm(true); }}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(r)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Totals</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.saturday || 0), 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.duty || 0), 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.potty || 0), 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.afterSchool || 0), 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.extraBonus || 0) + (r.transportation || 0), 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-blue-600 tabular-nums">EGP {filteredRecords.reduce((s, r) => s + (r.total || 0), 0).toLocaleString()}</td>
                  {admin && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showForm && (
        <BonusFormModal
          employees={employees}
          monthRanges={monthRanges}
          editRecord={editRecord}
          defaultMonthId={selectedMonthId}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSave={handleSave}
        />
      )}
      {showImport && <ImportGuideModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Bonus Record?</h3>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete the bonus record for{' '}
              <strong>{deleteConfirm.employeeName}</strong> ({deleteConfirm.monthName}).
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BonusesPage() {
  return (
    <ProtectedRoute moduleId="bonuses">
      <DashboardLayout>
        <BonusesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
