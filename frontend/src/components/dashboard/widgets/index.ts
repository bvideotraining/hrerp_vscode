// Central map: widget ID → React component + grid col-span
// Used by the dynamic dashboard renderer

import {
  KpiTotalEmployees,
  KpiNewHires,
  KpiTurnoverRate,
  KpiPendingLeaves,
  KpiOnLeaveToday,
  KpiPayrollEstimate,
  KpiLateIncidents,
} from './kpi-widgets';

import {
  ChartPayrollTrend,
  ChartTodayAttendance,
  ChartBonusesByBranch,
  ChartHeadcountByDept,
  ChartSalaryDistribution,
  ChartAttendanceTrend,
} from './chart-widgets';

import {
  ListNewHires,
  ListUpcomingBirthdays,
  ListPendingLeaves,
  ListLateEmployees,
  QuickActionsWidget,
} from './list-widgets';

// col-span out of a 6-column grid
export const WIDGET_SPAN: Record<string, number> = {
  kpi_total_employees:           2,
  kpi_new_hires:                 2,
  kpi_turnover_rate:             2,
  kpi_pending_leaves:            2,
  kpi_on_leave_today:            2,
  kpi_payroll_estimate:          2,
  kpi_late_incidents:            2,
  kpi_bonuses_total:             2,
  kpi_social_insurance:          2,
  kpi_salary_increases_next_month: 2,
  chart_payroll_trend:           4,
  chart_today_attendance:        2,
  chart_bonuses_by_branch:       3,
  chart_headcount_by_dept:       3,
  chart_salary_distribution:     6,
  chart_attendance_trend:        4,
  chart_leave_types:             3,
  chart_salary_increases_by_branch: 3,
  list_new_hires:                2,
  list_upcoming_birthdays:       2,
  list_pending_leaves:           3,
  list_late_employees:           3,
  list_recent_activities:        3,
  quick_actions:                 2,
  system_status:                 3,
};

export const WIDGET_COMPONENT_MAP: Record<string, React.ComponentType> = {
  kpi_total_employees:   KpiTotalEmployees,
  kpi_new_hires:         KpiNewHires,
  kpi_turnover_rate:     KpiTurnoverRate,
  kpi_pending_leaves:    KpiPendingLeaves,
  kpi_on_leave_today:    KpiOnLeaveToday,
  kpi_payroll_estimate:  KpiPayrollEstimate,
  kpi_late_incidents:    KpiLateIncidents,
  chart_payroll_trend:   ChartPayrollTrend,
  chart_today_attendance: ChartTodayAttendance,
  chart_bonuses_by_branch: ChartBonusesByBranch,
  chart_headcount_by_dept: ChartHeadcountByDept,
  chart_salary_distribution: ChartSalaryDistribution,
  list_new_hires:        ListNewHires,
  list_upcoming_birthdays: ListUpcomingBirthdays,
  list_pending_leaves:   ListPendingLeaves,
  list_late_employees:   ListLateEmployees,
  chart_attendance_trend: ChartAttendanceTrend,
  quick_actions:         QuickActionsWidget,
};
