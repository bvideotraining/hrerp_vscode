import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';

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
  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to HR ERP Dashboard</h2>
        <p className="text-slate-600">Manage all your HR operations from one unified platform</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Payroll Estimate */}
        <KPICard
          title="Payroll Estimate"
          value="$127,450"
          change="+5.2%"
          trend="up"
          color="blue"
          icon="💰"
        />

        {/* Pending Leaves */}
        <KPICard
          title="Pending Leaves"
          value="12"
          change="3 this week"
          trend="neutral"
          color="orange"
          icon="📋"
        />

        {/* On Leave This Month */}
        <KPICard
          title="On Leave Today"
          value="5"
          change="2.1% of staff"
          trend="neutral"
          color="purple"
          icon="🏖️"
        />

        {/* Late Incidents */}
        <KPICard
          title="Late Incidents"
          value="23"
          change="4 this week"
          trend="down"
          color="red"
          icon="⏰"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Late Employees */}
        <ChartCard title="Top Late Employees" icon="👥">
          <LatEmployeesList />
        </ChartCard>

        {/* Net Salary per Branch */}
        <ChartCard title="Salary Distribution" icon="📊">
          <SalaryDistribution />
        </ChartCard>

        {/* Quick Actions */}
        <ChartCard title="Quick Actions" icon="⚡">
          <QuickActions />
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <ChartCard title="Recent Activities" icon="📆">
          <RecentActivities />
        </ChartCard>

        {/* System Status */}
        <ChartCard title="System Status" icon="✅">
          <SystemStatus />
        </ChartCard>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  trend,
  color,
  icon
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  icon: string;
}) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200'
  };

  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-slate-600'
  };

  return (
    <div className={`rounded-lg border p-6 ${colorMap[color as keyof typeof colorMap]}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-2">{value}</p>
      <p className={`text-sm ${trendColor[trend as keyof typeof trendColor]}`}>{change}</p>
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

function LatEmployeesList() {
  return (
    <div className="space-y-3">
      {[
        { name: 'Ahmed Hassan', late: '8 times', minutes: '120 mins' },
        { name: 'Fatima Al-Marzouqi', late: '6 times', minutes: '95 mins' },
        { name: 'Mohammed Ali', late: '5 times', minutes: '75 mins' }
      ].map((emp, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-900">{emp.name}</p>
            <p className="text-xs text-slate-600">{emp.minutes}</p>
          </div>
          <span className="text-xs font-semibold text-red-600">{emp.late}</span>
        </div>
      ))}
    </div>
  );
}

function SalaryDistribution() {
  return (
    <div className="space-y-3">
      {[
        { branch: 'Dubai Main', salary: '$45,200', percent: 35 },
        { branch: 'Abu Dhabi', salary: '$28,900', percent: 22 },
        { branch: 'Sharjah', salary: '$25,100', percent: 19 },
        { branch: 'Ajman', salary: '$28,250', percent: 24 }
      ].map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-900">{item.branch}</p>
            <p className="text-xs text-slate-600">{item.salary}</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${item.percent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  return (
    <div className="space-y-2">
      {[
        { action: '✏️ Mark Attendance', color: 'purple' },
        { action: '📝 Process Payroll', color: 'green' },
        { action: '✅ Approve Leaves', color: 'orange' },
        { action: '👤 Add Employee', color: 'blue' }
      ].map((item, idx) => (
        <button
          key={idx}
          className={`w-full p-3 rounded-lg text-left text-sm font-medium text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200`}
        >
          {item.action}
        </button>
      ))}
    </div>
  );
}

function RecentActivities() {
  return (
    <div className="space-y-3 text-sm">
      {[
        { time: '2 hours ago', action: 'Payroll calculated for March' },
        { time: '5 hours ago', action: 'Leave request approved' },
        { time: '1 day ago', action: 'New employee added' },
        { time: '2 days ago', action: 'Attendance report generated' }
      ].map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-0">
          <span className="text-xs text-slate-500 min-w-fit">{item.time}</span>
          <p className="text-slate-700">{item.action}</p>
        </div>
      ))}
    </div>
  );
}

function SystemStatus() {
  return (
    <div className="space-y-3 text-sm">
      {[
        { name: 'Database', status: 'Operational', color: 'green' },
        { name: 'API Server', status: 'Operational', color: 'green' },
        { name: 'Firebase Auth', status: 'Operational', color: 'green' },
        { name: 'Email Service', status: 'Operational', color: 'green' }
      ].map((item, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <p className="text-slate-700">{item.name}</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full bg-${item.color}-500`} />
            <span className={`text-xs font-medium text-${item.color}-600`}>{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
