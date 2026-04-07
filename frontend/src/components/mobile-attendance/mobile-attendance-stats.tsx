'use client';

import { MobileAttendanceRecord, MobileDevice } from '@/lib/services/mobile-attendance.service';

interface Props {
  records: MobileAttendanceRecord[];
  devices: MobileDevice[];
}

function Card({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-slate-800">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export function MobileAttendanceStats({ records, devices }: Props) {
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const activeDevices = devices.filter((d) => d.isActive).length;
  const checkedIn = records.filter((r) => r.checkIn && !r.checkOut).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Present Today" value={present} icon="✅" color="border-green-100" />
      <Card label="Late Today" value={late} icon="⏰" color="border-yellow-100" />
      <Card label="Currently Checked-In" value={checkedIn} icon="📍" color="border-blue-100" />
      <Card label="Active Devices" value={activeDevices} icon="📱" color="border-purple-100" />
    </div>
  );
}
