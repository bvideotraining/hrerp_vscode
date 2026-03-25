'use client';

import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  present:      { label: 'Present',      className: 'bg-green-100 text-green-700' },
  late:         { label: 'Late',         className: 'bg-yellow-100 text-yellow-700' },
  absent:       { label: 'Absent',       className: 'bg-red-100 text-red-700' },
  on_leave:     { label: 'On Leave',     className: 'bg-blue-100 text-blue-700' },
  unpaid_leave: { label: 'Unpaid Leave', className: 'bg-orange-100 text-orange-700' },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  WhiteCollar: { label: 'White Collar', className: 'bg-blue-50 text-blue-700' },
  BlueCollar:  { label: 'Blue Collar',  className: 'bg-orange-50 text-orange-700' },
  Management:  { label: 'Management',  className: 'bg-purple-50 text-purple-700' },
  PartTime:    { label: 'Part-Time',   className: 'bg-teal-50 text-teal-700' },
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function AttendanceTable({ records, onEdit, onDelete, canEdit = true, canDelete = true }: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="text-5xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">No records found</h3>
        <p className="text-slate-400 text-sm">Adjust your filters or add a new attendance log.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50">
              {[
                'Date & Day',
                'Employee',
                'Branch',
                'Category',
                'Time Log',
                'Saturday',
                'Status',
                'Late Min',
                'Deduction Days',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const status = STATUS_CONFIG[record.status] || {
                label: record.status,
                className: 'bg-slate-100 text-slate-600',
              };
              const category = CATEGORY_CONFIG[record.category] || {
                label: record.category,
                className: 'bg-slate-100 text-slate-600',
              };

              return (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Date & Day */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-800">{record.date}</div>
                    <div className="text-xs text-slate-400">{record.dayOfWeek}</div>
                  </td>

                  {/* Employee */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-800">{record.employeeName}</div>
                    <div className="text-xs text-slate-400">{record.employeeCode}</div>
                  </td>

                  {/* Branch */}
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {record.branch}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge label={category.label} className={category.className} />
                  </td>

                  {/* Time Log */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {record.checkIn || record.checkOut ? (
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <span className="font-mono">{record.checkIn || '--:--'}</span>
                        <span className="text-slate-300">→</span>
                        <span className="font-mono">{record.checkOut || '--:--'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>

                  {/* Saturday Work */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {record.saturdayWork ? (
                      <Badge label="Saturday" className="bg-green-100 text-green-700" />
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge label={status.label} className={status.className} />
                  </td>

                  {/* Late Minutes */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {record.lateMinutes > 0 ? (
                      <span className="text-sm font-semibold text-red-600">
                        {record.lateMinutes}
                        <span className="font-normal text-xs text-slate-400 ml-0.5">min</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>

                  {/* Deduction Days */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {record.deductionDays > 0 ? (
                      <span className="text-sm font-semibold text-orange-600">
                        {record.deductionDays}
                        <span className="font-normal text-xs text-slate-400 ml-0.5">day{record.deductionDays !== 1 ? 's' : ''}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      )}
                      {canDelete && (
                      <button
                        onClick={() => onDelete(record.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-slate-300">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
