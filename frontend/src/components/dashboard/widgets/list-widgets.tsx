'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/hooks/use-employee';
import { leavesService } from '@/lib/services/leaves.service';
import type { LeaveRequest } from '@/lib/services/leaves.service';
import {
  UserPlus, Cake, Users, CheckSquare, DollarSign, Calendar,
  BarChart2, ArrowRight,
} from 'lucide-react';

/* ── Card shell ─────────────────────────────────────────────────── */
function ListCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ── New Hires This Month (list) ────────────────────────────────── */
export function ListNewHires() {
  const { getAllEmployees } = useEmployee();
  const [hires, setHires] = useState<{ name: string; jobTitle: string; branch: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const list = emps
        .filter((e) => e.startDate?.startsWith(ym))
        .map((e) => ({ name: e.fullName, jobTitle: e.jobTitle ?? '', branch: e.branch ?? '' }));
      setHires(list);
    }).catch(() => setHires([])).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ListCard title="New Hires This Month" subtitle="0 employees joined">
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}</div>
      ) : hires.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-slate-400">
          <Users className="h-8 w-8 opacity-40" />
          <p className="text-sm">No new hires this month.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hires.slice(0, 5).map((h, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
              <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                {h.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{h.name}</p>
                <p className="text-xs text-slate-500 truncate">{h.jobTitle} · {h.branch}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ListCard>
  );
}

/* ── Upcoming Birthdays ─────────────────────────────────────────── */
export function ListUpcomingBirthdays() {
  const { getAllEmployees } = useEmployee();
  const [people, setPeople] = useState<{ name: string; date: string; daysLeft: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const today = new Date();
      const list: { name: string; date: string; daysLeft: number }[] = [];
      for (const e of emps) {
        if (!e.dateOfBirth) continue;
        const [, mm, dd] = e.dateOfBirth.split('-');
        const thisYear = new Date(today.getFullYear(), Number(mm) - 1, Number(dd));
        if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
        const daysLeft = Math.ceil((thisYear.getTime() - today.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 14) {
          list.push({ name: e.fullName, date: `${mm}/${dd}`, daysLeft });
        }
      }
      list.sort((a, b) => a.daysLeft - b.daysLeft);
      setPeople(list);
    }).catch(() => setPeople([])).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ListCard title="Upcoming Birthdays" subtitle="Next 14 days">
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}</div>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-slate-400">
          <Cake className="h-8 w-8 opacity-40" />
          <p className="text-sm">No birthdays in the next 14 days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm flex-shrink-0">🎂</span>
                <span className="text-sm text-slate-800">{p.name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-600">{p.date}</p>
                <p className="text-[10px] text-slate-400">{p.daysLeft === 0 ? 'Today!' : `${p.daysLeft}d`}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ListCard>
  );
}

/* ── Pending Leave Requests (list) ──────────────────────────────── */
export function ListPendingLeaves() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leavesService.getAll(undefined, 'pending').then((l) => {
      setLeaves(l.slice(0, 6));
    }).catch(() => setLeaves([])).finally(() => setLoading(false));
  }, []);

  return (
    <ListCard title="Pending Leave Requests" subtitle="Awaiting review">
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}</div>
      ) : leaves.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{l.employeeName}</p>
                <p className="text-xs text-slate-500">{l.leaveType} · {l.totalDays}d</p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
            </div>
          ))}
        </div>
      )}
    </ListCard>
  );
}

/* ── Quick Actions ──────────────────────────────────────────────── */
export function QuickActionsWidget() {
  const router = useRouter();

  const actions = [
    { label: 'Add Employee',    icon: UserPlus,     path: '/dashboard/employees?action=add',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    { label: 'Approve Leaves',  icon: CheckSquare,  path: '/dashboard/leaves',                bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
    { label: 'Generate Payroll',icon: DollarSign,   path: '/dashboard/payroll',               bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200'},
    { label: 'Mark Attendance', icon: Calendar,     path: '/dashboard/attendance',            bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    { label: 'View Reports',    icon: BarChart2,    path: '/dashboard/reports',               bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
      <h3 className="text-base font-semibold text-slate-800 mb-1">Quick Actions</h3>
      <p className="text-xs text-slate-500 mb-4">Common HR tasks</p>
      <div className="space-y-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => router.push(a.path)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border ${a.bg} ${a.text} ${a.border} hover:opacity-80 transition-opacity text-sm font-medium`}
            >
              <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{a.label}</span>
              <ArrowRight className="h-3 w-3 opacity-50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
