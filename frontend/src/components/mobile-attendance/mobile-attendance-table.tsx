'use client';

import { MobileAttendanceRecord } from '@/lib/services/mobile-attendance.service';

interface Props {
  records: MobileAttendanceRecord[];
  loading: boolean;
  employeeNames?: Record<string, string>;
  branchNames?: Record<string, string>;
  onEdit?: (record: MobileAttendanceRecord) => void;
  onDelete?: (record: MobileAttendanceRecord) => void;
}

export function MobileAttendanceTable({ records, loading, employeeNames = {}, branchNames = {}, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        Loading records…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-4xl mb-3">📋</span>
        No mobile attendance records found.
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    present: 'bg-green-50 text-green-700 border-green-200',
    late: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    absent: 'bg-red-50 text-red-700 border-red-200',
  };

  const headers = ['Date', 'Employee', 'Branch', 'Check-In', 'Check-Out', 'Distance', 'Status'];
  if (onEdit || onDelete) headers.push('Actions');

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r, i) => (
            <tr key={r.id ?? i} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.date}</td>
              <td className="px-4 py-3 text-slate-800">{employeeNames[r.employeeId] ?? r.employeeId}</td>
              <td className="px-4 py-3 text-slate-600">{branchNames[r.branchId] ?? r.branchId}</td>
              <td className="px-4 py-3 text-slate-700">{r.checkIn ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">{r.checkOut ?? '—'}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {r.checkInDistance != null ? `${r.checkInDistance}m` : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor[r.status ?? ''] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {r.status ?? 'unknown'}
                </span>
              </td>
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(r)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(r)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
