'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import {
  socialInsuranceService,
  SocialInsuranceRecord,
  SocialInsuranceAttachment,
  CreateSocialInsurancePayload,
  FormType,
} from '@/lib/services/social-insurance.service';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/types/employee';
import {
  Shield, Plus, Search, Download, Pencil, Trash2, X,
  ChevronDown, Paperclip, FileText,
} from 'lucide-react';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

function fmtCurrency(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportExcel(records: SocialInsuranceRecord[]) {
  const data = records.map((r) => ({
    'Employee Name':            r.employeeName,
    'Employee Code':            r.employeeCode,
    'Insurance Number':         r.insuranceNumber,
    'Insurable Wage (EGP)':     r.insurableWage,
    'Enrollment Date':          r.enrollmentDate,
    'Employee Share (11.25%)':  r.employeeShare,
    'Employer Share (19%)':     r.employerShare,
    'Form 1': r.attachments?.find((a) => a.formType === 'form1')?.url || '',
    'Form 6': r.attachments?.find((a) => a.formType === 'form6')?.url || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Social Insurance');
  XLSX.writeFile(wb, `social_insurance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportPDF(records: SocialInsuranceRecord[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Social Insurance Policies', 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 21);
  autoTable(doc, {
    startY: 26,
    head: [['Employee', 'Code', 'Ins. Number', 'Wage (EGP)', 'Enrollment', 'Emp. Share', 'Empr. Share']],
    body: records.map((r) => [
      r.employeeName,
      r.employeeCode,
      r.insuranceNumber,
      fmtCurrency(r.insurableWage),
      r.enrollmentDate,
      fmtCurrency(r.employeeShare),
      fmtCurrency(r.employerShare),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save(`social_insurance_${new Date().toISOString().slice(0, 10)}.pdf`);
}

interface PolicyFormModalProps {
  employees: Employee[];
  editRecord?: SocialInsuranceRecord | null;
  onClose: () => void;
  onSave: () => void;
}

function PolicyFormModal({ employees, editRecord, onClose, onSave }: PolicyFormModalProps) {
  const [employeeId,      setEmployeeId]      = useState(editRecord?.employeeId || '');
  const [insuranceNumber, setInsuranceNumber] = useState(editRecord?.insuranceNumber || '');
  const [insurableWage,   setInsurableWage]   = useState(String(editRecord?.insurableWage ?? ''));
  const [enrollmentDate,  setEnrollmentDate]  = useState(editRecord?.enrollmentDate || '');
  const [attachments,     setAttachments]     = useState<SocialInsuranceAttachment[]>(editRecord?.attachments || []);
  const [uploading,       setUploading]       = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const wage = parseFloat(insurableWage) || 0;
  const previewEmployeeShare = Math.round(wage * 0.1125 * 100) / 100;
  const previewEmployerShare = Math.round(wage * 0.19   * 100) / 100;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, formType: FormType) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const result = await socialInsuranceService.uploadAttachment(file);
      const attachment: SocialInsuranceAttachment = { ...result, formType };
      setAttachments((prev) => {
        const filtered = prev.filter((a) => a.formType !== formType);
        return [...filtered, attachment];
      });
    } catch (err: any) { setError(err.message || 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  }

  function removeAttachment(formType: FormType) {
    setAttachments((prev) => prev.filter((a) => a.formType !== formType));
  }

  async function handleSave() {
    if (!employeeId || !insuranceNumber || !enrollmentDate || !insurableWage) {
      setError('Please fill in all required fields.'); return;
    }
    if (wage <= 0) { setError('Insurable wage must be greater than 0.'); return; }
    setSaving(true); setError('');
    try {
      const payload: CreateSocialInsurancePayload = {
        employeeId,
        employeeName:  selectedEmployee?.fullName     || editRecord?.employeeName  || '',
        employeeCode:  selectedEmployee?.employeeCode || editRecord?.employeeCode  || '',
        insuranceNumber,
        insurableWage: wage,
        enrollmentDate,
        attachments,
      };
      if (editRecord) {
        await socialInsuranceService.update(editRecord.id, payload);
      } else {
        await socialInsuranceService.create(payload);
      }
      onSave();
    } catch (err: any) { setError(err.message || 'Save failed');
    } finally { setSaving(false); }
  }

  const form1 = attachments.find((a) => a.formType === 'form1');
  const form6 = attachments.find((a) => a.formType === 'form6');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              {editRecord ? 'Edit Social Insurance' : 'Enroll Social Insurance'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configuring Employee Policy</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Employee Selection
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Insurance Number
              </label>
              <input
                type="text"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Enrollment Date
              </label>
              <input
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Insurable Wage (EGP)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={insurableWage}
              onChange={(e) => setInsurableWage(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {wage > 0 && (
              <div className="mt-2 flex gap-6 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                <span>Employee (11.25%): <strong className="text-slate-700">{fmtCurrency(previewEmployeeShare)} EGP</strong></span>
                <span>Employer (19%): <strong className="text-slate-700">{fmtCurrency(previewEmployerShare)} EGP</strong></span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Attachments
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['form1', 'form6'] as FormType[]).map((ft) => {
                const attached = ft === 'form1' ? form1 : form6;
                const label    = ft === 'form1' ? 'Form 1' : 'Form 6';
                return (
                  <div key={ft}>
                    {attached ? (
                      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        <a href={attached.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 text-xs text-emerald-700 hover:underline truncate">
                          {attached.name}
                        </a>
                        <button type="button" onClick={() => removeAttachment(ft)}
                          className="text-slate-400 hover:text-red-500 shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 border border-dashed border-slate-300 bg-slate-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500">
                          {uploading ? 'Uploading...' : `Attach ${label}`}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploading}
                          accept="image/*,application/pdf,.doc,.docx"
                          onChange={(e) => handleFileChange(e, ft)}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50">
            Discard Changes
          </button>
          <button onClick={handleSave} disabled={saving || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
            <Shield className="h-4 w-4" />
            {saving ? 'Saving...' : 'Commit Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialInsuranceContent() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);

  const [records,    setRecords]    = useState<SocialInsuranceRecord[]>([]);
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [editRecord, setEditRecord] = useState<SocialInsuranceRecord | null>(null);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [actionErr,  setActionErr]  = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const flashMsg = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3000); };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await socialInsuranceService.getAll();
      setRecords(data);
    } catch (e: any) { setActionErr(e.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (admin) {
      employeeService.getAllEmployees().then(setEmployees).catch(() => {});
    }
  }, [admin]);

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
    if (!window.confirm(`Delete social insurance policy for "${name}"?`)) return;
    try {
      await socialInsuranceService.remove(id);
      flashMsg('Policy deleted.');
      loadRecords();
    } catch (e: any) { setActionErr(e.message); }
  }

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.insuranceNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Shield className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Social Insurance</h2>
            <p className="text-sm text-slate-500">Manage employee insurance enrollment and wages.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>

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
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
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

          {admin && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Policy
            </button>
          )}
        </div>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Shield className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">
            {search ? 'No records match your search' : 'No social insurance policies yet'}
          </p>
          {admin && !search && (
            <button
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Insurance Number</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Insurable Wage (EGP)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Enrollment Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Calculated Shares</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Attachments</th>
                  {admin && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const rowForm1 = r.attachments?.find((a) => a.formType === 'form1');
                  const rowForm6 = r.attachments?.find((a) => a.formType === 'form6');
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{r.employeeName}</p>
                        <p className="text-xs text-slate-400">{r.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{r.insuranceNumber}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {fmtCurrency(r.insurableWage)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.enrollmentDate}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-slate-500">Employee (11.25%):</span>
                            <span className="font-semibold text-slate-800">{fmtCurrency(r.employeeShare)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-8">
                            <span className="text-slate-500">Employer (19%):</span>
                            <span className="font-semibold text-slate-800">{fmtCurrency(r.employerShare)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {rowForm1 ? (
                            <a href={rowForm1.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                              <FileText className="h-3.5 w-3.5 shrink-0" /> Form 1
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">Form 1 —</span>
                          )}
                          {rowForm6 ? (
                            <a href={rowForm6.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                              <FileText className="h-3.5 w-3.5 shrink-0" /> Form 6
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">Form 6 —</span>
                          )}
                        </div>
                      </td>
                      {admin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditRecord(r); setShowForm(true); }}
                              title="Edit"
                              className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.employeeName)}
                              title="Delete"
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} polic{filtered.length === 1 ? 'y' : 'ies'}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}

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

export default function SocialInsurancePage() {
  return (
    <ProtectedRoute moduleId="social_insurance">
      <DashboardLayout>
        <SocialInsuranceContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}