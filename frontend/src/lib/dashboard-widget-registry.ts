// Widget registry — single source of truth for all available dashboard widgets
// Used by both the dashboard page (rendering) and dashboard builder (configuration)

export type WidgetCategory = 'kpi' | 'chart' | 'list' | 'utility';
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: string; // lucide icon name (string)
  color: string; // tailwind bg color class for category badge
  defaultSize: WidgetSize;
  requiredModules: string[]; // empty = always available
  adminOnly?: boolean; // if true, only visible to application admins (role=admin or accessType=full)
}

export interface WidgetItem {
  id: string;
  order: number;
}

export interface DashboardLayout {
  roleId: string;
  widgets: WidgetItem[];
  updatedAt?: string;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ─── KPI Widgets ───────────────────────────────────────────────
  {
    id: 'kpi_total_employees',
    title: 'Total Employees',
    description: 'Active headcount across all departments',
    category: 'kpi',
    icon: 'Users',
    color: 'bg-blue-100 text-blue-700',
    defaultSize: 'small',
    requiredModules: ['employees'],
  },
  {
    id: 'kpi_payroll_estimate',
    title: 'Payroll Estimate',
    description: 'Monthly payroll cost estimation',
    category: 'kpi',
    icon: 'DollarSign',
    color: 'bg-green-100 text-green-700',
    defaultSize: 'small',
    requiredModules: ['payroll'],
    adminOnly: true,
  },
  {
    id: 'kpi_pending_leaves',
    title: 'Pending Leaves',
    description: 'Leave requests awaiting approval',
    category: 'kpi',
    icon: 'Clock',
    color: 'bg-yellow-100 text-yellow-700',
    defaultSize: 'small',
    requiredModules: ['leaves'],
  },
  {
    id: 'kpi_on_leave_today',
    title: 'On Leave Today',
    description: 'Employees absent or on leave today',
    category: 'kpi',
    icon: 'CalendarOff',
    color: 'bg-orange-100 text-orange-700',
    defaultSize: 'small',
    requiredModules: ['leaves'],
  },
  {
    id: 'kpi_late_incidents',
    title: 'Late Incidents',
    description: 'Late attendance incidents this month',
    category: 'kpi',
    icon: 'AlertCircle',
    color: 'bg-red-100 text-red-700',
    defaultSize: 'small',
    requiredModules: ['attendance'],
  },
  {
    id: 'kpi_bonuses_total',
    title: 'Total Bonuses',
    description: 'Total bonuses disbursed this month',
    category: 'kpi',
    icon: 'Gift',
    color: 'bg-pink-100 text-pink-700',
    defaultSize: 'small',
    requiredModules: ['bonuses'],
    adminOnly: true,
  },
  {
    id: 'kpi_social_insurance',
    title: 'Social Insurance',
    description: 'Registered employees under social insurance',
    category: 'kpi',
    icon: 'Shield',
    color: 'bg-indigo-100 text-indigo-700',
    defaultSize: 'small',
    requiredModules: ['social_insurance'],
    adminOnly: true,
  },
  {
    id: 'kpi_salary_increases_next_month',
    title: 'Upcoming Increases',
    description: 'Total salary increase amount scheduled for next month',
    category: 'kpi',
    icon: 'TrendingUp',
    color: 'bg-teal-100 text-teal-700',
    defaultSize: 'small',
    requiredModules: ['payroll'],
    adminOnly: true,
  },
  // ─── Chart Widgets ─────────────────────────────────────────────
  {
    id: 'chart_attendance_trend',
    title: 'Attendance Trend',
    description: 'Daily attendance rate over the last 30 days',
    category: 'chart',
    icon: 'TrendingUp',
    color: 'bg-blue-100 text-blue-700',
    defaultSize: 'medium',
    requiredModules: ['attendance'],
  },
  {
    id: 'chart_salary_distribution',
    title: 'Salary Distribution',
    description: 'Salary ranges across departments',
    category: 'chart',
    icon: 'BarChart2',
    color: 'bg-green-100 text-green-700',
    defaultSize: 'medium',
    requiredModules: ['payroll'],
    adminOnly: true,
  },
  {
    id: 'chart_salary_increases_by_branch',
    title: 'Salary Increases by Branch',
    description: "This month's salary increase amounts grouped by branch",
    category: 'chart',
    icon: 'TrendingUp',
    color: 'bg-emerald-100 text-emerald-700',
    defaultSize: 'medium',
    requiredModules: ['payroll'],
    adminOnly: true,
  },
  {
    id: 'chart_leave_types',
    title: 'Leave Types',
    description: 'Breakdown of leave requests by type',
    category: 'chart',
    icon: 'PieChart',
    color: 'bg-yellow-100 text-yellow-700',
    defaultSize: 'medium',
    requiredModules: ['leaves'],
  },
  {
    id: 'chart_headcount_by_dept',
    title: 'Headcount by Department',
    description: 'Employee distribution across departments',
    category: 'chart',
    icon: 'BarChart',
    color: 'bg-purple-100 text-purple-700',
    defaultSize: 'medium',
    requiredModules: ['employees'],
  },
  // ─── List Widgets ──────────────────────────────────────────────
  {
    id: 'list_late_employees',
    title: 'Late Employees',
    description: 'Recent late or absent employees',
    category: 'list',
    icon: 'UserX',
    color: 'bg-red-100 text-red-700',
    defaultSize: 'large',
    requiredModules: ['attendance'],
  },
  {
    id: 'list_recent_activities',
    title: 'Recent Activities',
    description: 'Latest system events and actions',
    category: 'list',
    icon: 'Activity',
    color: 'bg-gray-100 text-gray-700',
    defaultSize: 'large',
    requiredModules: [],
  },
  {
    id: 'list_pending_leaves',
    title: 'Pending Leave Requests',
    description: 'Leave requests awaiting review',
    category: 'list',
    icon: 'FileText',
    color: 'bg-yellow-100 text-yellow-700',
    defaultSize: 'large',
    requiredModules: ['leaves'],
  },
  // ─── Utility Widgets ───────────────────────────────────────────
  {
    id: 'quick_actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common tasks',
    category: 'utility',
    icon: 'Zap',
    color: 'bg-indigo-100 text-indigo-700',
    defaultSize: 'medium',
    requiredModules: [],
  },
  {
    id: 'system_status',
    title: 'System Status',
    description: 'Current system health and statistics',
    category: 'utility',
    icon: 'Server',
    color: 'bg-gray-100 text-gray-700',
    defaultSize: 'medium',
    requiredModules: [],
  },
  // ─── NEW widgets (matching screenshots) ────────────────────────
  {
    id: 'kpi_new_hires',
    title: 'New Hires This Month',
    description: 'Employees who joined this calendar month',
    category: 'kpi',
    icon: 'UserPlus',
    color: 'bg-teal-100 text-teal-700',
    defaultSize: 'small',
    requiredModules: ['employees'],
  },
  {
    id: 'kpi_turnover_rate',
    title: 'Turnover Rate',
    description: 'Resignations this year vs average headcount',
    category: 'kpi',
    icon: 'TrendingDown',
    color: 'bg-rose-100 text-rose-700',
    defaultSize: 'small',
    requiredModules: ['employees'],
  },
  {
    id: 'chart_payroll_trend',
    title: 'Payroll Trend (6 Months)',
    description: 'Monthly payroll breakdown for the last 6 months',
    category: 'chart',
    icon: 'BarChart2',
    color: 'bg-blue-100 text-blue-700',
    defaultSize: 'large',
    requiredModules: ['payroll'],
    adminOnly: true,
  },
  {
    id: 'chart_today_attendance',
    title: "Today's Attendance",
    description: 'Present / Absent / On Leave donut for today',
    category: 'chart',
    icon: 'PieChart',
    color: 'bg-amber-100 text-amber-700',
    defaultSize: 'medium',
    requiredModules: ['attendance'],
  },
  {
    id: 'chart_bonuses_by_branch',
    title: 'Bonuses & Allowances by Branch',
    description: 'Total bonus payout this month per branch',
    category: 'chart',
    icon: 'Gift',
    color: 'bg-pink-100 text-pink-700',
    defaultSize: 'medium',
    requiredModules: ['bonuses'],
    adminOnly: true,
  },
  {
    id: 'list_new_hires',
    title: 'New Hires This Month',
    description: 'Employees who joined this month (list)',
    category: 'list',
    icon: 'UserPlus',
    color: 'bg-teal-100 text-teal-700',
    defaultSize: 'medium',
    requiredModules: ['employees'],
  },
  {
    id: 'list_upcoming_birthdays',
    title: 'Upcoming Birthdays',
    description: 'Employee birthdays in the next 14 days',
    category: 'list',
    icon: 'Cake',
    color: 'bg-purple-100 text-purple-700',
    defaultSize: 'medium',
    requiredModules: ['employees'],
  },
];

// Map for O(1) lookup
export const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]));

// Pre-built templates by role archetype
export const DASHBOARD_TEMPLATES: Record<string, string[]> = {
  admin: [
    'kpi_total_employees',
    'kpi_new_hires',
    'kpi_turnover_rate',
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'kpi_payroll_estimate',
    'chart_payroll_trend',
    'chart_today_attendance',
    'chart_bonuses_by_branch',
    'chart_headcount_by_dept',
    'list_new_hires',
    'list_upcoming_birthdays',
    'quick_actions',
    'chart_salary_distribution',
  ],
  hr_manager: [
    'kpi_total_employees',
    'kpi_new_hires',
    'kpi_turnover_rate',
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'kpi_late_incidents',
    'chart_today_attendance',
    'chart_headcount_by_dept',
    'list_new_hires',
    'list_upcoming_birthdays',
    'list_pending_leaves',
    'quick_actions',
  ],
  finance_manager: [
    'kpi_payroll_estimate',
    'kpi_bonuses_total',
    'kpi_social_insurance',
    'kpi_salary_increases_next_month',
    'chart_payroll_trend',
    'chart_salary_distribution',
    'chart_bonuses_by_branch',
    'chart_salary_increases_by_branch',
    'list_recent_activities',
  ],
  supervisor: [
    'kpi_late_incidents',
    'kpi_on_leave_today',
    'chart_today_attendance',
    'list_late_employees',
    'list_pending_leaves',
    'quick_actions',
  ],
  approver: [
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'list_pending_leaves',
    'quick_actions',
  ],
  branch_approver: [
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'kpi_late_incidents',
    'chart_attendance_trend',
    'list_late_employees',
    'list_pending_leaves',
    'quick_actions',
  ],
  executive_admin: [
    'kpi_total_employees',
    'kpi_new_hires',
    'kpi_turnover_rate',
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'kpi_payroll_estimate',
    'chart_payroll_trend',
    'chart_today_attendance',
    'chart_bonuses_by_branch',
    'chart_headcount_by_dept',
    'list_new_hires',
    'list_upcoming_birthdays',
    'quick_actions',
    'chart_salary_distribution',
  ],
  employee: [
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'quick_actions',
    'list_upcoming_birthdays',
  ],
  default: [
    'kpi_total_employees',
    'kpi_pending_leaves',
    'kpi_on_leave_today',
    'kpi_late_incidents',
    'chart_today_attendance',
    'chart_headcount_by_dept',
    'list_pending_leaves',
    'quick_actions',
  ],
};

/**
 * Return widgets the given role can use based on their module permissions.
 * @param permissions - list of module ids the role can read
 * @param isFullAccess - if true, all widgets are available
 */
export function getAvailableWidgets(
  permissions: string[],
  isFullAccess: boolean,
  isAdmin = false,
): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter((w) => {
    if (w.adminOnly && !isAdmin) return false;
    return (
      w.requiredModules.length === 0 ||
      isFullAccess ||
      w.requiredModules.every((mod) => permissions.includes(mod))
    );
  });
}

/**
 * Convert a template name to a WidgetItem array.
 */
export function templateToWidgets(templateName: string): WidgetItem[] {
  const ids = DASHBOARD_TEMPLATES[templateName] ?? DASHBOARD_TEMPLATES['default'];
  return ids.map((id, idx) => ({ id, order: idx }));
}
