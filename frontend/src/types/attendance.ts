// Attendance Types and Interfaces

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'on_leave'
  | 'unpaid_leave';

export type EmployeeCategory = 'WhiteCollar' | 'BlueCollar' | 'Management' | 'PartTime';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branch: string;
  category: EmployeeCategory;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  status: AttendanceStatus;
  checkIn?: string; // HH:MM
  checkOut?: string; // HH:MM
  saturdayWork: boolean;
  lateMinutes: number;
  lateMinutesOverride?: number;
  deductionDays: number;
  deductionDaysOverride?: number;
  saturdayWorkOverride?: boolean;
  excuse?: string;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceFormData {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branch: string;
  category: EmployeeCategory;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  excuse?: string;
  lateMinutesOverride?: number;
  deductionDaysOverride?: number;
  saturdayWorkOverride?: boolean;
  notes?: string;
}

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  branch?: string;
  employeeName?: string;
  employeeCode?: string;
  employeeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  unpaidLeave: number;
  totalLateMinutes: number;
  totalDeductionDays: number;
}
