'use client';

import { useState, useEffect } from 'react';
import { payrollService } from '@/lib/services/payroll.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { bonusesService } from '@/lib/services/bonuses.service';
import { useEmployee } from '@/hooks/use-employee';

/* ── Card shell ─────────────────────────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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

/* ── Payroll Trend (6 months, CSS bars) ─────────────────────────── */
export function ChartPayrollTrend() {
  interface MonthBar { label: string; basic: number; bonuses: number; deductions: number; total: number; }
  const [bars, setBars] = useState<MonthBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    Promise.all(
      months.map((m) => payrollService.getAll({ payrollMonth: m, limit: 10000 }).catch(() => ({ records: [] })))
    ).then((results) => {
      const data: MonthBar[] = results.map((res, i) => {
        const records: any[] = Array.isArray(res) ? res : ((res as any).records ?? []);
        const basic = records.reduce((a: number, r: any) => a + (r.basicSalary ?? 0), 0);
        const bonuses = records.reduce((a: number, r: any) => a + (r.bonuses ?? 0) + (r.totalAllowances ?? 0), 0);
        const deductions = records.reduce((a: number, r: any) => a + (r.totalDeductions ?? 0), 0);
        const total = records.reduce((a: number, r: any) => a + (r.netSalary ?? 0), 0);
        return { label: months[i], basic, bonuses, deductions, total };
      });
      setBars(data);
    }).finally(() => setLoading(false));
  }, []);

  const maxTotal = Math.max(...bars.map((b) => b.basic + b.bonuses), 1);

  return (
    <ChartCard title="Payroll Trend (6 Months)" subtitle="Total expenditure breakdown">
      {loading ? (
        <div className="flex items-end gap-4 h-40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-1 bg-slate-100 animate-pulse rounded-t" style={{ height: `${40 + i * 15}%` }} />
          ))}
        </div>
      ) : bars.every((b) => b.total === 0) ? (
        <p className="text-slate-400 text-sm text-center py-10">No payroll data available.</p>
      ) : (
        <div className="flex items-end gap-2 h-44">
          {bars.map((b) => {
            const basicH = ((b.basic / maxTotal) * 100).toFixed(1);
            const bonusH = ((b.bonuses / maxTotal) * 100).toFixed(1);
            const deductH = ((b.deductions / maxTotal) * 100).toFixed(1);
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '160px' }}>
                  <div className="w-full flex flex-col-reverse rounded overflow-hidden">
                    <div className="w-full bg-indigo-500" style={{ height: `${basicH}%`, minHeight: b.basic > 0 ? 4 : 0 }} title={`Basic: ${b.basic.toLocaleString()}`} />
                    <div className="w-full bg-green-400" style={{ height: `${bonusH}%`, minHeight: b.bonuses > 0 ? 4 : 0 }} title={`Allowances+Bonuses: ${b.bonuses.toLocaleString()}`} />
                    <div className="w-full bg-red-400" style={{ height: `${deductH}%`, minHeight: b.deductions > 0 ? 4 : 0 }} title={`Deductions: ${b.deductions.toLocaleString()}`} />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{b.label.slice(0, 7)}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-4 mt-3">
        {[['bg-indigo-500', 'Basic'], ['bg-green-400', 'Allowances'], ['bg-red-400', 'Deductions']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── Today's Attendance (SVG donut) ─────────────────────────────── */
export function ChartTodayAttendance() {
  const [data, setData] = useState<{ present: number; absent: number; onLeave: number } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    attendanceService.getAllLogs({ startDate: today, endDate: today, limit: 10000 }).then((logs) => {
      const present = logs.filter((l) => l.status === 'present' || l.status === 'late').length;
      const absent = logs.filter((l) => l.status === 'absent').length;
      const onLeave = logs.filter((l) => l.status === 'on_leave' || l.status === 'unpaid_leave').length;
      setData({ present, absent, onLeave });
    }).catch(() => setData({ present: 0, absent: 0, onLeave: 0 }));
  }, []);

  const total = (data?.present ?? 0) + (data?.absent ?? 0) + (data?.onLeave ?? 0);

  // Build SVG donut
  const R = 56;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * R;

  function buildArcs(vals: number[], colors: string[]) {
    let offset = 0;
    return vals.map((v, i) => {
      const fraction = total > 0 ? v / total : 0;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const el = (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={colors[i]}
          strokeWidth={18}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={-offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      );
      offset += dash;
      return el;
    });
  }

  const arcs = buildArcs(
    [data?.present ?? 0, data?.absent ?? 0, data?.onLeave ?? 0],
    ['#22c55e', '#ef4444', '#f59e0b'],
  );

  return (
    <ChartCard title="Today's Attendance" subtitle="Present · Absent · On Leave">
      <div className="flex flex-col items-center">
        {data === null ? (
          <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
        ) : (
          <svg width={130} height={130}>
            {total === 0 ? (
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e2e8f0" strokeWidth={18} />
            ) : arcs}
          </svg>
        )}
        <div className="flex gap-5 mt-3">
          {[
            { color: 'bg-green-500', label: 'Present', val: data?.present ?? 0 },
            { color: 'bg-red-500',   label: 'Absent',  val: data?.absent ?? 0 },
            { color: 'bg-amber-400', label: 'On Leave', val: data?.onLeave ?? 0 },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

/* ── Bonuses & Allowances by Branch ─────────────────────────────── */
export function ChartBonusesByBranch() {
  interface BranchBonus { branch: string; total: number; }
  const [data, setData] = useState<BranchBonus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bonusesService.getAll().then((records) => {
      const map = new Map<string, number>();
      for (const r of records) {
        map.set(r.branch, (map.get(r.branch) ?? 0) + (r.total ?? 0));
      }
      const arr = [...map.entries()].map(([branch, total]) => ({ branch, total })).sort((a, b) => b.total - a.total);
      setData(arr);
    }).catch(() => setData([])).finally(() => setLoading(false));
  }, []);

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ChartCard title="Bonuses & Allowances by Branch" subtitle="Total payout this month per branch">
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No bonus data for this month.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.branch}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-700">{d.branch}</span>
                <span className="text-xs text-slate-500">{d.total.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(d.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

/* ── Department Distribution ─────────────────────────────────────── */
export function ChartHeadcountByDept() {
  interface DeptCount { dept: string; count: number; }
  const { getAllEmployees } = useEmployee();
  const [data, setData] = useState<DeptCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEmployees().then((emps) => {
      const map = new Map<string, number>();
      for (const e of emps) {
        if (e.department) map.set(e.department, (map.get(e.department) ?? 0) + 1);
      }
      const arr = [...map.entries()].map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count);
      setData(arr);
    }).catch(() => setData([])).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ChartCard title="Department Distribution" subtitle="Active headcount by department">
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No department data available.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.dept}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-700">{d.dept}</span>
                <span className="text-xs text-slate-500">{d.count}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

/* ── Salary Distribution by Branch ─────────────────────────────── */
export function ChartSalaryDistribution() {
  interface BranchSalary { branch: string; total: number; count: number; }
  const [data, setData] = useState<BranchSalary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    payrollService.getAll({ payrollMonth: month, limit: 10000 }).then((res) => {
      const records: any[] = Array.isArray(res) ? res : ((res as any).records ?? []);
      const map = new Map<string, BranchSalary>();
      for (const r of records) {
        const b = r.branch || 'Unknown';
        const cur = map.get(b) ?? { branch: b, total: 0, count: 0 };
        cur.total += r.netSalary ?? 0;
        cur.count += 1;
        map.set(b, cur);
      }
      setData([...map.values()].sort((a, b) => b.total - a.total));
    }).catch(() => setData([])).finally(() => setLoading(false));
  }, []);

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ChartCard title="Salary Distribution by Branch" subtitle="Total salary cost and headcount per branch">
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No data available.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.branch}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-700">{d.branch}</span>
                <span className="text-xs text-slate-500">{d.total.toLocaleString()} EGP · {d.count} emp</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(d.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
