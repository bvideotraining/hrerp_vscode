'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Save,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  TrendingUp,
  Minus,
  Lock,
  User,
  Banknote,
  ExternalLink,
  Download,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { employeeService } from '@/lib/services/employee.service';
import { useSalaryConfig, calcDerived } from '@/hooks/use-salary-config';
import type { Employee } from '@/types/employee';
import type { SalaryLineItem, SalaryConfig } from '@/types/salary-config';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

function fmtAmt(n: number | undefined): string {
  return (n ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(yyyymm: string): string {
  if (!yyyymm) return 'â€”';
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

// â”€â”€â”€ Source badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ LineItemEditor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LineItemEditorProps {
  items: SalaryLineItem[];
  onChange: (items: SalaryLineItem[]) => void;
  disabled?: boolean;
  /** Handler for the Import button â€” if omitted, Import button is hidden */
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
    if (isNaN(amount) || amount < 0) { setAddError('Amount must be â‰¥ 0'); return; }
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
      {/* â”€â”€ Action buttons row (Import + Add) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              {importing ? 'Importingâ€¦' : (importLabel ?? 'Import')}
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

      {/* â”€â”€ Inline add form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAdd && !disabled && (
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              autoFocus
              placeholder="Item nameâ€¦"
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

      {/* â”€â”€ Items list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

// â”€â”€â”€ Main Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SalaryConfigSection() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const sc = useSalaryConfig();

  // â”€â”€â”€ Load employees once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    employeeService
      .getAllEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  // â”€â”€â”€ Select employee â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Derived calculations (real-time) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const derived = sc.editor
    ? calcDerived(
        sc.editor.basicSalary,
        sc.editor.increaseAmount,
        sc.editor.allowances,
        sc.editor.deductions,
      )
    : null;

  // â”€â”€â”€ Filtered employees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredEmployees = empSearch
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
          e.employeeCode?.toLowerCase().includes(empSearch.toLowerCase()),
      )
    : employees;

  // â”€â”€â”€ Access denied â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      {/* â”€â”€ Toast / status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Two-column layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">

        {/* â”€â”€ LEFT: employee list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                placeholder="Search employeesâ€¦"
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
                      {emp.jobTitle ? ` â€¢ ${emp.jobTitle}` : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* â”€â”€ RIGHT: salary editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    Salary Config for {sc.editor.employeeName} â€” {monthLabel(selectedMonth)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sc.editor.employeeCode}
                    {sc.editor.branch ? (
                      <> &nbsp;Â·&nbsp; <span className="text-indigo-600 font-medium">{sc.editor.branch}</span></>
                    ) : null}
                    {sc.editor.department ? (
                      <> &nbsp;Â·&nbsp; {sc.editor.department}</>
                    ) : null}
                  </p>
                </div>
                <button
                  onClick={() => sc.save(selectedMonth)}
                  disabled={sc.saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Save className="h-4 w-4" />
                  {sc.saving ? 'Savingâ€¦' : 'Save Config'}
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
                    <p className="text-xs text-indigo-400 mt-0.5">Gross + Allowances âˆ’ Ded.</p>
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
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Allowances</span>
                    <span className="text-sm font-bold text-emerald-700">{fmtAmt(derived?.totalAllowances ?? 0)}</span>
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
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Deductions</span>
                    <span className="text-sm font-bold text-red-700">{fmtAmt(derived?.totalDeductions ?? 0)}</span>
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
                  placeholder="Internal notesâ€¦"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Link to history page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center justify-end">
        <Link
          href="/dashboard/payroll/salary-config-history"
          className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium rounded-lg transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View Full History
        </Link>
      </div>
    </div>
  );
}
