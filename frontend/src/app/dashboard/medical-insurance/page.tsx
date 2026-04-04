'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useMedicalInsurance } from '@/hooks/use-medical-insurance';
import { employeeService } from '@/lib/services/employee.service';
import type {
  MedicalInsuranceRecord,
  MedicalInsuranceDependent,
  CreateMedicalInsurancePayload,
  UpdateMedicalInsurancePayload,
  DependentRelation,
} from '@/types/medical-insurance';
import { DEPENDENT_RELATIONS } from '@/types/medical-insurance';
import type { EmployeeData } from '@/types/employee';
import { Heart, Plus, Search, Download, Pencil, Trash2, X, UserPlus } from 'lucide-react';

/* ─── helpers ─── */
function fmtAmt(n: number) {
  return (n ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateMonthOptions(back = 2, fwd = 1) {
  const opts: { label: string; value: string }[] = [];
  const now = new Date();
  for (let y = now.getFullYear() - back; y <= now.getFullYear() + fwd; y++) {
    for (let m = 1; m <= 12; m++) {
      const v = `${y}-${String(m).padStart(2, '0')}`;
      const label = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value: v, label });
    }
  }
  return opts;
}
const MONTH_OPTIONS = generateMonthOptions();

/* ─── Excel export ─── */
async function exportExcel(records: MedicalInsuranceRecord[]) {
  const XLSX = await import('xlsx');
  const rows = records.map((r) => ({
    Code: r.employeeCode,
    'Employee Name': r.employeeName,
    'Start Date': r.enrollmentDate,
    'Billing Month': r.billingMonth,
    'Employee Amount': r.employeeAmount,
    Dependents: r.dependents.map((d) => `${d.name} (${d.relation})`).join(', '),
    'Total Dependent Amount': r.totalDependentAmount,
    'Total Amount': r.totalAmount,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 22 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medical Insurance');
  XLSX.writeFile(wb, `medical_insurance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ─── PDF export ─── */
async function exportPDF(records: MedicalInsuranceRecord[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Medical Insurance Report', 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 24);
  autoTable(doc, {
    startY: 30,
    head: [['Code', 'Employee', 'Start Date', 'Emp. Amount', 'Dependents', 'Total']],
    body: records.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.enrollmentDate,
      fmtAmt(r.employeeAmount),
      r.dependents.map((d) => `${d.name}(${d.relation})`).join(', '),
      fmtAmt(r.totalAmount),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [109, 40, 217] },
  });
  doc.save(`medical_insurance_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ═══════════════ Page ═══════════════ */
export default function MedicalInsurancePage() {
  return (
    <ProtectedRoute moduleId="medical_insurance">
      <DashboardLayout>
        <MedicalInsuranceModule />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function MedicalInsuranceModule() {
  const { loading, error, clearError, getAll, create, update, remove } = useMedicalInsurance();
  const [records, setRecords] = useState<MedicalInsuranceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalInsuranceRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await getAll(undefined, search || undefined);
    setRecords(data);
  }, [getAll, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    employeeService.getAllEmployees().then(setEmployees).catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medical policy?')) return;
    const ok = await remove(id);
    if (ok) load();
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditRecord(null);
    load();
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-purple-600" fill="currentColor" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Medical Insurance</h2>
            <p className="text-sm text-slate-500">Manage private health insurance and family dependents.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-52 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 w-36">
                <button onClick={() => { exportExcel(records); setExportOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100">Excel (.xlsx)</button>
                <button onClick={() => { exportPDF(records); setExportOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100">PDF</button>
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditRecord(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Add Policy
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={clearError}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Employee Name</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">Emp. Amount</th>
              <th className="px-4 py-3">Family Members (Name | Rel | ID | Amount)</th>
              <th className="px-4 py-3 text-right">Total Amount</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No policies found.</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.employeeCode}</td>
                  <td className="px-4 py-3 font-semibold">{r.employeeName}</td>
                  <td className="px-4 py-3">{r.enrollmentDate}</td>
                  <td className="px-4 py-3 font-semibold">{fmtAmt(r.employeeAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.dependents.map((d) => (
                        <span key={d.id} className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-200">
                          {d.name} | {d.relation.charAt(0).toUpperCase() + d.relation.slice(1)} | {d.nationalId} | {fmtAmt(d.amount)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-purple-600 text-base">{fmtAmt(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditRecord(r); setShowModal(true); }} className="text-slate-500 hover:text-purple-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <PolicyModal
          employees={employees}
          editRecord={editRecord}
          onClose={() => { setShowModal(false); setEditRecord(null); }}
          onCreate={create}
          onUpdate={update}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ═══════════════ Modal ═══════════════ */
interface PolicyModalProps {
  employees: EmployeeData[];
  editRecord: MedicalInsuranceRecord | null;
  onClose: () => void;
  onCreate: (d: CreateMedicalInsurancePayload) => Promise<MedicalInsuranceRecord | null>;
  onUpdate: (id: string, d: UpdateMedicalInsurancePayload) => Promise<MedicalInsuranceRecord | null>;
  onSaved: () => void;
}

function PolicyModal({ employees, editRecord, onClose, onCreate, onUpdate, onSaved }: PolicyModalProps) {
  const isEdit = !!editRecord;

  const [employeeId, setEmployeeId] = useState(editRecord?.employeeId || '');
  const [billingMonth, setBillingMonth] = useState(editRecord?.billingMonth || currentMonthValue());
  const [employeeAmount, setEmployeeAmount] = useState(editRecord?.employeeAmount ?? 0);
  const [enrollmentDate, setEnrollmentDate] = useState(editRecord?.enrollmentDate || '');
  const [dependents, setDependents] = useState<MedicalInsuranceDependent[]>(editRecord?.dependents || []);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  /* new dependent form */
  const [depName, setDepName] = useState('');
  const [depRelation, setDepRelation] = useState<DependentRelation>('wife');
  const [depAmount, setDepAmount] = useState(0);
  const [depBirthDate, setDepBirthDate] = useState('');
  const [depNationalId, setDepNationalId] = useState('');

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const totalDependent = dependents.reduce((s, d) => s + (d.amount || 0), 0);
  const globalNet = employeeAmount + totalDependent;

  const addDependent = () => {
    if (!depName.trim()) return;
    const dep: MedicalInsuranceDependent = {
      id: crypto.randomUUID(),
      name: depName.trim(),
      relation: depRelation,
      amount: depAmount,
      nationalId: depNationalId.trim(),
      birthDate: depBirthDate || undefined,
    };
    setDependents((prev) => [...prev, dep]);
    setDepName(''); setDepAmount(0); setDepBirthDate(''); setDepNationalId('');
  };

  const removeDependent = (id: string) => setDependents((prev) => prev.filter((d) => d.id !== id));

  const handleCommit = async () => {
    setModalError(null);
    if (!isEdit && !employeeId) { setModalError('Please select an employee'); return; }
    if (!billingMonth) { setModalError('Please select a billing month'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await onUpdate(editRecord!.id, { billingMonth, enrollmentDate, employeeAmount, dependents });
      } else {
        await onCreate({
          employeeId,
          employeeCode: selectedEmployee?.employeeCode || '',
          employeeName: selectedEmployee?.fullName || '',
          billingMonth,
          enrollmentDate,
          employeeAmount,
          dependents,
        });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">PLAN ARCHITECT</h3>
            <p className="text-xs font-semibold text-blue-600 tracking-wide">CONFIGURING ENTERPRISE MEDICAL POLICY</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {modalError && (
          <div className="mx-6 mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{modalError}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Employee select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Holder Selection</label>
              {isEdit ? (
                <input value={editRecord!.employeeName} disabled className="w-full border rounded-lg px-3 py-2 bg-slate-100 text-sm" />
              ) : (
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} - {emp.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Billing month */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Billing Month</label>
              <select
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">Select Month</option>
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Holder base premium */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Holder Base Premium</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={employeeAmount}
                onChange={(e) => setEmployeeAmount(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Start Date</label>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Global Net Deduction card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 text-white p-5">
              <Heart className="absolute right-4 top-4 w-16 h-16 opacity-20" fill="currentColor" />
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">Global Net Deduction</p>
              <p className="text-3xl font-extrabold mt-1">EGP {fmtAmt(globalNet)}</p>
              <p className="text-xs opacity-75 mt-1">This amount will be pushed to payroll as a recurring deduction.</p>
            </div>
          </div>

          {/* RIGHT COLUMN - Enrollment Ledger */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <UserPlus className="w-4 h-4 text-pink-600" /> ENROLLMENT LEDGER
            </div>

            {dependents.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No dependents enrolled yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dependents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm border">
                    <div>
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-slate-500 ml-2">({d.relation})</span>
                      <span className="text-purple-600 font-bold ml-2">EGP {fmtAmt(d.amount)}</span>
                    </div>
                    <button onClick={() => removeDependent(d.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Add dependent form */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-bold text-center text-pink-600 uppercase tracking-wide">Enroll Dependant</p>
              <input
                placeholder="Dependent Name"
                value={depName}
                onChange={(e) => setDepName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={depRelation}
                  onChange={(e) => setDepRelation(e.target.value as DependentRelation)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {DEPENDENT_RELATIONS.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Amount"
                  value={depAmount || ''}
                  onChange={(e) => setDepAmount(parseFloat(e.target.value) || 0)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={depBirthDate}
                  onChange={(e) => setDepBirthDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <input
                  placeholder="National ID"
                  value={depNationalId}
                  onChange={(e) => setDepNationalId(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={addDependent}
                className="w-full py-2 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Add Dependant
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="text-sm text-slate-500 font-semibold hover:text-slate-700 uppercase tracking-wide">
            Discard Changes
          </button>
          <button
            disabled={saving}
            onClick={handleCommit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Policy' : 'Commit Medical Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
