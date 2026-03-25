'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/hooks/use-auth';
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

// ─── CSV Export ──────────────────────────────────────────────────────────────
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

// ─── Bonus Form Modal ─────────────────────────────────────────────────────────
interface BonusFormModalProps {
  employees: Employee[];
  monthRanges: MonthRange[];
  editRecord?: BonusRecord | null;
  onClose: () => void;
  onSave: (payload: CreateBonusPayload) => Promise<void>;
}

function BonusFormModal({ employees, monthRanges, editRecord, onClose, onSave }: BonusFormModalProps) {
  const [employeeId, setEmployeeId] = useState(editRecord?.employeeId || '');
  const [monthId, setMonthId] = useState(editRecord?.monthId || '');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{editRecord ? 'Edit Bonus Record' : 'Add Bonus Record'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!!editRecord}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-xs text-slate-500 mt-1">{selectedEmployee.branch} &middot; {selectedEmployee.category} &middot; {selectedEmployee.jobTitle}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select value={monthId} onChange={(e) => setMonthId(e.target.value)} disabled={!!editRecord}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">Select month...</option>
                {monthRanges.map((m) => (
                  <option key={m.id} value={m.id}>{m.monthName}</option>
                ))}
              </select>
            </div>
            {([
              { label: 'Saturday', value: saturday, set: setSaturday },
              { label: 'Duty', value: duty, set: setDuty },
              { label: 'Potty', value: potty, set: setPotty },
              { label: 'After School', value: afterSchool, set: setAfterSchool },
              { label: 'Transportation', value: transportation, set: setTransportation },
              { label: 'Extra Bonus', value: extraBonus, set: setExtraBonus },
            ] as const).map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label} (EGP)</label>
                <input type="number" min="0" value={value} onChange={(e) => (set as any)(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="text-sm font-semibold text-slate-700">
              Total: <span className="text-green-600 text-base">{total.toLocaleString()} EGP</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
    loadRecords();
  }, [selectedMonthId, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await bonusesService.getAll(selectedMonthId || undefined);
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
    } else {
      await bonusesService.create(payload);
      showToast('Bonus record added.', 'success');
    }
    setEditRecord(null);
    await loadRecords();
  }

  async function handleDelete(record: BonusRecord) {
    try {
      await bonusesService.delete(record.id);
      showToast('Record deleted.', 'success');
      await loadRecords();
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
      });
      showToast(result.message, 'success');
      await loadRecords();
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
      await loadRecords();
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    }
  }

  const filteredRecords = records.filter((r) => {
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bonuses</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage employee bonus records by month</p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <select value={selectedMonthId} onChange={(e) => setSelectedMonthId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Months</option>
              {monthRanges.map((m) => <option key={m.id} value={m.id}>{m.monthName}</option>)}
            </select>
            <button onClick={handleSyncSaturdays} disabled={syncing || !selectedMonthId}
              title={!selectedMonthId ? 'Select a month first' : 'Auto-sync Saturday bonuses for Helpers & Cleaners'}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Saturdays'}
            </button>
            <button onClick={() => exportCSV(filteredRecords, selectedMonthObj?.monthName || '')} disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button onClick={() => window.print()} disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export PDF
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
            <button onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Bonus
            </button>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Auto-calculation via &ldquo;Sync Saturdays&rdquo;: <strong>Helpers</strong> earn 200 EGP/Saturday day, <strong>Cleaners</strong> earn 100 EGP/Saturday day based on attendance records.</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {!admin && (
          <select value={selectedMonthId} onChange={(e) => setSelectedMonthId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Months</option>
            {monthRanges.map((m) => <option key={m.id} value={m.id}>{m.monthName}</option>)}
          </select>
        )}
        <input type="text" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]" />
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎁</div>
            <h3 className="text-slate-700 font-medium mb-1">No bonus records found</h3>
            <p className="text-slate-500 text-sm">{selectedMonthId ? 'No bonuses for this month yet.' : 'Select a month or add a new record.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Employee', 'Branch', 'Category', 'Month', 'Saturday', 'Duty', 'Potty', 'After School', 'Transport', 'Extra', 'Total'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                  {admin && <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.employeeName}</div>
                      <div className="text-xs text-slate-500">{r.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.monthName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.saturday ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.duty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.potty ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.afterSchool ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.transportation ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{(r.extraBonus ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{(r.total ?? 0).toLocaleString()}</td>
                    {admin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditRecord(r); setShowForm(true); }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                          <button onClick={() => setDeleteConfirm(r)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-semibold text-slate-700">Totals</td>
                  {(['saturday', 'duty', 'potty', 'afterSchool', 'transportation', 'extraBonus', 'total'] as const).map((field) => (
                    <td key={field} className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                      {filteredRecords.reduce((sum, r) => sum + (r[field] || 0), 0).toLocaleString()}
                    </td>
                  ))}
                  {admin && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <BonusFormModal
          employees={employees} monthRanges={monthRanges} editRecord={editRecord}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSave={handleSave}
        />
      )}
      {showImport && <ImportGuideModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Bonus Record?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Delete bonus record for <strong>{deleteConfirm.employeeName}</strong> ({deleteConfirm.monthName})?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
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
