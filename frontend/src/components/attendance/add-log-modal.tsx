'use client';

import { useState, useEffect } from 'react';
import { employeeService } from '@/lib/services/employee.service';
import { organizationService } from '@/lib/services/organization.service';
import { AttendanceRecord, AttendanceFormData, AttendanceStatus, EmployeeCategory } from '@/types/attendance';
import { Employee } from '@/types/employee';

interface AddLogModalProps {
  record?: AttendanceRecord | null; // null = create mode, set = edit mode
  onSave: (data: AttendanceFormData) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present',      label: 'Present' },
  { value: 'late',         label: 'Late' },
  { value: 'absent',       label: 'Absent' },
  { value: 'on_leave',     label: 'On Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
];

function isSaturdayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00').getDay() === 6;
}

function calcLateMinutes(
  checkIn: string,
  category: string,
  rules: any[],
): number {
  const rule = rules.find((r: any) => r.category === category);
  if (!rule || rule.isFlexible || !rule.workStart) return 0;
  const [wh, wm] = rule.workStart.split(':').map(Number);
  const [ch, cm] = checkIn.split(':').map(Number);
  const cutoff = wh * 60 + wm + (Number(rule.freeMinutes) || 0);
  const arrived = ch * 60 + cm;
  return Math.max(0, arrived - cutoff);
}

export function AddLogModal({ record, onSave, onClose, isSaving }: AddLogModalProps) {
  const isEdit = !!record;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [attendanceRules, setAttendanceRules] = useState<any[]>([]);

  const [form, setForm] = useState<AttendanceFormData>({
    employeeId: record?.employeeId || '',
    employeeCode: record?.employeeCode || '',
    employeeName: record?.employeeName || '',
    branch: record?.branch || '',
    category: (record?.category as EmployeeCategory) || 'WhiteCollar',
    date: record?.date || new Date().toISOString().split('T')[0],
    status: record?.status || 'present',
    checkIn: record?.checkIn || '',
    checkOut: record?.checkOut || '',
    excuse: record?.excuse || '',
    lateMinutesOverride: record?.lateMinutesOverride,
    deductionDaysOverride: record?.deductionDaysOverride,
    saturdayWorkOverride: record?.saturdayWorkOverride,
    notes: record?.notes || '',
  });

  // Computed values (preview)
  const [previewLate, setPreviewLate] = useState(record?.lateMinutes || 0);
  const [isManualLate, setIsManualLate] = useState(record?.lateMinutesOverride !== undefined);

  useEffect(() => {
    organizationService.getAttendanceRules().then(setAttendanceRules).catch(() => {});
    employeeService.getAllEmployees().then(setEmployees).catch(() => {});
  }, []);

  // Recompute preview late minutes when checkIn or category changes (unless manual)
  useEffect(() => {
    if (isManualLate || !form.checkIn) return;
    if (form.status === 'absent' || form.status === 'on_leave' || form.status === 'unpaid_leave') {
      setPreviewLate(0);
      return;
    }
    const late = calcLateMinutes(form.checkIn, form.category, attendanceRules);
    setPreviewLate(late);
  }, [form.checkIn, form.category, form.status, attendanceRules, isManualLate]);

  const filteredEmployees = empSearch.length > 0
    ? employees.filter((e) =>
        e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(empSearch.toLowerCase()),
      ).slice(0, 8)
    : [];

  function selectEmployee(emp: Employee) {
    setForm((f) => ({
      ...f,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      branch: emp.branch || f.branch,
      category: emp.category as EmployeeCategory,
    }));
    setEmpSearch(emp.fullName);
    setShowEmpDropdown(false);
  }

  function handleField<K extends keyof AttendanceFormData>(key: K, value: AttendanceFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AttendanceFormData = { ...form };
    if (isManualLate && form.lateMinutesOverride !== undefined) {
      payload.lateMinutesOverride = form.lateMinutesOverride;
    } else {
      delete payload.lateMinutesOverride;
    }
    await onSave(payload);
  }

  const isSaturday = isSaturdayDate(form.date);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Attendance Log' : 'Add Attendance Log'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Employee name dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Employee *</label>
            <input
              type="text"
              placeholder="Search employee name or code..."
              value={empSearch || form.employeeName}
              onChange={(e) => {
                setEmpSearch(e.target.value);
                setShowEmpDropdown(true);
              }}
              onFocus={() => setShowEmpDropdown(true)}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!isEdit}
            />
            {showEmpDropdown && filteredEmployees.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {filteredEmployees.map((emp) => (
                  <button
                    type="button"
                    key={emp.id}
                    onClick={() => selectEmployee(emp)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-slate-800">{emp.fullName}</div>
                    <div className="text-xs text-slate-400">{emp.employeeCode} · {emp.branch} · {emp.category}</div>
                  </button>
                ))}
              </div>
            )}
            {form.employeeId && (
              <div className="mt-1 text-xs text-slate-400">
                {form.employeeCode} · {form.branch} · {form.category}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date *</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleField('date', e.target.value)}
                required
                className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSaturday && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Saturday Shift
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status *</label>
            <select
              value={form.status}
              onChange={(e) => handleField('status', e.target.value as AttendanceStatus)}
              required
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Check In / Check Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check In</label>
              <input
                type="time"
                value={form.checkIn || ''}
                onChange={(e) => handleField('checkIn', e.target.value || undefined)}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check Out</label>
              <input
                type="time"
                value={form.checkOut || ''}
                onChange={(e) => handleField('checkOut', e.target.value || undefined)}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Excuse */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Excuse</label>
            <input
              type="text"
              value={form.excuse || ''}
              onChange={(e) => handleField('excuse', e.target.value || undefined)}
              placeholder="Reason for late / absence..."
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Late Minutes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">
                Late Minutes
                {!isManualLate && form.checkIn && (
                  <span className="ml-2 text-blue-500">(auto-calculated: {previewLate} min)</span>
                )}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualLate}
                  onChange={(e) => {
                    setIsManualLate(e.target.checked);
                    if (!e.target.checked) handleField('lateMinutesOverride', undefined);
                  }}
                  className="rounded"
                />
                Manual override
              </label>
            </div>
            <input
              type="number"
              min={0}
              placeholder={isManualLate ? 'Enter minutes...' : String(previewLate)}
              value={isManualLate ? (form.lateMinutesOverride ?? '') : previewLate}
              disabled={!isManualLate}
              onChange={(e) => handleField('lateMinutesOverride', e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Deduction Days */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Deduction Days</label>
              <span className="text-xs text-slate-400">
                {(form.status === 'absent' || form.status === 'unpaid_leave') && form.deductionDaysOverride === undefined
                  ? 'Default: 1 day'
                  : ''}
              </span>
            </div>
            <input
              type="number"
              min={0}
              placeholder={form.status === 'absent' || form.status === 'unpaid_leave' ? '1' : '0'}
              value={form.deductionDaysOverride ?? ''}
              onChange={(e) => handleField('deductionDaysOverride', e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => handleField('notes', e.target.value || undefined)}
              rows={2}
              placeholder="Additional notes..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Update Log' : 'Add Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
