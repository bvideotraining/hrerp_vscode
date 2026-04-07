'use client';

import { MobileDevice } from '@/lib/services/mobile-attendance.service';

interface Props {
  devices: MobileDevice[];
  loading: boolean;
  onRevoke: (deviceId: string) => void;
}

export function MobileDevicesTable({ devices, loading, onRevoke }: Props) {
  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400">Loading devices…</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-4xl mb-3">📱</span>
        No registered devices found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['Device ID', 'Employee', 'Model', 'OS', 'Status', 'Registered', ''].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {devices.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.deviceId}</td>
              <td className="px-4 py-3 text-slate-800">{d.employeeId}</td>
              <td className="px-4 py-3 text-slate-600">{d.deviceModel ?? '—'}</td>
              <td className="px-4 py-3 text-slate-500">{d.osVersion ?? '—'}</td>
              <td className="px-4 py-3">
                {d.isActive ? (
                  <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200">Active</span>
                ) : (
                  <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border-red-200">Revoked</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {d.registeredAt?.toDate?.()?.toLocaleDateString() ?? '—'}
              </td>
              <td className="px-4 py-3">
                {d.isActive && (
                  <button
                    onClick={() => onRevoke(d.deviceId)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
