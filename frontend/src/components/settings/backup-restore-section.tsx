'use client';

import { useState, useRef } from 'react';
import { settingsService } from '@/lib/services/settings.service';
import {
  Download, Upload, Lock, CheckCircle2, AlertTriangle, FileJson, Eye, EyeOff,
} from 'lucide-react';

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function BackupRestoreSection() {
  // Export state
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ restored: number } | null>(null);
  const [importError, setImportError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!exportPassword) { alert('Please enter an encryption password'); return; }
    setExporting(true);
    try {
      const data = await settingsService.generateBackup();
      const passwordHash = await sha256(exportPassword);
      const payload = { ...data, _passwordHash: passwordHash };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hr_erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
      setExportPassword('');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importPassword) { alert('Please select a file and enter the backup password'); return; }
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      // Verify password
      const inputHash = await sha256(importPassword);
      if (parsed._passwordHash && parsed._passwordHash !== inputHash) {
        setImportError('Incorrect backup password. The data cannot be restored.');
        return;
      }
      // Remove metadata key before send
      const { _passwordHash, ...backupData } = parsed;
      const result = await settingsService.restoreBackup(backupData);
      setImportResult(result);
      setImportFile(null);
      setImportPassword('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setImportError(err.message || 'Import failed — file may be corrupted or invalid');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Backup & Restore</h2>
        <p className="text-sm text-slate-500 mt-0.5">Export a full system backup or restore from a previous backup file</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-auto pb-6">
        {/* Export Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Export Data</h3>
              <p className="text-xs text-slate-500">Backup</p>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Download a complete JSON backup of all system data. The file is protected with an encryption
            password you define — keep it safe, it cannot be recovered.
          </p>

          <ul className="space-y-1">
            {['All employee records', 'Roles & system users', 'Organisation structure', 'Attendance logs', 'CMS pages & config', 'System configuration'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5">
              <Lock className="h-3.5 w-3.5" /> Encryption Password
            </label>
            <div className="relative">
              <input
                type={showExportPwd ? 'text' : 'password'}
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Set a strong password"
              />
              <button type="button" onClick={() => setShowExportPwd(!showExportPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showExportPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button onClick={handleExport} disabled={exporting || !exportPassword}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              exportDone ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {exportDone
              ? <><CheckCircle2 className="h-4 w-4" /> Downloaded!</>
              : exporting
                ? 'Generating backup...'
                : <><Download className="h-4 w-4" /> Download Backup</>}
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <Upload className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Import Data</h3>
              <p className="text-xs text-slate-500">Restore</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Restore will <strong>merge and overwrite</strong> existing records with matching IDs.
              Existing records without matching IDs will not be deleted.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Backup File (.json)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                importFile ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
              <FileJson className={`h-6 w-6 ${importFile ? 'text-blue-500' : 'text-slate-400'}`} />
              <div className="text-center">
                {importFile
                  ? <p className="text-sm text-blue-700 font-medium">{importFile.name}</p>
                  : <p className="text-sm text-slate-500">Click to select backup file</p>}
              </div>
              <input ref={fileRef} type="file" accept=".json" className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5">
              <Lock className="h-3.5 w-3.5" /> Backup Password
            </label>
            <div className="relative">
              <input
                type={showImportPwd ? 'text' : 'password'}
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the backup's password"
              />
              <button type="button" onClick={() => setShowImportPwd(!showImportPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showImportPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {importError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700">{importError}</p>
            </div>
          )}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Successfully restored <strong>{importResult.restored}</strong> records.
              </p>
            </div>
          )}

          <button onClick={handleImport} disabled={importing || !importFile || !importPassword}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50 transition-colors">
            {importing
              ? 'Restoring data...'
              : <><Upload className="h-4 w-4" /> Restore Backup</>}
          </button>
        </div>
      </div>
    </div>
  );
}
