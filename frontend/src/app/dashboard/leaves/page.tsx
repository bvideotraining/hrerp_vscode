'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import {
  leavesService, leaveBalanceService,
  LeaveRequest, LeaveBalance, LeaveType,
  CreateLeavePayload, LEAVE_TYPE_LABELS,
} from '@/lib/services/leaves.service';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/types/employee';
import {
  Plus, X, Check, XCircle, Trash2, Calendar, Clock, User,
  ShieldCheck, BarChart2, ChevronDown, ChevronUp, Save, Settings,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.ceil((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
  const classes: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${classes[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

// ─── Leave Request Form ────────────────────────────────────────────────────────

interface LeaveFormProps {
  onClose: () => void;
  onSaved: () => void;
  ownEmployeeId?: string;
  ownEmployeeName?: string;
  ownEmployeeBranch?: string;
  employees: Employee[];
}

function LeaveForm({ onClose, onSaved, ownEmployeeId, ownEmployeeName, ownEmployeeBranch, employees }: LeaveFormProps) {
  const [form, setForm] = useState({
    employeeId:    ownEmployeeId    || '',
    employeeName:  ownEmployeeName  || '',
    employeeBranch: ownEmployeeBranch || '',
    leaveType:     'annual' as LeaveType,
    startDate:     '',
    endDate:       '',
    reason:        '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const totalDays = daysBetween(form.startDate, form.endDate);

  async function handleSubmit() {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      setError('Please fill in all required fields.'); return;
    }
    if (totalDays <= 0) { setError('End date must be on or after start date.'); return; }
    setSaving(true); setError('');
    try {
      const payload: CreateLeavePayload = {
        employeeId:     form.employeeId,
        employeeName:   form.employeeName,
        employeeBranch: form.employeeBranch || undefined,
        leaveType:      form.leaveType,
        startDate:      form.startDate,
        endDate:        form.endDate,
        totalDays,
        reason:         form.reason || undefined,
      };
      await leavesService.create(payload);
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to submit request');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Request Leave</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Employee *</label>
            {ownEmployeeId ? (
              <input value={form.employeeName} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            ) : (
              <select
                value={form.employeeId}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value);
                  setForm((p) => ({ ...p, employeeId: e.target.value, employeeName: emp?.fullName || '', employeeBranch: emp?.branch || '' }));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select employee</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type *</label>
            <select value={form.leaveType} onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value as LeaveType }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date *</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {totalDays > 0 && <p className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">Total: <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong></p>}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Briefly describe the reason for your leave..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rejection Reason Modal ────────────────────────────────────────────────────

function RejectModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
        <h3 className="text-base font-bold text-slate-900 mb-3">Rejection Reason</h3>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          rows={3} placeholder="Optional reason for rejection..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Reject</button>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Requests Table ──────────────────────────────────────────────────────

interface LeaveTableProps {
  records: LeaveRequest[];
  showEmployee: boolean;
  canApprove: boolean;
  canDelete: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

function LeaveTable({ records, showEmployee, canApprove, canDelete, onApprove, onReject, onDelete }: LeaveTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
        <Calendar className="h-10 w-10 mb-3 opacity-40" />
        <p className="font-medium">No leave requests found</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {showEmployee && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dates</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {showEmployee && (
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.employeeName}</p>
                    {r.employeeBranch && <p className="text-xs text-slate-400">{r.employeeBranch}</p>}
                  </td>
                )}
                <td className="px-4 py-3 text-slate-700">{LEAVE_TYPE_LABELS[r.leaveType] || r.leaveType}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3 text-slate-400" />{r.startDate} – {r.endDate}</div>
                </td>
                <td className="px-4 py-3 text-center font-medium text-slate-700">{r.totalDays}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{r.reason || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={r.status} />
                  {r.status === 'rejected' && r.rejectedReason && <p className="text-xs text-red-500 mt-0.5">{r.rejectedReason}</p>}
                  {r.status === 'approved' && r.approvedBy && <p className="text-xs text-slate-400 mt-0.5">by {r.approvedBy}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {canApprove && r.status === 'pending' && (
                      <>
                        <button onClick={() => onApprove(r.id)} title="Approve" className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                        <button onClick={() => onReject(r.id)} title="Reject" className="p-1.5 rounded text-red-600 hover:bg-red-50"><XCircle className="h-4 w-4" /></button>
                      </>
                    )}
                    {canDelete && r.status === 'pending' && (
                      <button onClick={() => onDelete(r.id)} title="Cancel" className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Balance Row ───────────────────────────────────────────────────────────────

const BALANCE_TYPES: { key: keyof Omit<LeaveBalance, 'id' | 'employeeId' | 'employeeName' | 'year' | 'initialized' | 'unpaid'>; label: string }[] = [
  { key: 'annual',   label: 'Annual Leave' },
  { key: 'casual',   label: 'Casual Leave' },
  { key: 'sick',     label: 'Sick Leave' },
  { key: 'death',    label: 'Death Leave' },
  { key: 'maternity',label: 'Maternity Leave' },
];

interface BalanceEditRowProps {
  balance: LeaveBalance;
  canEdit: boolean;
  onSaved: () => void;
}

function BalanceEditRow({ balance, canEdit, onSaved }: BalanceEditRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      await leaveBalanceService.set(balance.employeeId, {
        employeeName: balance.employeeName,
        year: balance.year,
        ...edits,
      });
      setEdits({});
      onSaved();
    } catch (e: any) { setErr(e.message || 'Save failed');
    } finally { setSaving(false); }
  }

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-800">{balance.employeeName || balance.employeeId}</span>
          <span className="text-xs text-slate-400">{balance.year}</span>
        </div>
        <div className="flex items-center gap-4">
          {BALANCE_TYPES.map(({ key, label }) => {
            const entry = balance[key] as { allocated: number; used: number } | undefined;
            if (!entry) return null;
            const remaining = entry.allocated - entry.used;
            return (
              <span key={key} className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                <span className="font-medium">{remaining}</span>/<span>{entry.allocated}</span>
                <span className="text-slate-400">{label.split(' ')[0]}</span>
              </span>
            );
          })}
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
          {err && <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BALANCE_TYPES.map(({ key, label }) => {
              const entry = balance[key] as { allocated: number; used: number } | undefined;
              const allocated = edits[key] ?? entry?.allocated ?? 0;
              const used = entry?.used ?? 0;
              const remaining = allocated - used;
              return (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">Allocated:</span>
                    {canEdit ? (
                      <input
                        type="number" min={0} value={allocated}
                        onChange={(e) => setEdits((p) => ({ ...p, [key]: Number(e.target.value) }))}
                        className="w-16 px-2 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-800">{allocated}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Used: <strong>{used}</strong></p>
                  <p className={`text-xs font-semibold mt-1 ${remaining < 0 ? 'text-red-600' : remaining <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    Remaining: {remaining}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Unpaid leave */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="font-medium text-amber-700">Unpaid Leave Used:</span>
            <span className="font-bold text-amber-800">{balance.unpaid?.used ?? 0} day(s)</span>
            <span className="text-amber-600">— deducted from monthly salary</span>
          </div>

          {canEdit && hasEdits && (
            <div className="mt-3 flex justify-end">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Set All Balances Modal ──────────────────────────────────────────────────────

const DEFAULT_ALLOCATIONS: Record<string, number> = {
  annual: 21, casual: 7, sick: 10, death: 3, maternity: 90,
};

interface SetAllBalancesModalProps {
  employees: Employee[];
  year: number;
  onClose: () => void;
  onRefresh: () => void;
}

function SetAllBalancesModal({ employees, year: defaultYear, onClose, onRefresh }: SetAllBalancesModalProps) {
  const [targetYear, setTargetYear] = useState(defaultYear);
  const [allocations, setAllocations] = useState<Record<string, number>>({ ...DEFAULT_ALLOCATIONS });
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);

  async function handleApply() {
    if (!window.confirm(
      `This will set leave balances for all ${employees.length} employee(s) for ${targetYear}.\nExisting allocations will be overwritten. Continue?`
    )) return;

    setApplying(true); setErrs([]); setProgress(0);
    const failed: string[] = [];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        await leaveBalanceService.set(emp.id, {
          employeeName: emp.fullName,
          year: targetYear,
          ...allocations,
        });
      } catch (e: any) {
        failed.push(`${emp.fullName}: ${e.message || 'Failed'}`);
      }
      setProgress(i + 1);
    }
    setErrs(failed);
    setApplying(false);
    setDone(true);
    onRefresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Set Leave Balance for Year</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Apply allocations to all <strong>{employees.length}</strong> registered employee(s)
            </p>
          </div>
          <button onClick={onClose} disabled={applying} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Year picker */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1">Target Year</label>
          <input
            type="number" min={2020} max={2100} value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value))}
            disabled={applying || done}
            className="w-32 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Allocations grid */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Allocations (days)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BALANCE_TYPES.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  type="number" min={0} value={allocations[key] ?? 0}
                  onChange={(e) => setAllocations((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  disabled={applying || done}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {applying && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Applying...</span>
              <span>{progress} / {employees.length}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-200"
                style={{ width: `${employees.length > 0 ? (progress / employees.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {done && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            errs.length === 0
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            {errs.length === 0
              ? `✓ Leave balances set for all ${employees.length} employee(s).`
              : `Done with ${errs.length} error(s).`}
            {errs.length > 0 && (
              <ul className="mt-2 text-xs list-disc list-inside space-y-0.5">
                {errs.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={applying}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50">
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              onClick={handleApply}
              disabled={applying || employees.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50">
              <Save className="h-4 w-4" />
              {applying ? 'Applying...' : `Apply to All ${employees.length} Employees`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'requests' | 'approval' | 'balances';

function LeavesPageContent() {
  const { user, canDo } = useAuth();
  const role = user?.role || '';
  // isAdmin: explicit admin/hr_manager role, OR accessType='full' (Application Admin)
  const isAdmin       = role === 'admin' || role === 'hr_manager' || user?.accessType === 'full';
  // isAppAdmin: strictly Application Admin (accessType='full') — for bulk operations
  const isAppAdmin    = user?.accessType === 'full';
  const isApprover    = role === 'approver' || role === 'branch_approver';
  const canApproveAny = isAdmin || isApprover;
  // ownEmployeeId: the employee record linked to this user account (all roles)
  const ownEmployeeId    = user?.employeeId || '';
  // isOwnScope: standard employees — requests restricted to their own records
  const isOwnScope       = !isAdmin && !isApprover && !!ownEmployeeId;
  const scopedEmployeeId = isOwnScope ? ownEmployeeId : undefined;

  const [tab, setTab] = useState<Tab>('requests');
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [ownBalance, setOwnBalance] = useState<LeaveBalance | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ownEmployeeName, setOwnEmployeeName] = useState('');
  const [ownEmployeeBranch, setOwnEmployeeBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSetBalances, setShowSetBalances] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const canCreate = canDo('leaves', 'create');
  const year = new Date().getFullYear();

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leavesService.getAll(scopedEmployeeId || undefined);
      setRecords(data);
    } catch (e: any) { setActionError(e.message || 'Failed to load');
    } finally { setLoading(false); }
  }, [scopedEmployeeId]);

  const loadPending = useCallback(async () => {
    if (!canApproveAny) return;
    try {
      const data = await leavesService.getAll(undefined, 'pending');
      setPendingLeaves(data);
    } catch { /* silent */ }
  }, [canApproveAny]);

  const loadBalances = useCallback(async () => {
    if (isAdmin || isApprover) {
      // admin → all employees; approver → dept-scoped; branch_approver → branch-scoped
      // backend resolves the scope from the JWT role automatically
      try {
        const data = await leaveBalanceService.getAll(year);
        setBalances(data);
      } catch { /* silent */ }
    } else if (ownEmployeeId) {
      try {
        const data = await leaveBalanceService.getOne(ownEmployeeId, year);
        setOwnBalance(data);
      } catch { /* silent */ }
    }
  }, [isAdmin, isApprover, ownEmployeeId, year]);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { loadPending(); },  [loadPending]);
  useEffect(() => { loadBalances(); }, [loadBalances]);

  useEffect(() => {
    if (isAdmin) employeeService.getAllEmployees().then(setEmployees).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (ownEmployeeId) {
      employeeService.getEmployeeById(ownEmployeeId)
        .then((emp) => {
          setOwnEmployeeName(emp?.fullName || user?.name || '');
          setOwnEmployeeBranch(emp?.branch || '');
        })
        .catch(() => setOwnEmployeeName(user?.name || ''));
    }
  }, [ownEmployeeId, user?.name]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const flashMsg = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3000); };

  async function handleApprove(id: string) {
    try {
      await leavesService.update(id, { status: 'approved', approvedBy: user?.name || user?.email || 'Approver' });
      flashMsg('Leave approved.'); loadRequests(); loadPending(); loadBalances();
    } catch (e: any) { setActionError(e.message); }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    try {
      await leavesService.update(rejectTarget, { status: 'rejected', rejectedReason: reason });
      flashMsg('Leave rejected.'); loadRequests(); loadPending();
    } catch (e: any) { setActionError(e.message);
    } finally { setRejectTarget(null); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Cancel this leave request?')) return;
    try { await leavesService.remove(id); flashMsg('Request cancelled.'); loadRequests();
    } catch (e: any) { setActionError(e.message); }
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'requests', label: 'Leave Requests',  icon: <Calendar className="h-4 w-4" />, show: true },
    { id: 'approval', label: 'Pending Approval', icon: <ShieldCheck className="h-4 w-4" />, show: canApproveAny },
    { id: 'balances', label: 'Leave Balances',   icon: <BarChart2 className="h-4 w-4" />,  show: isAdmin || isApprover || !!ownEmployeeId },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isOwnScope ? 'Your personal leave requests and balance' : 'Manage employee leave requests and balances'}
          </p>
        </div>
        {canCreate && tab === 'requests' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> Request Leave
          </button>
        )}
      </div>

      {/* Alerts */}
      {statusMsg   && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">{statusMsg}</div>}
      {actionError && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between">
        <span>{actionError}</span>
        <button onClick={() => setActionError('')} className="ml-4 text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
      </div>}
      {isOwnScope && (
        <div className="mb-4 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <User className="h-3.5 w-3.5 shrink-0" />
          You can only view and manage your own leave requests.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}>
            {t.icon}
            {t.label}
            {t.id === 'approval' && pendingLeaves.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-semibold">
                {pendingLeaves.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Leave Requests ── */}
      {tab === 'requests' && (
        loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
        ) : (
          <LeaveTable
            records={records}
            showEmployee={!isOwnScope}
            canApprove={canApproveAny}
            canDelete={true}
            onApprove={handleApprove}
            onReject={(id) => setRejectTarget(id)}
            onDelete={handleDelete}
          />
        )
      )}

      {/* ── Tab: Pending Approval ── */}
      {tab === 'approval' && canApproveAny && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
            {role === 'branch_approver'
              ? 'Showing pending leaves for employees in your branch only.'
              : 'Showing all pending leave requests awaiting approval.'}
          </div>
          <LeaveTable
            records={pendingLeaves}
            showEmployee={true}
            canApprove={true}
            canDelete={false}
            onApprove={handleApprove}
            onReject={(id) => setRejectTarget(id)}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ── Tab: Leave Balances ── */}
      {tab === 'balances' && (
        <div>
          {isAdmin ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Annual leave balance for all employees — year <strong>{year}</strong>.
                  Click any row to view or edit allocations.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{balances.length} record(s)</span>
                  {isAppAdmin && (
                    <button
                      onClick={() => setShowSetBalances(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium">
                      <Settings className="h-3.5 w-3.5" />
                      Set Leave Balance for Year
                    </button>
                  )}
                </div>
              </div>
              {balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <BarChart2 className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">No balance records for {year}</p>
                  <p className="text-xs mt-1">Balances are initialized when an employee reaches 90 days of service.</p>
                </div>
              ) : (
                balances.map((b) => (
                  <BalanceEditRow key={b.id} balance={b} canEdit={true} onSaved={loadBalances} />
                ))
              )}
            </>
          ) : isApprover ? (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                {role === 'branch_approver'
                  ? `Showing leave balances for all employees in your branch — year ${year}.`
                  : `Showing leave balances for all employees in your department — year ${year}.`}
                <span className="ml-auto text-xs text-slate-400">{balances.length} record(s)</span>
              </div>
              {balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <BarChart2 className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">No balance records found</p>
                  <p className="text-xs mt-1">No employees in your {role === 'branch_approver' ? 'branch' : 'department'} have balance records yet.</p>
                </div>
              ) : (
                balances.map((b) => (
                  <BalanceEditRow key={b.id} balance={b} canEdit={false} onSaved={loadBalances} />
                ))
              )}
            </>
          ) : ownEmployeeId ? (
            <div>
              <p className="text-sm text-slate-600 mb-4">Your leave balance for <strong>{year}</strong>.</p>
              {!ownBalance ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <BarChart2 className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">No balance record yet</p>
                  <p className="text-xs mt-1">Your leave balance will appear after 90 days of service.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {BALANCE_TYPES.map(({ key, label }) => {
                      const entry = ownBalance[key] as { allocated: number; used: number } | undefined;
                      if (!entry) return null;
                      const remaining = entry.allocated - entry.used;
                      return (
                        <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
                          <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : remaining <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {remaining}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{entry.used} used / {entry.allocated} total</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="font-medium text-amber-700">Unpaid Leave:</span>
                    <span className="font-bold text-amber-800">{ownBalance.unpaid?.used ?? 0} day(s) used</span>
                    <span className="text-amber-600">— deducted from monthly salary</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Modals */}
      {showSetBalances && isAppAdmin && (
        <SetAllBalancesModal
          employees={employees}
          year={year}
          onClose={() => setShowSetBalances(false)}
          onRefresh={loadBalances}
        />
      )}
      {showForm && (
        <LeaveForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadRequests(); flashMsg('Leave request submitted!'); }}
          ownEmployeeId={isOwnScope ? ownEmployeeId : undefined}
          ownEmployeeName={isOwnScope ? ownEmployeeName : undefined}
          ownEmployeeBranch={isOwnScope ? ownEmployeeBranch : undefined}
          employees={employees}
        />
      )}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

export default function LeavesPage() {
  return (
    <ProtectedRoute moduleId="leaves">
      <DashboardLayout>
        <LeavesPageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
