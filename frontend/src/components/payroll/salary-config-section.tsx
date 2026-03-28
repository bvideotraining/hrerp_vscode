'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Search,
  Plus,
  Trash2,
  Download,
  Edit2,
  AlertTriangle,
  CheckCircle,
  X,
  TrendingUp,
  Minus,
  Lock,
  User,
  Banknote,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { employeeService } from '@/lib/services/employee.service';
import { useSalaryConfig, calcDerived } from '@/hooks/use-salary-config';
import type { Employee } from '@/types/employee';
import type { SalaryLineItem, SalaryConfig } from '@/types/salary-config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === 'manual') return null;
  const map: Record<string, string> = {
    bonuses: 'bg-emerald-100 text-emerald-700',
    social_insurance: 'bg-blue-100 text-blue-700',
    medical_insurance: 'bg-purple-100 text-purple-700',
    salary_increases: 'bg-amber-100 text-amber-700',
    cash_advance: 'bg-orange-100 text-orange-700',
    attendance: 'bg-slate-100 text-slate-600',
    leave: 'bg-rose-100 text-rose-700',
  };
  const cls = map[source] ?? 'bg-slate-100 text-slate-600';
  const lbl = source.replace(/_/g, ' ');
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls} shrink-0 ml-1.5`}>
      {lbl}
    </span>
  );
}

// ─── LineItemEditor ───────────────────────────────────────────────────────────

interface LineItemEditorProps {
  items: SalaryLineItem[];
  onChange: (items: SalaryLineItem[]) => void;
  disabled?: boolean;
  /** Handler for the Import button — if omitted, Import button is hidden */
  onImport?: () => void;
  importLabel?: string;
  importing?: boolean;
  emptyText?: string;
}

function LineItemEditor({
  items,
  onChange,
  disabled,
  onImport,
  importLabel,
  importing,
  emptyText,
}: LineItemEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addError, setAddError] = useState('');

  function saveItem() {
    const name = addName.trim();
    const amount = parseFloat(addAmount);
    if (!name) { setAddError('Name is required'); return; }
    if (isNaN(amount) || amount < 0) { setAddError('Amount must be ≥ 0'); return; }
    setAddError('');
    onChange([...items, { name, amount, source: 'manual' }]);
    setAddName('');
    setAddAmount('');
    setShowAdd(false);
  }

  function cancelAdd() {
    setShowAdd(false);
    setAddError('');
    setAddName('');
    setAddAmount('');
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function updateAmount(idx: number, raw: string) {
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0) {
      const updated = [...items];
      updated[idx] = { ...updated[idx], amount: v };
      onChange(updated);
    }
  }

  return (
    <div className="space-y-2">
      {/* ── Action buttons row (Import + Add) ────────────────────────────── */}
      {!disabled && (
        <div className="flex items-center gap-2 flex-wrap">
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {importing ? 'Importing…' : (importLabel ?? 'Import')}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setShowAdd((v) => !v); setAddError(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      )}

      {/* ── Inline add form ───────────────────────────────────────────────── */}
      {showAdd && !disabled && (
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              autoFocus
              placeholder="Item name…"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveItem();
                if (e.key === 'Escape') cancelAdd();
              }}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {addError && <p className="text-xs text-red-500 mt-0.5">{addError}</p>}
          </div>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveItem();
              if (e.key === 'Escape') cancelAdd();
            }}
            className="w-24 px-2 py-1.5 text-sm border border-slate-200 rounded bg-white text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
          />
          <button
            type="button"
            onClick={saveItem}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-500 transition-colors shrink-0"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelAdd}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Items list ────────────────────────────────────────────────────── */}
      {items.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400 text-center py-6 italic">
          {emptyText ?? 'No items added'}
        </p>
      ) : (
        <div className="space-y-0.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0 group"
            >
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-sm text-slate-700 truncate">{item.name}</span>
                <SourceBadge source={item.source} />
              </div>
              <input
                type="number"
                min={0}
                step={0.01}
                disabled={disabled}
                value={item.amount}
                onChange={(e) => updateAmount(idx, e.target.value)}
                className="w-24 px-2 py-1 text-right text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-transparent disabled:border-transparent"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DeleteConfirm modal ──────────────────────────────────────────────────────

function DeleteConfirm({
  label,
  onConfirm,
  onCancel,
  busy,
}: {
  label: string;
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
            <h3 className="font-semibold text-slate-900">Delete Salary Config</h3>
            <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-5">
          Delete config for <strong>{label}</strong>?
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

// ─── HistoryTable ─────────────────────────────────────────────────────────────

interface HistoryTableProps {
  records: SalaryConfig[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onEdit: (cfg: SalaryConfig) => void;
  onDelete: (id: string, month: string, label: string) => void;
  isAdmin: boolean;
}

function SkeletonHistoryRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 bg-slate-200 rounded animate-pulse"
            style={{ width: i === 0 ? '70%' : '50%' }}
          />
        </td>
      ))}
    </tr>
  );
}

function HistoryTable({
  records,
  loading,
  search,
  onSearchChange,
  onEdit,
  onDelete,
  isAdmin,
}: HistoryTableProps) {
  const filtered = search
    ? records.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          r.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
          r.month.includes(search),
      )
    : records;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-900">Salary Configurations History</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter history…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Emp Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Emp Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Month
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Basic Salary
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Increase
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Gross Salary
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Bonus Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-600 uppercase tracking-wider">
                Deduction Items
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-900 uppercase tracking-wider whitespace-nowrap">
                Total Salary
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonHistoryRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Banknote className="h-10 w-10 text-slate-200" />
                    <p className="font-medium text-sm">No salary configurations found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((cfg) => {
                const allowanceText =
                  (cfg.allowances || [])
                    .map((a) => `${a.name}: ${fmtAmt(a.amount)}`)
                    .join(', ') || '—';
                const deductionText =
                  (cfg.deductions || [])
                    .map((d) => `${d.name}: ${fmtAmt(d.amount)}`)
                    .join(', ') || '—';
                return (
                  <tr key={cfg.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{cfg.employeeCode}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {cfg.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {cfg.month === '—' || !cfg.month ? '—' : monthLabel(cfg.month)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">
                      {fmtAmt(cfg.basicSalary)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {(cfg.increaseAmount ?? 0) > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          +{fmtAmt(cfg.increaseAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">
                      {fmtAmt(cfg.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-xs text-blue-700 max-w-[220px] truncate" title={allowanceText}>
                      {allowanceText}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-700 max-w-[220px] truncate" title={deductionText}>
                      {deductionText}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                      {fmtAmt(cfg.totalSalary)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEdit(cfg)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              onDelete(
                                cfg.id,
                                cfg.month,
                                `${cfg.employeeName} (${cfg.month === '—' ? '—' : monthLabel(cfg.month)})`,
                              )
                            }
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function SalaryConfigSection() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    month: string;
    label: string;
  } | null>(null);

  const sc = useSalaryConfig();

  // ─── Load employees once ──────────────────────────────────────────────────
  useEffect(() => {
    employeeService
      .getAllEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  // ─── Load history on month change ─────────────────────────────────────────
  useEffect(() => {
    sc.loadHistory(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // ─── Select employee ───────────────────────────────────────────────────────
  const handleEmployeeClick = useCallback(
    (emp: Employee) => {
      setSelectedEmployeeId(emp.id);
      sc.selectEmployee(
        emp.id,
        emp.employeeCode,
        emp.fullName,
        emp.department || '',
        emp.branch || '',
        selectedMonth,
      );
    },
    [sc, selectedMonth],
  );

  // ─── Derived calculations (real-time) ────────────────────────────────────
  const derived = sc.editor
    ? calcDerived(
        sc.editor.basicSalary,
        sc.editor.increaseAmount,
        sc.editor.allowances,
        sc.editor.deductions,
      )
    : null;

  // ─── Filtered employees ────────────────────────────────────────────────────
  const filteredEmployees = empSearch
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
          e.employeeCode?.toLowerCase().includes(empSearch.toLowerCase()),
      )
    : employees;

  // ─── Access denied ────────────────────────────────────────────────────────
  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Lock className="h-16 w-16 text-slate-200" />
        <p className="text-lg font-semibold text-slate-500">Access Restricted</p>
        <p className="text-sm text-center max-w-xs">
          Only Application Admins can view and manage salary configurations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Toast / status ────────────────────────────────────────────────── */}
      {sc.status && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
            sc.status.kind === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {sc.status.kind === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {sc.status.text}
          <button onClick={sc.clearStatus} className="ml-auto opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">

        {/* ── LEFT: employee list ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* Month filter */}
          <div className="px-4 py-3 border-b border-slate-100">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedEmployeeId(null);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employee search */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees…"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Employee list */}
          <div className="overflow-y-auto flex-1 max-h-[540px]">
            {empLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                <User className="h-8 w-8 text-slate-200" />
                <p className="text-sm">No employees found</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === selectedEmployeeId;
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleEmployeeClick(emp)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 truncate">{emp.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {emp.employeeCode}
                      {emp.jobTitle ? ` • ${emp.jobTitle}` : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: salary editor ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* No employee selected placeholder */}
          {!sc.editor && !sc.editorLoading && (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <Banknote className="h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium">Select an employee to configure salary</p>
              <p className="text-xs text-center max-w-xs text-slate-300">
                Choose a month and click on an employee from the left panel
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {sc.editorLoading && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/4" />
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Editor card */}
          {sc.editor && !sc.editorLoading && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Salary Config for {sc.editor.employeeName} — {monthLabel(selectedMonth)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{sc.editor.employeeCode}</p>
                </div>
                <button
                  onClick={() => sc.save(selectedMonth)}
                  disabled={sc.saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Save className="h-4 w-4" />
                  {sc.saving ? 'Saving…' : 'Save Config'}
                </button>
              </div>

              {/* Salary summary row */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Basic Salary */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Basic Salary
                    </p>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={sc.editor.basicSalary}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        sc.setBasicSalary(isNaN(v) || v < 0 ? 0 : v);
                      }}
                      className="w-full bg-transparent text-lg font-bold text-slate-900 focus:outline-none border-b border-slate-300 focus:border-indigo-400 pb-0.5"
                    />
                  </div>

                  {/* Increase Amount (read-only) */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Increase Amount
                    </p>
                    <p className="text-lg font-bold text-emerald-600 pt-0.5">
                      {fmtAmt(sc.editor.increaseAmount)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Auto-fetched</p>
                  </div>

                  {/* Gross Salary */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      Gross Salary
                    </p>
                    <p className="text-lg font-bold text-blue-700 pt-0.5">
                      {fmtAmt(derived?.grossSalary ?? 0)}
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">Basic + Increase</p>
                  </div>

                  {/* Total Salary */}
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                      Total Salary
                    </p>
                    <p className="text-lg font-bold text-indigo-700 pt-0.5">
                      {fmtAmt(derived?.totalSalary ?? 0)}
                    </p>
                    <p className="text-xs text-indigo-400 mt-0.5">Gross + Allowances − Ded.</p>
                  </div>
                </div>
              </div>

              {/* Allowances & Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* Allowances */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">Allowances</span>
                  </div>
                  <LineItemEditor
                    items={sc.editor.allowances}
                    onChange={sc.setAllowances}
                    onImport={sc.importAllowances}
                    importLabel="Import from Bonus"
                    importing={sc.importingAllowances}
                    emptyText="No allowances added"
                  />
                  {/* Total allowances */}
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Total Allowances
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {fmtAmt(derived?.totalAllowances ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Minus className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-slate-700">Deductions</span>
                  </div>
                  <LineItemEditor
                    items={sc.editor.deductions}
                    onChange={sc.setDeductions}
                    onImport={sc.importDeductions}
                    importLabel="Import Deductions"
                    importing={sc.importingDeductions}
                    emptyText="No deductions added"
                  />
                  {/* Total deductions */}
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Total Deductions
                    </span>
                    <span className="text-sm font-bold text-red-700">
                      {fmtAmt(derived?.totalDeductions ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="px-5 py-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sc.editor.notes}
                  onChange={(e) => sc.setNotes(e.target.value)}
                  placeholder="Internal notes…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── History table ─────────────────────────────────────────────────── */}
      <HistoryTable
        records={sc.historyRecords}
        loading={sc.historyLoading}
        search={sc.historySearch}
        onSearchChange={sc.setHistorySearch}
        onEdit={(cfg) => {
          setSelectedEmployeeId(cfg.employeeId);
          sc.editFromHistory(cfg);
        }}
        onDelete={(id, month, label) => setDeleteTarget({ id, month, label })}
        isAdmin={admin}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.label}
          busy={sc.deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await sc.deleteRecord(deleteTarget.id, deleteTarget.month);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
