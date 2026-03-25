'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { AttendanceFiltersBar } from '@/components/attendance/attendance-filters';
import { AttendanceTable } from '@/components/attendance/attendance-table';
import { AddLogModal } from '@/components/attendance/add-log-modal';
import { ImportGuideModal } from '@/components/attendance/import-guide-modal';
import { useAttendance } from '@/hooks/use-attendance';
import { useAuth } from '@/context/auth-context';
import { AttendanceRecord, AttendanceFilters, AttendanceFormData, AttendanceSummary } from '@/types/attendance';

function computeSummary(records: AttendanceRecord[]): AttendanceSummary {
  return records.reduce(
    (acc, r) => {
      acc.totalDays = records.length;
      if (r.status === 'present') acc.present++;
      else if (r.status === 'late') acc.late++;
      else if (r.status === 'absent') acc.absent++;
      else if (r.status === 'on_leave') acc.onLeave++;
      else if (r.status === 'unpaid_leave') acc.unpaidLeave++;
      acc.totalLateMinutes += r.lateMinutes || 0;
      acc.totalDeductionDays += r.deductionDays || 0;
      return acc;
    },
    { totalDays: 0, present: 0, late: 0, absent: 0, onLeave: 0, unpaidLeave: 0, totalLateMinutes: 0, totalDeductionDays: 0 },
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${color}`}>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function AttendancePageContent() {
  const { loading, error, getAllLogs, createLog, updateLog, deleteLog, bulkImport, getExportData } = useAttendance();
  const { user, canDo } = useAuth();

  const canCreate = canDo('attendance', 'create');
  const canEdit   = canDo('attendance', 'edit');
  const canDelete = canDo('attendance', 'delete');

  // Own-scope: restrict to the logged-in employee's records
  // Own-scope: custom access role + linked to an employee record
  const isOwnScope = user?.accessType === 'custom' && !!(user?.employeeId);
  const ownEmployeeId = isOwnScope ? (user?.employeeId || '') : undefined;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filters, setFilters] = useState<AttendanceFilters>(ownEmployeeId ? { employeeId: ownEmployeeId } : {});
  const [hasLoaded, setHasLoaded] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRecords = useCallback(async (f: AttendanceFilters) => {
    // Always enforce own-scope filter
    const effectiveFilters = ownEmployeeId ? { ...f, employeeId: ownEmployeeId } : f;
    const data = await getAllLogs(effectiveFilters);
    setRecords(data);
    setHasLoaded(true);
  }, [getAllLogs, ownEmployeeId]);

  // Auto-load records when in own-scope mode
  useEffect(() => {
    if (isOwnScope && ownEmployeeId) {
      fetchRecords({ employeeId: ownEmployeeId });
    }
  }, [isOwnScope, ownEmployeeId, fetchRecords]);

  function handleFiltersChange(f: AttendanceFilters) {
    setFilters(f);
  }

  function handleSearch() {
    fetchRecords(filters);
  }

  async function handleSaveLog(data: AttendanceFormData) {
    setIsSaving(true);
    if (editRecord) {
      await updateLog(editRecord.id, data);
    } else {
      await createLog(data);
    }
    setIsSaving(false);
    setShowAddModal(false);
    setEditRecord(null);
    fetchRecords(filters);
    setSuccessMsg(editRecord ? 'Record updated.' : 'Log added.');
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attendance record?')) return;
    await deleteLog(id);
    fetchRecords(filters);
  }

  function handleEdit(record: AttendanceRecord) {
    setEditRecord(record);
    setShowAddModal(true);
  }

  // â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleExportExcel() {
    const data = await getExportData(filters);
    const rows = data.map((r) => ({
      Date: r.date,
      Day: r.dayOfWeek,
      'Employee Name': r.employeeName,
      'Employee Code': r.employeeCode,
      Branch: r.branch,
      Category: r.category,
      'Check In': r.checkIn || '',
      'Check Out': r.checkOut || '',
      'Saturday Work': r.saturdayWork ? 'Yes' : 'No',
      Status: r.status,
      'Late Minutes': r.lateMinutes,
      'Deduction Days': r.deductionDays,
      Excuse: r.excuse || '',
      Notes: r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${filters.startDate || 'all'}_${filters.endDate || ''}.xlsx`);
  }

  async function handleExportPDF() {
    const data = await getExportData(filters);
    // Dynamically import jsPDF to avoid SSR issues
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Attendance Report', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Day', 'Employee', 'Code', 'Branch', 'Category', 'In', 'Out', 'Status', 'Late Min', 'Deduction']],
      body: data.map((r) => [
        r.date, r.dayOfWeek, r.employeeName, r.employeeCode, r.branch, r.category,
        r.checkIn || '', r.checkOut || '', r.status, r.lateMinutes, r.deductionDays,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`attendance_${filters.startDate || 'all'}.pdf`);
  }

  // â”€â”€ Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleFileImport(file: File) {
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const records: AttendanceFormData[] = rows.map((row) => ({
        employeeId: String(row.employeeId || ''),
        employeeCode: String(row.employeeCode || ''),
        employeeName: String(row.employeeName || ''),
        branch: String(row.branch || ''),
        category: row.category || 'WhiteCollar',
        date: String(row.date || ''),
        status: row.status || 'present',
        checkIn: row.checkIn ? String(row.checkIn) : undefined,
        checkOut: row.checkOut ? String(row.checkOut) : undefined,
        excuse: row.excuse ? String(row.excuse) : undefined,
        lateMinutesOverride: row.lateMinutesOverride !== undefined && row.lateMinutesOverride !== ''
          ? Number(row.lateMinutesOverride)
          : undefined,
        deductionDaysOverride: row.deductionDaysOverride !== undefined && row.deductionDaysOverride !== ''
          ? Number(row.deductionDaysOverride)
          : undefined,
        saturdayWorkOverride: row.saturdayWorkOverride !== undefined && row.saturdayWorkOverride !== ''
          ? String(row.saturdayWorkOverride).toLowerCase() === 'true'
          : undefined,
        notes: row.notes ? String(row.notes) : undefined,
      }));
      const result = await bulkImport(records);
      setShowImport(false);
      setSuccessMsg(`Imported ${result?.imported ?? 0} records successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchRecords(filters);
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  }

  const summary = computeSummary(records);

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance Tracker</h2>
          <p className="text-slate-500 text-sm mt-0.5">Track daily employee check-ins, late minutes &amp; deductions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreate && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          )}
          {!isOwnScope && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel
          </button>
          )}
          {!isOwnScope && (
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
          )}
          {canCreate && (
          <button
            onClick={() => { setEditRecord(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Log
          </button>
          )}
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Filters */}
      <AttendanceFiltersBar filters={filters} onChange={handleFiltersChange} onSearch={handleSearch} />

      {/* Summary cards */}
      {hasLoaded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Total Records" value={summary.totalDays} color="border-slate-200" />
          <SummaryCard label="Present" value={summary.present} color="border-green-200" />
          <SummaryCard label="Late" value={summary.late} color="border-yellow-200" />
          <SummaryCard label="Absent" value={summary.absent} color="border-red-200" />
          <SummaryCard label="On Leave" value={summary.onLeave} color="border-blue-200" />
          <SummaryCard label="Late Minutes (total)" value={summary.totalLateMinutes} color="border-orange-200" />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && hasLoaded && (
        <AttendanceTable
          records={records}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Empty state before first search */}
      {!loading && !hasLoaded && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">â°</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a period and click Search</h3>
          <p className="text-slate-400 text-sm">Your attendance records will appear here.</p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddLogModal
          record={editRecord}
          onSave={handleSaveLog}
          onClose={() => { setShowAddModal(false); setEditRecord(null); }}
          isSaving={isSaving}
        />
      )}

      {showImport && (
        <ImportGuideModal
          onClose={() => setShowImport(false)}
          onFileImport={handleFileImport}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute moduleId="attendance">
      <DashboardLayout>
        <AttendancePageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
