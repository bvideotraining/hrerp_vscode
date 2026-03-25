'use client';

import { useState, useEffect } from 'react';
import { organizationService, Branch, MonthRange } from '@/lib/services/organization.service';
import { AttendanceFilters } from '@/types/attendance';

interface AttendanceFiltersProps {
  filters: AttendanceFilters;
  onChange: (filters: AttendanceFilters) => void;
  onSearch: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
];

export function AttendanceFiltersBar({ filters, onChange, onSearch }: AttendanceFiltersProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [resolvedRange, setResolvedRange] = useState<{ start: string; end: string } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [monthRanges, setMonthRanges] = useState<MonthRange[]>([]);

  // Load branches and month ranges once
  useEffect(() => {
    organizationService.getBranches().then(setBranches).catch(() => {});
    organizationService.getMonthRanges().then(setMonthRanges).catch(() => {});
  }, []);

  // When month/year changes, resolve date range
  useEffect(() => {
    const monthName = MONTHS[selectedMonth];
    const yearSuffix = String(selectedYear);

    // Try to find a matching month_range by monthName (case-insensitive)
    const matched = monthRanges.find(
      (r) =>
        r.monthName.toLowerCase().includes(monthName.toLowerCase()) &&
        r.monthName.includes(yearSuffix),
    ) || monthRanges.find(
      (r) => r.monthName.toLowerCase().includes(monthName.toLowerCase()),
    );

    let start: string;
    let end: string;

    if (matched) {
      start = matched.startDate;
      end = matched.endDate;
    } else {
      // Fallback: calendar month 1st → last day
      const firstDay = new Date(selectedYear, selectedMonth, 1);
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    }

    setResolvedRange({ start, end });
    onChange({ ...filters, startDate: start, endDate: end });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, monthRanges]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Month selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Branch filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Branch</label>
          <select
            value={filters.branch || ''}
            onChange={(e) => onChange({ ...filters, branch: e.target.value || undefined })}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Employee name search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Employee</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.employeeName || ''}
            onChange={(e) => onChange({ ...filters, employeeName: e.target.value || undefined })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Search button */}
        <button
          onClick={onSearch}
          className="h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Resolved date range indicator */}
      {resolvedRange && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          <span>
            Showing records for{' '}
            <strong className="text-slate-700">{resolvedRange.start}</strong>
            {' → '}
            <strong className="text-slate-700">{resolvedRange.end}</strong>
            {monthRanges.find((r) =>
              r.startDate === resolvedRange.start && r.endDate === resolvedRange.end,
            )
              ? ' (from organization month range)'
              : ' (calendar month)'}
          </span>
        </div>
      )}
    </div>
  );
}
