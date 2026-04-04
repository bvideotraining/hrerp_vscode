'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { useSalaryConfig, calcDerived } from '@/hooks/use-salary-config';
import { salaryConfigService } from '@/lib/services/salary-config.service';
import { employeeService } from '@/lib/services/employee.service';
import type { SalaryConfig, CreateSalaryConfigPayload } from '@/types/salary-config';
import type { Employee } from '@/types/employee';
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Banknote,
  Info,
  Save,
  TrendingUp,
  Minus,
  Lock,
} from 'lucide-react';

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

// ─── Derive month options from actual data ────────────────────────────────────

function deriveMonthOptions(records: SalaryConfig[]): { value: string; label: string }[] {
  const months = [...new Set(records.map((r) => r.month).filter((m) => m && m !== '—'))].sort();
  return months.map((m) => ({ value: m, label: monthLabel(m) }));
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function exportHistoryExcel(records: SalaryConfig[]) {
  const XLSX = await import('xlsx');
  const rows = records.map((r) => ({
    'Emp Code': r.employeeCode,
    'Emp Name': r.employeeName,
    Branch: r.branch || '',
    Month: r.month,
    'Basic Salary': r.basicSalary,
    'Increase Amount': r.increaseAmount,
    'Gross Salary': r.grossSalary,
    'Total Allowances': r.totalAllowances,
    'Total Deductions': r.totalDeductions,
    'Total Salary': r.totalSalary,
    'Allowances Detail': (r.allowances || []).map((a) => `${a.name}: ${a.amount}`).join('; '),
    'Deductions Detail': (r.deductions || []).map((d) => `${d.name}: ${d.amount}`).join('; '),
    Notes: r.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Config History');
  XLSX.writeFile(wb, `salary-config-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportHistoryPDF(records: SalaryConfig[]) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined as any, 'bold');
  doc.text('HR ERP System — Salary Configuration History', 14, 14);
  doc.setFontSize(8);
  doc.setFont(undefined as any, 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}   |   Records: ${records.length}`, 283, 14, { align: 'right' });
  autoTable(doc, {
    startY: 28,
    head: [['Emp Code', 'Emp Name', 'Branch', 'Month', 'Basic Salary', 'Increase', 'Gross Salary', 'Allowances', 'Deductions', 'Total Salary']],
    body: records.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.branch || '—',
      r.month,
      r.basicSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.increaseAmount.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.grossSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.totalAllowances.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.totalDeductions.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
      r.totalSalary.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
    ]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save(`salary-config-history-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── ImportExcelModal ─────────────────────────────────────────────────────────

const IMPORT_GUIDE_COLUMNS = [
  { field: 'employeeId', required: true, description: 'Employee ID (from system)' },
  { field: 'employeeCode', required: true, description: 'Employee code (e.g. EMP-001)' },
  { field: 'employeeName', required: true, description: 'Full name of employee' },
  { field: 'department', required: false, description: 'Department name' },
  { field: 'branch', required: false, description: 'Branch name' },
  { field: 'month', required: true, description: 'Month in YYYY-MM format (e.g. 2025-01)' },
  { field: 'basicSalary', required: true, description: 'Numeric value (e.g. 5000)' },
  { field: 'notes', required: false, description: 'Optional notes' },
];

function ImportExcelModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [tab, setTab] = useState<'guide' | 'upload'>('guide');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseError('');
    setRows([]);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed: any[] = XLSX.utils.sheet_to_json(ws);
      if (parsed.length === 0) { setParseError('File is empty or has no data rows.'); return; }
      setRows(parsed);
      setTab('upload');
    } catch {
      setParseError('Could not parse file. Ensure it is a valid .xlsx or .csv file.');
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      try {
        const payload: CreateSalaryConfigPayload = {
          employeeId: String(row['employeeId'] ?? row['EmployeeId'] ?? '').trim(),
          employeeCode: String(row['employeeCode'] ?? row['EmployeeCode'] ?? '').trim(),
          employeeName: String(row['employeeName'] ?? row['EmployeeName'] ?? '').trim(),
          department: String(row['department'] ?? row['Department'] ?? '').trim(),
          branch: String(row['branch'] ?? row['Branch'] ?? '').trim() || undefined,
          month: String(row['month'] ?? row['Month'] ?? '').trim(),
          basicSalary: parseFloat(String(row['basicSalary'] ?? row['BasicSalary'] ?? 0)),
          notes: String(row['notes'] ?? row['Notes'] ?? '').trim() || undefined,
        };
        if (!payload.employeeId || !payload.month || isNaN(payload.basicSalary)) {
          errors.push(`Row skipped — missing required fields: ${JSON.stringify(row)}`);
          continue;
        }
        await salaryConfigService.create(payload);
        success++;
      } catch (e: any) {
        errors.push(`Row failed: ${e.message}`);
      }
    }
    setImporting(false);
    setImportResult({ success, failed: errors.length, errors });
    if (success > 0) onImported();
  }

  function downloadTemplate() {
    import('xlsx').then((XLSX) => {
      const template = [IMPORT_GUIDE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.field]: '' }), {})];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'salary-config-import-template.xlsx');
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Import Salary Configs from Excel</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6">
          {(['guide', 'upload'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'guide' ? 'Field Guide' : 'Upload & Preview'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'guide' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Prepare your Excel file with the columns below. The first row must be the header row with exact column names.</span>
              </div>
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Column Name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Required</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_GUIDE_COLUMNS.map((col) => (
                    <tr key={col.field} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-indigo-700">{col.field}</td>
                      <td className="px-3 py-2 text-center">
                        {col.required ? (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Required</span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Optional</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
              >
                <Upload className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Click to select .xlsx or .csv file</p>
                {file && <p className="text-xs text-indigo-600 font-medium">{file.name}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

              {parseError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {rows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{rows.length} row(s) ready to import</p>
                  <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg">
                    <table className="text-xs w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>{Object.keys(rows[0]).map((k) => <th key={k} className="px-2 py-1.5 text-left text-slate-500 whitespace-nowrap">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            {Object.values(row).map((v: any, j) => <td key={j} className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 10 && <p className="text-xs text-slate-400">Showing first 10 rows…</p>}
                </div>
              )}

              {importResult && (
                <div className={`p-4 rounded-lg border ${importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    Import complete: {importResult.success} succeeded, {importResult.failed} failed
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-xs text-red-700 space-y-0.5 mt-2">
                      {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                      {importResult.errors.length > 5 && <li>…and {importResult.errors.length - 5} more</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            {importResult ? 'Close' : 'Cancel'}
          </button>
          {tab === 'upload' && rows.length > 0 && !importResult && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importing…' : `Import ${rows.length} Row(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
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
        <p className="text-sm text-slate-700 mb-5">Delete config for <strong>{label}</strong>?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SourceBadge ──────────────────────────────────────────────────────────────

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
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls} shrink-0 ml-1.5`}>
      {source.replace(/_/g, ' ')}
    </span>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  cfg: SalaryConfig;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ cfg, onClose, onSaved }: EditModalProps) {
  const sc = useSalaryConfig();

  useEffect(() => {
    sc.editFromHistory(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.id]);

  const derived = sc.editor
    ? calcDerived(sc.editor.basicSalary, sc.editor.increaseAmount, sc.editor.allowances, sc.editor.deductions)
    : null;

  async function handleSave() {
    if (!sc.editor) return;
    await sc.save(sc.editor.month);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Edit Salary Config — {cfg.employeeName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {cfg.employeeCode}
              {cfg.branch ? <> · <span className="text-indigo-600 font-medium">{cfg.branch}</span></> : null}
              {' · '}{monthLabel(cfg.month)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sc.status && (
          <div className={`mx-6 mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border ${
            sc.status.kind === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {sc.status.kind === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {sc.status.text}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {sc.editor && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Basic Salary</p>
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
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Increase Amount</p>
                  <p className="text-lg font-bold text-emerald-600 pt-0.5">{fmtAmt(sc.editor.increaseAmount)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Auto-fetched</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Gross Salary</p>
                  <p className="text-lg font-bold text-blue-700 pt-0.5">{fmtAmt(derived?.grossSalary ?? 0)}</p>
                  <p className="text-xs text-blue-400 mt-0.5">Basic + Increase</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Total Salary</p>
                  <p className="text-lg font-bold text-indigo-700 pt-0.5">{fmtAmt(derived?.totalSalary ?? 0)}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">Gross + Allow. − Ded.</p>
                </div>
              </div>

              {/* Allowances & Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">Allowances</span>
                    <span className="ml-auto text-sm font-bold text-emerald-700">{fmtAmt(derived?.totalAllowances ?? 0)}</span>
                  </div>
                  <div className="space-y-1">
                    {sc.editor.allowances.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 italic">No allowances</p>
                    ) : (
                      sc.editor.allowances.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 py-1">
                          <span className="flex-1 truncate">{item.name}</span>
                          <SourceBadge source={item.source} />
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.amount}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) {
                                const updated = [...sc.editor!.allowances];
                                updated[idx] = { ...updated[idx], amount: v };
                                sc.setAllowances(updated);
                              }
                            }}
                            className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                          <button onClick={() => sc.setAllowances(sc.editor!.allowances.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Minus className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-slate-700">Deductions</span>
                    <span className="ml-auto text-sm font-bold text-red-700">{fmtAmt(derived?.totalDeductions ?? 0)}</span>
                  </div>
                  <div className="space-y-1">
                    {sc.editor.deductions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 italic">No deductions</p>
                    ) : (
                      sc.editor.deductions.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 py-1">
                          <span className="flex-1 truncate">{item.name}</span>
                          <SourceBadge source={item.source} />
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.amount}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) {
                                const updated = [...sc.editor!.deductions];
                                updated[idx] = { ...updated[idx], amount: v };
                                sc.setDeductions(updated);
                              }
                            }}
                            className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                          <button onClick={() => sc.setDeductions(sc.editor!.deductions.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={sc.editor.notes}
                  onChange={(e) => sc.setNotes(e.target.value)}
                  placeholder="Internal notes…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={sc.saving || !sc.editor}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {sc.saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: i === 0 ? '70%' : '50%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────

function SalaryConfigHistoryContent() {
  const { user } = useAuth();
  const admin = isAppAdmin(user);
  const sc = useSalaryConfig();

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [editTarget, setEditTarget] = useState<SalaryConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; month: string; label: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Load all records on mount
  useEffect(() => {
    sc.loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load employees for category lookup
  useEffect(() => {
    employeeService.getAllEmployees().then(setEmployees).catch(() => {});
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  // Month options derived from actual data (only months that exist in records)
  const monthOptions = useMemo(() => deriveMonthOptions(sc.historyRecords), [sc.historyRecords]);

  // Branch options from records
  const branchOptions = useMemo(
    () => [...new Set(sc.historyRecords.map((r) => r.branch || '').filter(Boolean))].sort(),
    [sc.historyRecords],
  );

  const categoryByEmpId = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e.category])),
    [employees],
  );
  const categoryOptions = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];

  // Apply all filters
  const filtered = useMemo(() => {
    return sc.historyRecords.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.employeeName.toLowerCase().includes(q) &&
          !r.employeeCode.toLowerCase().includes(q) &&
          !r.month.includes(q)
        ) return false;
      }
      if (filterBranch && (r.branch || '') !== filterBranch) return false;
      if (filterCategory && categoryByEmpId[r.employeeId] !== filterCategory) return false;
      if (filterMonth && r.month !== filterMonth) return false;
      return true;
    });
  }, [sc.historyRecords, search, filterBranch, filterCategory, filterMonth, categoryByEmpId]);

  const hasActiveFilters = !!(filterBranch || filterCategory || filterMonth);

  async function handleExportExcel() {
    setExporting('excel');
    await exportHistoryExcel(filtered).catch(() => {});
    setExporting(null);
  }

  async function handleExportPDF() {
    setExporting('pdf');
    await exportHistoryPDF(filtered).catch(() => {});
    setExporting(null);
  }

  // ── Access guard ───────────────────────────────────────────────────────────

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <Lock className="h-16 w-16 text-slate-200" />
        <p className="text-lg font-semibold text-slate-500">Access Restricted</p>
        <p className="text-sm text-center max-w-xs">Only Application Admins can view salary configuration history.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/payroll"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Payroll"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2.5 bg-indigo-600 rounded-xl shrink-0">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Salary Configuration History</h1>
            <p className="text-sm text-slate-500">All monthly salary configurations across employees</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting === 'excel' || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {exporting === 'excel' ? 'Exporting…' : 'Excel'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting === 'pdf' || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* ── Status toast ─────────────────────────────────────────────────── */}
      {sc.status && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
          sc.status.kind === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {sc.status.kind === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {sc.status.text}
          <button onClick={sc.clearStatus} className="ml-auto opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Filters toolbar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, code, or month…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
              hasActiveFilters ? 'border-indigo-400 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
            {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {/* Record count */}
          <span className="text-xs text-slate-400 font-medium">
            {sc.historyLoading ? 'Loading…' : `${filtered.length} of ${sc.historyRecords.length} records`}
          </span>
        </div>

        {/* Expandable filter row */}
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
            {/* Branch */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All Branches</option>
                {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Month — derived from actual data range */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All Months</option>
                {monthOptions.length === 0 ? (
                  <option disabled>No data yet</option>
                ) : (
                  monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)
                )}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setFilterBranch(''); setFilterCategory(''); setFilterMonth(''); }}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── History table ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Basic Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Increase</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Gross Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Bonus Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-600 uppercase tracking-wider">Deduction Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-900 uppercase tracking-wider whitespace-nowrap">Total Salary</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sc.historyLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Banknote className="h-12 w-12 text-slate-200" />
                      <p className="font-medium">No salary configurations found</p>
                      <p className="text-sm">Adjust your filters or import records</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((cfg) => {
                  const allowanceText = (cfg.allowances || []).map((a) => `${a.name}: ${fmtAmt(a.amount)}`).join(', ') || '—';
                  const deductionText = (cfg.deductions || []).map((d) => `${d.name}: ${fmtAmt(d.amount)}`).join(', ') || '—';
                  return (
                    <tr key={cfg.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">{cfg.employeeCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{cfg.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {cfg.branch || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {cfg.month === '—' || !cfg.month ? '—' : monthLabel(cfg.month)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{fmtAmt(cfg.basicSalary)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {(cfg.increaseAmount ?? 0) > 0 ? (
                          <span className="text-emerald-600 font-medium">+{fmtAmt(cfg.increaseAmount)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{fmtAmt(cfg.grossSalary)}</td>
                      <td className="px-4 py-3 text-xs text-blue-700 max-w-[200px] truncate" title={allowanceText}>{allowanceText}</td>
                      <td className="px-4 py-3 text-xs text-red-700 max-w-[200px] truncate" title={deductionText}>{deductionText}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">{fmtAmt(cfg.totalSalary)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditTarget(cfg)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({
                              id: cfg.id,
                              month: cfg.month,
                              label: `${cfg.employeeName} (${cfg.month === '—' ? '—' : monthLabel(cfg.month)})`,
                            })}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditModal
          cfg={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            sc.loadHistory();
          }}
        />
      )}

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

      {showImport && (
        <ImportExcelModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); sc.loadHistory(); }}
        />
      )}
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function SalaryConfigHistoryPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SalaryConfigHistoryContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
