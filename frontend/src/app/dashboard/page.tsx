'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { dashboardLayoutService } from '@/lib/services/dashboard-layout.service';
import { WIDGET_MAP, WIDGET_REGISTRY, templateToWidgets, type WidgetItem } from '@/lib/dashboard-widget-registry';
import { Loader2 } from 'lucide-react';
import { employeeService } from '@/lib/services/employee.service';
import { leavesService, type LeaveRequest } from '@/lib/services/leaves.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { bonusesService, type BonusRecord } from '@/lib/services/bonuses.service';
import { salaryIncreasesService } from '@/lib/services/salary-config.service';
import type { SalaryIncrease } from '@/types/salary-increases';
import { socialInsuranceService } from '@/lib/services/social-insurance.service';
import { useSettings, getCurrencySymbol } from '@/context/settings-context';
import type { Employee } from '@/types/employee';
import type { AttendanceRecord } from '@/types/attendance';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  employees: Employee[];
  pendingLeaves: LeaveRequest[];
  approvedLeaves: LeaveRequest[];
  allLeaves: LeaveRequest[];
  lateThisMonth: AttendanceRecord[];
  weekAttendance: AttendanceRecord[];
  bonusesThisMonth: BonusRecord[];
  socialInsuranceCount: number;
  salaryIncreasesThisMonth: SalaryIncrease[];
  salaryIncreasesNextMonth: SalaryIncrease[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstOfMonthStr() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0];
}
function nDaysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
}
function currentMonthId() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonthId() {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function formatCurrency(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toString();
}

function settled<T>(res: PromiseSettledResult<T>, fallback: T): T {
  return res.status === 'fulfilled' ? res.value : fallback;
}
function getTs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts.seconds) return ts.seconds * 1000;
  if (typeof ts === 'string') return new Date(ts).getTime();
  return 0;
}
function timeAgo(ts: any): string {
  const ms = getTs(ts);
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EMPTY_DATA: DashboardData = {
  employees: [], pendingLeaves: [], approvedLeaves: [], allLeaves: [],
  lateThisMonth: [], weekAttendance: [], bonusesThisMonth: [], socialInsuranceCount: 0,
  salaryIncreasesThisMonth: [], salaryIncreasesNextMonth: [],
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, isLoading } = useAuth();
  const { currency: currencyCode, currencySymbol } = useSettings();
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [dataLoading, setDataLoading] = useState(true);
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.accessType === 'full';

  useEffect(() => {
    const roleId = (user as any)?.roleId as string | undefined;
    if (!roleId) {
      setWidgets(templateToWidgets('default'));
      setLayoutLoading(false);
      return;
    }
    dashboardLayoutService
      .getLayout(roleId)
      .then((layout) => {
        let resolved: WidgetItem[];
        if (layout?.widgets?.length) {
          resolved = [...layout.widgets].sort((a, b) => a.order - b.order);
        } else {
          resolved = templateToWidgets('default');
        }
        // Inject registered widgets that are missing from the saved layout
        // (happens when new widgets are added after the layout was last saved).
        const savedIds = new Set(resolved.map((w) => w.id));
        const nextOrder = resolved.length;
        const missing = WIDGET_REGISTRY
          .filter((def) => !savedIds.has(def.id))
          .map((def, idx) => ({ id: def.id, order: nextOrder + idx }));
        setWidgets([...resolved, ...missing]);
      })
      .catch(() => setWidgets(templateToWidgets('default')))
      .finally(() => setLayoutLoading(false));
  }, [(user as any)?.roleId]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setData(EMPTY_DATA);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    const today = todayStr();
    const firstOfMonth = firstOfMonthStr();
    const sevenDaysAgo = nDaysAgoStr(7);
    const monthId = currentMonthId();
    const thisMonth = currentMonthId();
    const nxtMonth = nextMonthId();
    Promise.allSettled([
      employeeService.getAllEmployees(),
      leavesService.getAll(undefined, 'pending'),
      leavesService.getAll(undefined, 'approved'),
      leavesService.getAll(),
      attendanceService.getAllLogs({ startDate: firstOfMonth, endDate: today, status: 'late', limit: 500 }),
      attendanceService.getAllLogs({ startDate: sevenDaysAgo, endDate: today, limit: 1000 }),
      isAdmin ? bonusesService.getAll(monthId) : Promise.resolve<BonusRecord[]>([]),
      isAdmin ? socialInsuranceService.getAll() : Promise.resolve([]),
      isAdmin ? salaryIncreasesService.getAll() : Promise.resolve<SalaryIncrease[]>([]),
    ] as const).then(([er, pr, ar, lr, lateR, wkR, bonR, siR, salIncR]) => {
      const allIncreases = settled(salIncR, []) as SalaryIncrease[];
      setData({
        employees: settled(er, []),
        pendingLeaves: settled(pr, []),
        approvedLeaves: settled(ar, []),
        allLeaves: settled(lr, []),
        lateThisMonth: settled(lateR, []),
        weekAttendance: settled(wkR, []),
        bonusesThisMonth: settled(bonR, []),
        socialInsuranceCount: settled(siR, []).length,
        salaryIncreasesThisMonth: allIncreases.filter((r) => r.applyMonth === thisMonth),
        salaryIncreasesNextMonth: allIncreases.filter((r) => r.applyMonth === nxtMonth),
      });
    }).finally(() => setDataLoading(false));
  }, [isLoading, (user as any)?.id, isAdmin]);

  if (layoutLoading || dataLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  const visibleWidgets = widgets.filter((w) => {
    const def = WIDGET_MAP.get(w.id);
    if (!def) return false;
    if (def.adminOnly && !isAdmin) return false;
    return true;
  });
  const kpiWidgets = visibleWidgets.filter((w) => WIDGET_MAP.get(w.id)?.category === 'kpi');
  const otherWidgets = visibleWidgets.filter((w) => WIDGET_MAP.get(w.id)?.category !== 'kpi');

  return (
    <div className="p-8">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome{(user as any)?.name ? `, ${(user as any).name}` : ''}
        </h2>
        <p className="text-slate-600">Your personalised HR operations dashboard</p>
      </div>

      {/* KPI row */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiWidgets.map((w) => (
            <WidgetRenderer key={w.id} widgetId={w.id} data={data} currencyCode={currencyCode} />
          ))}
        </div>
      )}

      {/* Charts + lists row */}
      {otherWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {otherWidgets.map((w) => (
            <WidgetRenderer key={w.id} widgetId={w.id} data={data} currencyCode={currencyCode} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Widget renderer ─────────────────────────────────────────────────────────

function WidgetRenderer({ widgetId, data, currencyCode }: { widgetId: string; data: DashboardData; currencyCode: string }) {
  const today = todayStr();
  const onLeaveToday = data.approvedLeaves.filter((l) => l.startDate <= today && l.endDate >= today);
  const totalPayroll = data.employees.reduce((s, e) => s + (e.currentSalary || 0), 0);
  const totalBonuses = data.bonusesThisMonth.reduce((s, b) => s + (b.total || 0), 0);
  const currency = getCurrencySymbol(currencyCode);

  switch (widgetId) {
    // KPI widgets
    case 'kpi_total_employees':
      return <KPICard title="Total Employees" value={String(data.employees.length)} change="Active headcount" trend="neutral" color="blue" icon="👥" />;
    case 'kpi_payroll_estimate':
      return <KPICard title="Payroll Estimate" value={`${currency} ${formatCurrency(totalPayroll)}`} change="Monthly salary total" trend="neutral" color="blue" icon="💰" />;
    case 'kpi_pending_leaves':
      return <KPICard title="Pending Leaves" value={String(data.pendingLeaves.length)} change="Awaiting approval" trend="neutral" color="orange" icon="📋" />;
    case 'kpi_on_leave_today':
      return (
        <KPICard
          title="On Leave Today"
          value={String(onLeaveToday.length)}
          change={data.employees.length > 0 ? `${((onLeaveToday.length / data.employees.length) * 100).toFixed(1)}% of staff` : '—'}
          trend="neutral"
          color="purple"
          icon="🏖️"
        />
      );
    case 'kpi_late_incidents':
      return <KPICard title="Late Incidents" value={String(data.lateThisMonth.length)} change="This month" trend="down" color="red" icon="⏰" />;
    case 'kpi_bonuses_total':
      return <KPICard title="Total Bonuses" value={`${currency} ${formatCurrency(totalBonuses)}`} change="This month" trend="neutral" color="orange" icon="🎁" />;
    case 'kpi_social_insurance':
      return <KPICard title="Social Insurance" value={String(data.socialInsuranceCount)} change="Registered employees" trend="neutral" color="blue" icon="🛡️" />;
    case 'kpi_salary_increases_next_month': {
      const nextTotal = data.salaryIncreasesNextMonth.reduce((s, r) => s + (r.increaseAmount || 0), 0);
      return <KPICard title="Upcoming Increases" value={`${currency} ${formatCurrency(nextTotal)}`} change={`${data.salaryIncreasesNextMonth.length} employee(s) next month`} trend="up" color="blue" icon="📈" />;
    }

    // Chart widgets
    case 'chart_attendance_trend':
      return <ChartCard title="Attendance Trend" icon="📈"><AttendanceTrend records={data.weekAttendance} /></ChartCard>;
    case 'chart_salary_distribution':
      return <ChartCard title="Salary Distribution" icon="📊"><SalaryDistribution employees={data.employees} currencyCode={currencyCode} /></ChartCard>;
    case 'chart_salary_increases_by_branch':
      return <ChartCard title="Salary Increases by Branch" icon="📊"><SalaryIncreasesByBranch increases={data.salaryIncreasesThisMonth} currencyCode={currencyCode} /></ChartCard>;
    case 'chart_leave_types':
      return <ChartCard title="Leave Types" icon="📅"><LeaveTypes leaves={data.allLeaves} /></ChartCard>;
    case 'chart_headcount_by_dept':
      return <ChartCard title="Headcount by Department" icon="🏢"><HeadcountByDept employees={data.employees} /></ChartCard>;

    // List widgets
    case 'list_late_employees':
      return <ChartCard title="Top Late Employees" icon="👥"><LatEmployeesList records={data.lateThisMonth} /></ChartCard>;
    case 'list_recent_activities':
      return <ChartCard title="Recent Activities" icon="📆"><RecentActivities leaves={data.allLeaves} /></ChartCard>;
    case 'list_pending_leaves':
      return <ChartCard title="Pending Leave Requests" icon="📋"><PendingLeaves leaves={data.pendingLeaves} /></ChartCard>;

    // Utility widgets
    case 'quick_actions':
      return <ChartCard title="Quick Actions" icon="⚡"><QuickActions /></ChartCard>;
    case 'system_status':
      return <ChartCard title="System Status" icon="✅"><SystemStatus /></ChartCard>;

    default:
      return null;
  }
}

// ─── Shared card wrappers ─────────────────────────────────────────────────────

function KPICard({
  title, value, change, trend, color, icon,
}: {
  title: string; value: string; change: string;
  trend: 'up' | 'down' | 'neutral'; color: string; icon: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
  };
  const trendColor: Record<string, string> = {
    up: 'text-green-600', down: 'text-red-600', neutral: 'text-slate-600',
  };
  return (
    <div className={`rounded-lg border p-6 ${colorMap[color] ?? 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-2">{value}</p>
      <p className={`text-sm ${trendColor[trend]}`}>{change}</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Widget implementations ───────────────────────────────────────────────────

function LatEmployeesList({ records }: { records: AttendanceRecord[] }) {
  const countMap = new Map<string, { name: string; count: number; minutes: number }>();
  for (const r of records) {
    const entry = countMap.get(r.employeeId) ?? { name: r.employeeName, count: 0, minutes: 0 };
    entry.count++;
    entry.minutes += r.lateMinutesOverride ?? r.lateMinutes ?? 0;
    countMap.set(r.employeeId, entry);
  }
  const sorted = [...countMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  if (sorted.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No late records this month</p>;
  return (
    <div className="space-y-3">
      {sorted.map((emp, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-900">{emp.name}</p>
            <p className="text-xs text-slate-600">{emp.minutes} mins total</p>
          </div>
          <span className="text-xs font-semibold text-red-600">{emp.count} times</span>
        </div>
      ))}
    </div>
  );
}

function SalaryDistribution({ employees, currencyCode }: { employees: Employee[]; currencyCode: string }) {
  const branchMap = new Map<string, number>();
  for (const emp of employees) {
    if (!emp.branch) continue;
    branchMap.set(emp.branch, (branchMap.get(emp.branch) ?? 0) + (emp.currentSalary || 0));
  }
  const total = [...branchMap.values()].reduce((s, v) => s + v, 0);
  const items = [...branchMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([branch, salary]) => ({ branch, salary, percent: total > 0 ? Math.round((salary / total) * 100) : 0 }));
  const currency = getCurrencySymbol(currencyCode);
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No salary data</p>;
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-900">{item.branch}</p>
            <p className="text-xs text-slate-600">{currency} {formatCurrency(item.salary)}</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: '✏️ Mark Attendance', href: '/dashboard/attendance' },
    { label: '✅ Approve Leaves', href: '/dashboard/leaves' },
    { label: '👤 Add Employee', href: '/dashboard/employees' },
    { label: '📊 View Reports', href: '/dashboard/reports' },
  ];
  return (
    <div className="space-y-2">
      {actions.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="block w-full p-3 rounded-lg text-sm font-medium text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function RecentActivities({ leaves }: { leaves: LeaveRequest[] }) {
  const recent = [...leaves].sort((a, b) => getTs(b.updatedAt) - getTs(a.updatedAt)).slice(0, 5);
  if (recent.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>;
  return (
    <div className="space-y-3 text-sm">
      {recent.map((item) => (
        <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-0">
          <span className="text-xs text-slate-500 min-w-[52px]">{timeAgo(item.updatedAt)}</span>
          <p className="text-slate-700 capitalize">{item.employeeName} — {item.leaveType} leave ({item.status})</p>
        </div>
      ))}
    </div>
  );
}

function SystemStatus() {
  return (
    <div className="space-y-3 text-sm">
      {[
        { name: 'Database', status: 'Operational', dot: 'bg-green-500', text: 'text-green-600' },
        { name: 'API Server', status: 'Operational', dot: 'bg-green-500', text: 'text-green-600' },
        { name: 'Firebase Auth', status: 'Operational', dot: 'bg-green-500', text: 'text-green-600' },
        { name: 'Email Service', status: 'Operational', dot: 'bg-green-500', text: 'text-green-600' },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <p className="text-slate-700">{item.name}</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${item.dot}`} />
            <span className={`text-xs font-medium ${item.text}`}>{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceTrend({ records }: { records: AttendanceRecord[] }) {
  const dayMap = new Map<string, { onTime: number; total: number }>();
  for (const r of records) {
    const entry = dayMap.get(r.date) ?? { onTime: 0, total: 0 };
    entry.total++;
    if (r.status === 'present') entry.onTime++;
    dayMap.set(r.date, entry);
  }
  const items = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b)).slice(-7)
    .map(([date, info]) => ({
      label: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      rate: info.total > 0 ? Math.round((info.onTime / info.total) * 100) : 0,
    }));
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No attendance data this week</p>;
  return (
    <div className="space-y-2">
      {items.map(({ label, rate }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-8">{label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-xs text-slate-600 w-8 text-right">{rate}%</span>
        </div>
      ))}
    </div>
  );
}

function LeaveTypes({ leaves }: { leaves: LeaveRequest[] }) {
  const typeMap = new Map<string, number>();
  for (const l of leaves) typeMap.set(l.leaveType, (typeMap.get(l.leaveType) ?? 0) + 1);
  const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-gray-400'];
  const items = [...typeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No leave data</p>;
  return (
    <div className="space-y-3">
      {items.map(([type, count], idx) => (
        <div key={type} className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colors[idx % colors.length]}`} />
          <span className="text-sm text-slate-700 flex-1 capitalize">{type}</span>
          <span className="text-sm font-medium text-slate-900">{count}</span>
        </div>
      ))}
    </div>
  );
}

function HeadcountByDept({ employees }: { employees: Employee[] }) {
  const deptMap = new Map<string, number>();
  for (const emp of employees) {
    if (!emp.department) continue;
    deptMap.set(emp.department, (deptMap.get(emp.department) ?? 0) + 1);
  }
  const total = employees.length || 1;
  const items = [...deptMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([dept, count]) => ({ dept, count, percent: Math.round((count / total) * 100) }));
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No department data</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.dept}>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-slate-700">{item.dept}</span>
            <span className="text-xs text-slate-500">{item.count}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingLeaves({ leaves }: { leaves: LeaveRequest[] }) {
  const items = leaves.slice(0, 5);
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No pending leave requests</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-900">{item.employeeName}</p>
            <p className="text-xs text-slate-500 capitalize">{item.leaveType} leave</p>
          </div>
          <span className="text-xs font-semibold text-orange-600">{item.totalDays}d</span>
        </div>
      ))}
    </div>
  );
}

function SalaryIncreasesByBranch({ increases, currencyCode }: { increases: SalaryIncrease[]; currencyCode: string }) {
  const branchMap = new Map<string, number>();
  for (const r of increases) {
    const branch = r.branch || 'Unassigned';
    branchMap.set(branch, (branchMap.get(branch) ?? 0) + (r.increaseAmount || 0));
  }
  const total = [...branchMap.values()].reduce((s, v) => s + v, 0);
  const items = [...branchMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([branch, amount]) => ({
      branch,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
  const currency = getCurrencySymbol(currencyCode);
  if (items.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No salary increases scheduled this month</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.branch}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-900">{item.branch}</p>
            <p className="text-xs text-slate-600">{currency} {formatCurrency(item.amount)}</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
        <span>Total ({increases.length} employee{increases.length !== 1 ? 's' : ''})</span>
        <span className="font-semibold text-emerald-700">{currency} {formatCurrency(total)}</span>
      </div>
    </div>
  );
}

