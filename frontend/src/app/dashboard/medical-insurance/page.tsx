'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import {
  medicalInsuranceService,
  MedicalInsuranceRecord,
} from '@/lib/services/medical-insurance.service';
import {
  MedicalInsuranceDependent,
  DEPENDENT_RELATIONS,
  DependentRelation,
  CreateMedicalInsurancePayload,
} from '@/types/medical-insurance';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/types/employee';
import {
  Heart,
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Users,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

function fmtAmt(n: number): string {
  return n.toLocaleString('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateBillingMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  for (let i = 0; i < 24; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
}

const BILLING_MONTHS = generateBillingMonths();

// ─── Export helpers ────────────────────────────────────────────────────────

async function exportExcel(records: MedicalInsuranceRecord[]) {
  const rows = records.map((r) => ({
    'Employee Code': r.employeeCode,
    'Employee Name': r.employeeName,
    'Enrollment Date': r.enrollmentDate,
    'Billing Month': r.billingMonth,
    'Employee Amount (EGP)': r.employeeAmount,
    'Dependents Count': r.dependents?.length ?? 0,
    'Total Dependent Amount (EGP)': r.totalDependentAmount,
    'Total Amount (EGP)': r.totalAmount,
    'Monthly Payroll Deduction (EGP)': r.payrollDeductionAmount,
  }));
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medical Insurance');
  XLSX.writeFile(wb, `medical_insurance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportPDF(records: MedicalInsuranceRecord[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Medical Insurance Policies', 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 21);
  autoTable(doc, {
    startY: 26,
    head: [['Code', 'Employee Name', 'Enrollment Date', 'Billing Month', 'Emp. Amount', 'Dependents', 'Total Amount']],
    body: records.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.enrollmentDate,
      r.billingMonth,
      fmtAmt(r.employeeAmount),
      (r.dependents || [])
        .map((d) => `${d.name} | ${capitalize(d.relation)} | ${d.nationalId} | ${fmtAmt(d.amount)}`)
        .join('\n') || '—',
      fmtAmt(r.totalAmount),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [220, 38, 127] },
    columnStyles: { 5: { cellWidth: 60 } },
  });
  doc.save(`medical_insurance_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Local draft type ──────────────────────────────────────────────────────

interface DependentDraft {
  name: string;
  relation: DependentRelation | '';
  nationalId: string;
  amount: string;
  birthDate: string;
}

function emptyDraft(): DependentDraft {
  return { name: '', relation: '', nationalId: '', amount: '', birthDate: '' };
}

// ─── Policy Form Modal ─────────────────────────────────────────────────────

interface PolicyFormModalProps {
  employees: Employee[];
  editRecord?: MedicalInsuranceRecord | null;
  onClose: () => void;
  onSave: () => void;
}

function PolicyFormModal({ employees, editRecord, onClose, onSave }: PolicyFormModalProps) {
  const [employeeId, setEmployeeId] = useState(editRecord?.employeeId ?? '');
  const [billingMonth, setBillingMonth] = useState(editRecord?.billingMonth ?? '');
  const [enrollmentDate, setEnrollmentDate] = useState(editRecord?.enrollmentDate ?? '');
  const [employeeAmount, setEmployeeAmount] = useState(String(editRecord?.employeeAmount ?? ''));
  const [enrolledDependents, setEnrolledDependents] = useState<MedicalInsuranceDependent[]>(
    editRecord?.dependents ?? [],
  );
  const [draft, setDraft] = useState<DependentDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exportDepsOpen, setExportDepsOpen] = useState(false);
  const exportDepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (exportDepsRef.current && !exportDepsRef.current.contains(e.target as Node)) {
        setExportDepsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const empAmt = parseFloat(employeeAmount) || 0;
  const totalDepAmt = enrolledDependents.reduce((s, d) => s + d.amount, 0);
  const globalNetDeduction = empAmt + totalDepAmt;
  const empName = selectedEmployee?.fullName ?? editRecord?.employeeName ?? '';
  const empCode = selectedEmployee?.employeeCode ?? editRecord?.employeeCode ?? '';

  async function exportDepsExcel() {
    setExportDepsOpen(false);
    const XLSX = await import('xlsx');
    const rows = enrolledDependents.length > 0
      ? enrolledDependents.map((d) => ({
          'Employee Code': empCode,
          'Employee Name': empName,
          'Billing Month': billingMonth,
          'Start Date': enrollmentDate,
          'Dependent Name': d.name,
          'Relation': capitalize(d.relation),
          'National ID': d.nationalId,
          'Dependent Amount (EGP)': d.amount,
          'Employee Premium (EGP)': empAmt,
          'Total Dependent Amount (EGP)': totalDepAmt,
          'Global Net Deduction (EGP)': globalNetDeduction,
        }))
      : [{
          'Employee Code': empCode,
          'Employee Name': empName,
          'Billing Month': billingMonth,
          'Start Date': enrollmentDate,
          'Dependent Name': '—',
          'Relation': '—',
          'National ID': '—',
          'Dependent Amount (EGP)': 0,
          'Employee Premium (EGP)': empAmt,
          'Total Dependent Amount (EGP)': totalDepAmt,
          'Global Net Deduction (EGP)': globalNetDeduction,
        }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dependents');
    XLSX.writeFile(wb, `dependents_${empCode || 'policy'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportDepsPDF() {
    setExportDepsOpen(false);
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Medical Insurance — Dependent Enrollment', 14, 14);
    doc.setFontSize(10);
    doc.text(`Employee: ${empName} (${empCode})`, 14, 22);
    doc.text(`Billing Month: ${billingMonth}   Start Date: ${enrollmentDate}`, 14, 29);
    autoTable(doc, {
      startY: 36,
      head: [['Dependent Name', 'Relation', 'National ID', 'Amount (EGP)']],
      body: enrolledDependents.length > 0
        ? enrolledDependents.map((d) => [d.name, capitalize(d.relation), d.nationalId, fmtAmt(d.amount)])
        : [['No dependents enrolled', '—', '—', '—']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 127] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
    doc.setFontSize(10);
    doc.text(`Employee Premium: EGP ${fmtAmt(empAmt)}`, 14, finalY + 10);
    doc.text(`Total Dependent Amount: EGP ${fmtAmt(totalDepAmt)}`, 14, finalY + 17);
    doc.setFontSize(12);
    doc.setFont(undefined as any, 'bold');
    doc.text(`Global Net Deduction: EGP ${fmtAmt(globalNetDeduction)}`, 14, finalY + 26);
    doc.save(`dependents_${empCode || 'policy'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function addDependent() {
    if (!draft.name.trim()) { setError('Dependent name is required.'); return; }
    if (!draft.relation) { setError('Relation is required.'); return; }
    if (!draft.nationalId.trim()) { setError('National ID is required.'); return; }
    const amt = parseFloat(draft.amount);
    if (isNaN(amt) || amt < 0) { setError('Dependent amount must be 0 or more.'); return; }
    setError('');
    setEnrolledDependents((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `dep-${Date.now()}`,
        name: draft.name.trim(),
        relation: draft.relation as DependentRelation,
        nationalId: draft.nationalId.trim(),
        amount: amt,
        ...(draft.birthDate ? { birthDate: draft.birthDate } : {}),
      },
    ]);
    setDraft(emptyDraft());
  }

  function removeDependent(id: string) {
    setEnrolledDependents((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSave() {
    if (!employeeId) { setError('Please select an employee.'); return; }
    if (!billingMonth) { setError('Please select a billing month.'); return; }
    if (!enrollmentDate) { setError('Please enter a start date.'); return; }
    if (employeeAmount === '' || empAmt < 0) { setError('Base premium must be 0 or more.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreateMedicalInsurancePayload = {
        employeeId,
        employeeName: selectedEmployee?.fullName ?? editRecord?.employeeName ?? '',
        employeeCode: selectedEmployee?.employeeCode ?? editRecord?.employeeCode ?? '',
        billingMonth,
        enrollmentDate,
        employeeAmount: empAmt,
        dependents: enrolledDependents,
      };
      if (editRecord) {
        await medicalInsuranceService.update(editRecord.id, payload);
      } else {
        await medicalInsuranceService.create(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-widest">
              Plan Architect
            </h3>
            <p className="text-xs text-rose-400 uppercase tracking-wide mt-0.5">
              {editRecord ? 'Editing Medical Policy' : 'Configuring Enterprise Medical Policy'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — two columns */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">

          {/* LEFT: Policy fields */}
          <div className="md:w-1/2 px-6 py-5 space-y-4 overflow-y-auto border-r border-slate-100">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Holder selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Holder Selection
              </label>
              {editRecord ? (
                <input
                  value={editRecord.employeeName}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              ) : (
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.employeeCode}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Billing month */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Billing Month
              </label>
              <select
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="">Select Month</option>
                {BILLING_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Base premium */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Holder Base Premium (EGP)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={employeeAmount}
                onChange={(e) => setEmployeeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Global net deduction card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 p-5 text-white">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10">
                <Heart className="h-24 w-24" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-100 mb-1">
                Global Net Deduction
              </p>
              <p className="text-4xl font-extrabold tracking-tight">
                EGP {fmtAmt(globalNetDeduction)}
              </p>
              <p className="text-xs text-rose-100 mt-2">
                This amount will be pushed to payroll as a recurring deduction.
              </p>
            </div>
          </div>

          {/* RIGHT: Enrollment ledger + dependent entry form */}
          <div className="md:w-1/2 px-6 py-5 flex flex-col gap-4 overflow-y-auto">

            {/* Enrollment ledger */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Users className="h-3.5 w-3.5" />
                Enrollment Ledger
              </p>
              {enrolledDependents.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  No dependents enrolled yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {enrolledDependents.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-start justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{dep.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {capitalize(dep.relation)} · {dep.nationalId} ·{' '}
                          <span className="font-medium text-slate-700">EGP {fmtAmt(dep.amount)}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDependent(dep.id)}
                        className="shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enroll dependant form */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">
                Enroll Dependant
              </p>

              <input
                type="text"
                placeholder="Dependent Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={draft.relation}
                  onChange={(e) => setDraft({ ...draft, relation: e.target.value as DependentRelation | '' })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Relation</option>
                  {DEPENDENT_RELATIONS.map((r) => (
                    <option key={r} value={r}>{capitalize(r)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Amount"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  title="Birth Date (optional)"
                  value={draft.birthDate}
                  onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <input
                  type="text"
                  placeholder="National ID"
                  value={draft.nationalId}
                  onChange={(e) => setDraft({ ...draft, nationalId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <button
                type="button"
                onClick={addDependent}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Dependant
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50 uppercase tracking-wide font-medium"
          >
            Discard Changes
          </button>

          {/* Export dependents dropdown */}
          <div className="relative" ref={exportDepsRef}>
            <button
              type="button"
              onClick={() => setExportDepsOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Dependents
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportDepsOpen && (
              <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 min-w-[160px]">
                <button
                  type="button"
                  onClick={exportDepsExcel}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as Excel
                </button>
                <button
                  type="button"
                  onClick={exportDepsPDF}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-700 text-white rounded-lg hover:bg-violet-800 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <Heart className="h-4 w-4" />
            {saving ? 'Saving…' : 'Commit Medical Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────

function MedicalInsuranceContent() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);

  const [records, setRecords] = useState<MedicalInsuranceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalInsuranceRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const flashMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await medicalInsuranceService.getAll();
      setRecords(data);
    } catch (e: any) {
      setActionErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (admin) {
      employeeService.getAllEmployees().then(setEmployees).catch(() => {});
    }
  }, [admin]);

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete medical insurance policy for "${name}"?`)) return;
    try {
      await medicalInsuranceService.remove(id);
      flashMsg('Policy deleted.');
      loadRecords();
    } catch (e: any) {
      setActionErr(e.message || 'Delete failed');
    }
  }

  // Admin searches in browser; employee always sees only their own record from the backend
  const filtered = records.filter((r) =>
    !search || r.employeeName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Page header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg">
            <Heart className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Medical Insurance</h2>
            <p className="text-sm text-slate-500">
              Manage private health insurance and family dependents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 w-52"
            />
          </div>

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => { exportExcel(filtered); setExportOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export to Excel
                </button>
                <button
                  onClick={() => { exportPDF(filtered); setExportOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export to PDF
                </button>
              </div>
            )}
          </div>

          {/* Add Policy — admin only */}
          {admin && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Policy
            </button>
          )}
        </div>
      </div>

      {/* Toast messages */}
      {statusMsg && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          {statusMsg}
        </div>
      )}
      {actionErr && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span>{actionErr}</span>
          <button onClick={() => setActionErr('')} className="ml-4 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table / empty states */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Heart className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">
            {search ? 'No records match your search' : 'No medical insurance policies yet'}
          </p>
          {admin && !search && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
            >
              <Plus className="h-4 w-4" /> Add First Policy
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Start Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Emp. Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Family Members (Name | Rel | ID | Amount)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Amount</th>
                  {admin && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {r.employeeCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {r.employeeName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.enrollmentDate}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {fmtAmt(r.employeeAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {(r.dependents ?? []).length === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.dependents.map((dep) => (
                            <span
                              key={dep.id}
                              className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 text-xs rounded-full px-2.5 py-1 whitespace-nowrap"
                            >
                              {dep.name} | {capitalize(dep.relation)} | {dep.nationalId} | {fmtAmt(dep.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                      {fmtAmt(r.totalAmount)}
                    </td>
                    {admin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditRecord(r); setShowForm(true); }}
                            title="Edit"
                            className="p-1.5 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.employeeName)}
                            title="Delete"
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} polic{filtered.length === 1 ? 'y' : 'ies'}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <PolicyFormModal
          employees={employees}
          editRecord={editRecord}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSave={() => {
            setShowForm(false);
            setEditRecord(null);
            loadRecords();
            flashMsg(editRecord ? 'Policy updated.' : 'Policy added.');
          }}
        />
      )}
    </div>
  );
}

// ─── Page wrapper ──────────────────────────────────────────────────────────

export default function MedicalInsurancePage() {
  return (
    <ProtectedRoute moduleId="medical_insurance">
      <DashboardLayout>
        <MedicalInsuranceContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
