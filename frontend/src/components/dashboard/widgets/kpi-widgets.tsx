'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingDown, Clock, CalendarOff, DollarSign } from 'lucide-react';
import { useEmployee } from '@/hooks/use-employee';
import { leavesService } from '@/lib/services/leaves.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { payrollService } from '@/lib/services/payroll.service';

/* ── shared card shell ─────────────────────────────────────────── */
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      )}
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

/* ── Total Employees ────────────────────────────────────────────── */
export function KpiTotalEmployees() {
  const { getAllEmployees } = useEmployee();
  const [total, setTotal] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const act = emps.filter((e) => e.employmentStatus === 'Active').length;
      setTotal(emps.length);
      setActive(act);
    }).catch(() => { setTotal(0); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KpiCard
      title="Total Employees"
      value={total ?? '—'}
      subtitle={`${active} active`}
      icon={Users}
      iconBg="bg-blue-50"
      iconColor="text-blue-600"
      loading={total === null}
    />
  );
}

/* ── New Hires This Month ───────────────────────────────────────── */
export function KpiNewHires() {
  const { getAllEmployees } = useEmployee();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const n = emps.filter((e) => e.startDate && e.startDate.startsWith(ym)).length;
      setCount(n);
    }).catch(() => setCount(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KpiCard
      title="New Hires This Month"
      value={count ?? '—'}
      subtitle="Joined this month"
      icon={UserPlus}
      iconBg="bg-teal-50"
      iconColor="text-teal-600"
      loading={count === null}
    />
  );
}

/* ── Turnover Rate ──────────────────────────────────────────────── */
export function KpiTurnoverRate() {
  const { getAllEmployees } = useEmployee();
  const [rate, setRate] = useState<string | null>(null);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const year = String(new Date().getFullYear());
      const resigned = emps.filter(
        (e) => e.resignationDate && e.resignationDate.startsWith(year)
      ).length;
      const avg = emps.length || 1;
      setRate(`${((resigned / avg) * 100).toFixed(1)}%`);
    }).catch(() => setRate('0%'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KpiCard
      title="Turnover Rate"
      value={rate ?? '—'}
      subtitle="Resigned this year / avg. headcount"
      icon={TrendingDown}
      iconBg="bg-rose-50"
      iconColor="text-rose-600"
      loading={rate === null}
    />
  );
}

/* ── Pending Leaves ─────────────────────────────────────────────── */
export function KpiPendingLeaves() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    leavesService.getAll(undefined, 'pending').then((leaves) => {
      setCount(leaves.length);
    }).catch(() => setCount(0));
  }, []);

  return (
    <KpiCard
      title="Pending Leaves"
      value={count ?? '—'}
      subtitle="Awaiting approval"
      icon={Clock}
      iconBg="bg-amber-50"
      iconColor="text-amber-600"
      loading={count === null}
    />
  );
}

/* ── On Leave Today ─────────────────────────────────────────────── */
export function KpiOnLeaveToday() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    attendanceService.getAllLogs({ startDate: today, endDate: today, limit: 10000 }).then((logs) => {
      const n = logs.filter((l) => l.status === 'on_leave' || l.status === 'unpaid_leave').length;
      setCount(n);
    }).catch(() => setCount(0));
  }, []);

  return (
    <KpiCard
      title="On Leave Today"
      value={count ?? '—'}
      subtitle="Approved absences"
      icon={CalendarOff}
      iconBg="bg-purple-50"
      iconColor="text-purple-600"
      loading={count === null}
    />
  );
}

/* ── Late Incidents This Month ─────────────────────────────────── */
export function KpiLateIncidents() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    attendanceService.getAllLogs({ startDate, endDate, limit: 10000 }).then((logs) => {
      const n = logs.filter((l) => l.status === 'late').length;
      setCount(n);
    }).catch(() => setCount(0));
  }, []);

  return (
    <KpiCard
      title="Late Incidents (Month)"
      value={count ?? '—'}
      subtitle="Employees who arrived late"
      icon={Clock}
      iconBg="bg-orange-50"
      iconColor="text-orange-600"
      loading={count === null}
    />
  );
}

/* ── Monthly Payroll ────────────────────────────────────────────── */
export function KpiPayrollEstimate() {
  const [total, setTotal] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    payrollService.getAll({ payrollMonth: month, limit: 10000 }).then((res) => {
      const records = Array.isArray(res) ? res : ((res as any).records ?? []);
      const sum: number = records.reduce((acc: number, r: any) => acc + (r.netSalary ?? 0), 0);
      const pend = records.filter((r: any) => r.status === 'pending').length;
      setTotal(`EGP ${sum.toLocaleString()}`);
      setPending(pend);
    }).catch(() => { setTotal('EGP 0'); setPending(0); });
  }, []);

  return (
    <KpiCard
      title="Monthly Payroll"
      value={total ?? '—'}
      subtitle={`${pending} pending approvals`}
      icon={DollarSign}
      iconBg="bg-green-50"
      iconColor="text-green-600"
      loading={total === null}
    />
  );
}
