'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/hooks/use-employee';
import { useAuth } from '@/context/auth-context';
import { organizationService, MonthRange } from '@/lib/services/organization.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord } from '@/types/attendance';
import {
  leavesService, leaveBalanceService,
  LeaveRequest, LeaveBalance, LEAVE_TYPE_LABELS, LeaveType,
} from '@/lib/services/leaves.service';
import { Employee, EmployeeStatus, EmployeeCategory } from '@/types/employee';
import { PayrollRecord } from '@/types/payroll';
import { payrollService } from '@/lib/services/payroll.service';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Columns,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  Users,
  CalendarDays,
  Scale,
  Clock,
  ClipboardList,
} from 'lucide-react';

/* â”€â”€â”€ Available report fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface ReportField {
  key: string;
  label: string;
  group: string;
  getValue: (e: Employee) => string | number;
}

const REPORT_FIELDS: ReportField[] = [
  // Personal
  { key: 'fullName', label: 'Full Name', group: 'Personal', getValue: (e) => e.fullName ?? '' },
  { key: 'employeeCode', label: 'Employee Code', group: 'Personal', getValue: (e) => e.employeeCode ?? '' },
  { key: 'email', label: 'Email', group: 'Personal', getValue: (e) => e.email ?? '' },
  { key: 'phone', label: 'Phone', group: 'Personal', getValue: (e) => e.phone ?? '' },
  { key: 'nationalId', label: 'National ID', group: 'Personal', getValue: (e) => e.nationalId ?? '' },
  { key: 'dateOfBirth', label: 'Date of Birth', group: 'Personal', getValue: (e) => e.dateOfBirth ?? '' },
  { key: 'gender', label: 'Gender', group: 'Personal', getValue: (e) => e.gender === 'M' ? 'Male' : e.gender === 'F' ? 'Female' : '' },
  { key: 'nationality', label: 'Nationality', group: 'Personal', getValue: (e) => e.nationality ?? '' },
  { key: 'maritalStatus', label: 'Marital Status', group: 'Personal', getValue: (e) => e.maritalStatus ?? '' },
  { key: 'currentAddress', label: 'Address', group: 'Personal', getValue: (e) => e.currentAddress ?? '' },

  // Employment
  { key: 'branch', label: 'Branch', group: 'Employment', getValue: (e) => e.branch ?? '' },
  { key: 'department', label: 'Department', group: 'Employment', getValue: (e) => e.department ?? '' },
  { key: 'jobTitle', label: 'Job Title', group: 'Employment', getValue: (e) => e.jobTitle ?? '' },
  { key: 'category', label: 'Category', group: 'Employment', getValue: (e) => e.category ?? '' },
  { key: 'positionType', label: 'Position Type', group: 'Employment', getValue: (e) => e.positionType ?? '' },
  { key: 'employmentType', label: 'Employment Type', group: 'Employment', getValue: (e) => e.employmentType ?? '' },
  { key: 'employmentStatus', label: 'Status', group: 'Employment', getValue: (e) => e.employmentStatus ?? '' },
  { key: 'startDate', label: 'Start Date', group: 'Employment', getValue: (e) => e.startDate ?? '' },
  { key: 'resignationDate', label: 'Resignation Date', group: 'Employment', getValue: (e) => e.resignationDate ?? '' },

  // Salary & Bank
  { key: 'currentSalary', label: 'Salary', group: 'Salary & Bank', getValue: (e) => e.currentSalary ?? 0 },
  { key: 'currency', label: 'Currency', group: 'Salary & Bank', getValue: (e) => e.currency ?? '' },
  { key: 'paymentMethod', label: 'Payment Method', group: 'Salary & Bank', getValue: (e) => e.paymentMethod ?? '' },
  { key: 'bankName', label: 'Bank Name', group: 'Salary & Bank', getValue: (e) => e.bankName ?? '' },
  { key: 'accountNumber', label: 'Account Number', group: 'Salary & Bank', getValue: (e) => e.accountNumber ?? '' },
];

const DEFAULT_SELECTED = [
  'fullName', 'employeeCode', 'email', 'department', 'branch',
  'jobTitle', 'employmentStatus', 'currentSalary', 'currency',
];

const FIELD_GROUPS = [...new Set(REPORT_FIELDS.map((f) => f.group))];

/* --- Leave report field definitions --- */

type LeaveReportRow = LeaveRequest & { employeeDepartment?: string };

interface LeaveReportField {
  key: string;
  label: string;
  group: string;
  getValue: (r: LeaveReportRow) => string | number;
}

const LEAVE_REPORT_FIELDS: LeaveReportField[] = [
  { key: 'employeeName',       label: 'Employee Name',  group: 'Employee', getValue: (r) => r.employeeName ?? '' },
  { key: 'employeeId',         label: 'Employee ID',    group: 'Employee', getValue: (r) => r.employeeId ?? '' },
  { key: 'employeeBranch',     label: 'Branch',         group: 'Employee', getValue: (r) => r.employeeBranch ?? '' },
  { key: 'employeeDepartment', label: 'Department',     group: 'Employee', getValue: (r) => r.employeeDepartment ?? '' },
  { key: 'leaveType',  label: 'Leave Type',  group: 'Leave Details', getValue: (r) => LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType },
  { key: 'startDate',  label: 'Start Date',  group: 'Leave Details', getValue: (r) => r.startDate ?? '' },
  { key: 'endDate',    label: 'End Date',    group: 'Leave Details', getValue: (r) => r.endDate ?? '' },
  { key: 'totalDays',  label: 'Total Days',  group: 'Leave Details', getValue: (r) => r.totalDays ?? 0 },
  { key: 'reason',     label: 'Reason',      group: 'Leave Details', getValue: (r) => r.reason ?? '' },
  { key: 'status',         label: 'Status',          group: 'Status', getValue: (r) => r.status ?? '' },
  { key: 'approvedBy',     label: 'Approved By',     group: 'Status', getValue: (r) => r.approvedBy ?? '' },
  { key: 'rejectedReason', label: 'Rejected Reason', group: 'Status', getValue: (r) => r.rejectedReason ?? '' },
  {
    key: 'createdAt', label: 'Submitted At', group: 'Status',
    getValue: (r) => {
      if (!r.createdAt) return '';
      if (typeof r.createdAt?.toDate === 'function') return r.createdAt.toDate().toLocaleDateString();
      if (typeof r.createdAt === 'string') return r.createdAt;
      return '';
    },
  },
];

const DEFAULT_LEAVE_SELECTED = [
  'employeeName', 'employeeId', 'employeeBranch', 'employeeDepartment',
  'leaveType', 'startDate', 'endDate', 'totalDays', 'status',
];

const LEAVE_FIELD_GROUPS = [...new Set(LEAVE_REPORT_FIELDS.map((f) => f.group))];

/* --- Leave balance field definitions --- */

type BalanceReportRow = LeaveBalance & { employeeCode?: string; branch?: string; department?: string };

interface BalanceReportField {
  key: string;
  label: string;
  group: string;
  getValue: (r: BalanceReportRow) => string | number;
}

const BALANCE_REPORT_FIELDS: BalanceReportField[] = [
  { key: 'employeeName', label: 'Employee Name', group: 'Employee', getValue: (r) => r.employeeName ?? '' },
  { key: 'employeeCode', label: 'Employee Code', group: 'Employee', getValue: (r) => r.employeeCode ?? '' },
  { key: 'branch',       label: 'Branch',        group: 'Employee', getValue: (r) => r.branch ?? '' },
  { key: 'department',   label: 'Department',    group: 'Employee', getValue: (r) => r.department ?? '' },
  { key: 'year',         label: 'Year',          group: 'Employee', getValue: (r) => r.year ?? '' },
  { key: 'annual_allocated', label: 'Annual - Allocated', group: 'Annual Leave',    getValue: (r) => r.annual?.allocated ?? 0 },
  { key: 'annual_used',      label: 'Annual - Used',      group: 'Annual Leave',    getValue: (r) => r.annual?.used ?? 0 },
  { key: 'annual_remaining', label: 'Annual - Remaining', group: 'Annual Leave',    getValue: (r) => (r.annual?.allocated ?? 0) - (r.annual?.used ?? 0) },
  { key: 'casual_allocated', label: 'Casual - Allocated', group: 'Casual Leave',   getValue: (r) => r.casual?.allocated ?? 0 },
  { key: 'casual_used',      label: 'Casual - Used',      group: 'Casual Leave',   getValue: (r) => r.casual?.used ?? 0 },
  { key: 'casual_remaining', label: 'Casual - Remaining', group: 'Casual Leave',   getValue: (r) => (r.casual?.allocated ?? 0) - (r.casual?.used ?? 0) },
  { key: 'sick_allocated',   label: 'Sick - Allocated',   group: 'Sick Leave',     getValue: (r) => r.sick?.allocated ?? 0 },
  { key: 'sick_used',        label: 'Sick - Used',        group: 'Sick Leave',     getValue: (r) => r.sick?.used ?? 0 },
  { key: 'sick_remaining',   label: 'Sick - Remaining',   group: 'Sick Leave',     getValue: (r) => (r.sick?.allocated ?? 0) - (r.sick?.used ?? 0) },
  { key: 'death_allocated',  label: 'Death - Allocated',  group: 'Death Leave',    getValue: (r) => r.death?.allocated ?? 0 },
  { key: 'death_used',       label: 'Death - Used',       group: 'Death Leave',    getValue: (r) => r.death?.used ?? 0 },
  { key: 'death_remaining',  label: 'Death - Remaining',  group: 'Death Leave',    getValue: (r) => (r.death?.allocated ?? 0) - (r.death?.used ?? 0) },
  { key: 'maternity_allocated', label: 'Maternity - Allocated', group: 'Maternity Leave', getValue: (r) => r.maternity?.allocated ?? 0 },
  { key: 'maternity_used',      label: 'Maternity - Used',      group: 'Maternity Leave', getValue: (r) => r.maternity?.used ?? 0 },
  { key: 'maternity_remaining', label: 'Maternity - Remaining', group: 'Maternity Leave', getValue: (r) => (r.maternity?.allocated ?? 0) - (r.maternity?.used ?? 0) },
  { key: 'unpaid_used', label: 'Unpaid - Used', group: 'Unpaid Leave', getValue: (r) => r.unpaid?.used ?? 0 },
];

const DEFAULT_BALANCE_SELECTED = [
  'employeeName', 'employeeCode', 'branch', 'year',
  'annual_allocated', 'annual_used', 'annual_remaining',
  'casual_allocated', 'casual_used', 'casual_remaining',
  'sick_used', 'sick_remaining',
];

const BALANCE_FIELD_GROUPS = [...new Set(BALANCE_REPORT_FIELDS.map((f) => f.group))];

function normalizeRole(r: string | undefined) {
  return (r || '').toLowerCase().replace(/[\s-]+/g, '_');
}

/* --- Attendance report helpers --- */
function calcWorkingMinutes(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  if (isNaN(ih) || isNaN(im) || isNaN(oh) || isNaN(om)) return 0;
  const diff = (oh * 60 + om) - (ih * 60 + im);
  return diff > 0 ? diff : 0;
}

interface AttendanceReportRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branch: string;
  jobTitle: string;
  totalWorkingHours: number;
  totalLateMinutes: number;
  daysWithLate: number;
  absenceDays: number;
  onLeaveDays: number;
  annualBalance: number;
  casualBalance: number;
  sickBalance: number;
}

interface AttendanceField {
  key: string;
  label: string;
  group: string;
  getValue: (r: AttendanceReportRow) => string | number;
}

const ATTENDANCE_REPORT_FIELDS: AttendanceField[] = [
  { key: 'employeeCode',      label: 'Employee Code',        group: 'Employee',      getValue: (r) => r.employeeCode },
  { key: 'employeeName',      label: 'Employee Name',        group: 'Employee',      getValue: (r) => r.employeeName },
  { key: 'branch',            label: 'Branch',               group: 'Employee',      getValue: (r) => r.branch },
  { key: 'jobTitle',          label: 'Job Title',            group: 'Employee',      getValue: (r) => r.jobTitle },
  { key: 'totalWorkingHours', label: 'Total Working Hours',  group: 'Attendance',    getValue: (r) => r.totalWorkingHours.toFixed(1) },
  { key: 'totalLateMinutes',  label: 'Total Late Minutes',   group: 'Attendance',    getValue: (r) => r.totalLateMinutes },
  { key: 'daysWithLate',      label: 'Days With Late',       group: 'Attendance',    getValue: (r) => r.daysWithLate },
  { key: 'absenceDays',       label: 'Absence Days',         group: 'Attendance',    getValue: (r) => r.absenceDays },
  { key: 'onLeaveDays',       label: 'On Leave Days',        group: 'Attendance',    getValue: (r) => r.onLeaveDays },
  { key: 'annualBalance',     label: 'Annual Leave Balance', group: 'Leave Balance', getValue: (r) => r.annualBalance },
  { key: 'casualBalance',     label: 'Casual Leave Balance', group: 'Leave Balance', getValue: (r) => r.casualBalance },
  { key: 'sickBalance',       label: 'Sick Leave Balance',   group: 'Leave Balance', getValue: (r) => r.sickBalance },
];

const DEFAULT_ATTENDANCE_SELECTED = ATTENDANCE_REPORT_FIELDS.map((f) => f.key);
const ATTENDANCE_FIELD_GROUPS = [...new Set(ATTENDANCE_REPORT_FIELDS.map((f) => f.group))];

/* --- Payroll Report field definitions ------------------------------------ */

interface PayrollReportRow extends PayrollRecord {
  category: string;
  jobTitle: string;
}

interface PayrollReportField {
  key: string;
  label: string;
  group: string;
  getValue: (r: PayrollReportRow) => string | number;
}

function fmtNum(n: number | undefined | null): string {
  if (n == null) return '0.00';
  return Number(n).toFixed(2);
}

function fmtAllowanceItems(r: PayrollReportRow): string {
  const parts: string[] = [];
  if (r.saturdayShiftAllowance) parts.push('Sat Shift: ' + fmtNum(r.saturdayShiftAllowance));
  if (r.dutyAllowance) parts.push('Duty: ' + fmtNum(r.dutyAllowance));
  if (r.pottyTrainingAllowance) parts.push('Potty: ' + fmtNum(r.pottyTrainingAllowance));
  if (r.afterSchoolAllowance) parts.push('After School: ' + fmtNum(r.afterSchoolAllowance));
  if (r.transportationAllowance) parts.push('Transport: ' + fmtNum(r.transportationAllowance));
  if (r.extraBonusAllowance) parts.push('Extra Bonus: ' + fmtNum(r.extraBonusAllowance));
  if (r.otherBonusAllowance) parts.push('Others: ' + fmtNum(r.otherBonusAllowance));
  if (r.bonuses) parts.push('Bonus: ' + fmtNum(r.bonuses));
  return parts.length ? parts.join(' | ') : '\u2014';
}

const PAYROLL_REPORT_FIELDS: PayrollReportField[] = [
  // Employee
  { key: 'employeeCode',  label: 'Employee Code',   group: 'Employee',   getValue: (r) => r.employeeCode ?? '' },
  { key: 'employeeName',  label: 'Employee Name',   group: 'Employee',   getValue: (r) => r.employeeName ?? '' },
  { key: 'branch',        label: 'Branch',          group: 'Employee',   getValue: (r) => r.branch ?? '' },
  { key: 'payrollMonth',  label: 'Month',           group: 'Employee',   getValue: (r) => r.payrollMonth ?? '' },
  { key: 'category',      label: 'Category',        group: 'Employee',   getValue: (r) => r.category ?? '' },
  { key: 'jobTitle',      label: 'Job Title',       group: 'Employee',   getValue: (r) => r.jobTitle ?? '' },
  // Earnings
  { key: 'basicSalary',     label: 'Basic Salary',     group: 'Earnings', getValue: (r) => fmtNum(r.basicSalary) },
  { key: 'increaseAmount',  label: 'Increase',         group: 'Earnings', getValue: (r) => fmtNum(r.increaseAmount) },
  { key: 'grossSalary',     label: 'Gross Salary',     group: 'Earnings', getValue: (r) => fmtNum(r.grossSalary) },
  { key: 'allowanceItems',  label: 'Allowance Items',  group: 'Earnings', getValue: (r) => fmtAllowanceItems(r) },
  { key: 'totalAllowances', label: 'Total Allowances', group: 'Earnings', getValue: (r) => fmtNum(r.totalAllowances) },
  { key: 'totalSalary',     label: 'Total Salary',     group: 'Earnings', getValue: (r) => fmtNum(r.totalSalary) },
  // Deductions
  { key: 'socialInsurance',  label: 'Social Insurance',             group: 'Deductions', getValue: (r) => fmtNum(r.socialInsurance) },
  { key: 'medicalInsurance', label: 'Medical Insurance',            group: 'Deductions', getValue: (r) => fmtNum(r.medicalInsurance) },
  { key: 'cashAdvance',      label: 'Cash Advance Installment',     group: 'Deductions', getValue: (r) => fmtNum(r.cashAdvance) },
  { key: 'lateMinutes',      label: 'Total Late Minutes',           group: 'Deductions', getValue: (r) => r.attendanceSummary?.lateMinutes ?? 0 },
  { key: 'lateDeduction',    label: 'Late Minutes Value',           group: 'Deductions', getValue: (r) => fmtNum(r.lateDeduction) },
  { key: 'absenceDeduction', label: 'Absence & Unpaid Leave Value', group: 'Deductions', getValue: (r) => fmtNum(r.absenceDeduction) },
  { key: 'totalDeductions',  label: 'Total Deductions',             group: 'Deductions', getValue: (r) => fmtNum(r.totalDeductions) },
  // Final
  { key: 'netSalary', label: 'Net Salary', group: 'Final', getValue: (r) => fmtNum(r.netSalary) },
  { key: 'status',    label: 'Status',     group: 'Final', getValue: (r) => r.status ?? '' },
];

const DEFAULT_PAYROLL_SELECTED = [
  'employeeCode', 'employeeName', 'branch', 'payrollMonth', 'category', 'jobTitle',
  'basicSalary', 'grossSalary', 'totalAllowances', 'totalSalary',
  'totalDeductions', 'netSalary', 'status',
];

const PAYROLL_FIELD_GROUPS = [...new Set(PAYROLL_REPORT_FIELDS.map((f) => f.group))];

/* â”€â”€â”€ Page wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ReportsPage() {
  return (
    <ProtectedRoute moduleId="reports">
      <DashboardLayout>
        <ReportsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/* â”€â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* --- Main wrapper with tabs --- */
function ReportsContent() {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const canSeeLeavesReports = ['admin', 'hr_manager', 'approver', 'branch_approver'].includes(roleKey) || user?.accessType === 'full';
  const canSeePayrollReports = ['admin', 'hr_manager', 'finance_manager'].includes(roleKey) || user?.accessType === 'full';
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves' | 'balances' | 'attendance' | 'payroll'>('employees');

  const tabs = [
    { id: 'employees' as const, label: 'Employee Report', icon: Users },
    ...(canSeeLeavesReports ? [
      { id: 'leaves' as const, label: 'Leaves Report', icon: CalendarDays },
      { id: 'balances' as const, label: 'Leave Balances', icon: Scale },
      { id: 'attendance' as const, label: 'Attendance Report', icon: Clock },
    ] : []),
    ...(canSeePayrollReports ? [
      { id: 'payroll' as const, label: 'Payroll Report', icon: ClipboardList },
    ] : []),
  ];

  return (
    <div>
      {/* Report type tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-0 mx-8 mt-6 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'employees' && <EmployeeReportContent />}
      {activeTab === 'leaves' && canSeeLeavesReports && <LeavesReportContent />}
      {activeTab === 'balances' && canSeeLeavesReports && <LeaveBalanceReportContent />}
      {activeTab === 'attendance' && canSeeLeavesReports && <AttendanceReportContent />}
      {activeTab === 'payroll' && canSeePayrollReports && <PayrollReportContent />}
    </div>
  );
}

function EmployeeReportContent() {
  const router = useRouter();
  const { getAllEmployees } = useEmployee();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Field selection
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | ''>('');
  const [filterCategory, setFilterCategory] = useState<EmployeeCategory | ''>('');
  const [filterGender, setFilterGender] = useState('');

  // Org data for filters
  const [orgBranches, setOrgBranches] = useState<string[]>([]);
  const [orgDepts, setOrgDepts] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Close field picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [emps, branches, departments] = await Promise.all([
        getAllEmployees(),
        organizationService.getBranches().catch(() => []),
        organizationService.getDepartments().catch(() => []),
      ]);
      setEmployees(emps);
      setOrgBranches(branches.filter((x) => x.isActive !== false).map((x) => x.name));
      setOrgDepts(departments.map((x) => x.name));
    } catch {
      console.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic filter options (org data + unique from employees)
  const branchOptions = useMemo(() => {
    const fromEmps = employees.map((e) => e.branch).filter(Boolean);
    return [...new Set([...orgBranches, ...fromEmps])].sort();
  }, [employees, orgBranches]);

  const deptOptions = useMemo(() => {
    const fromEmps = employees.map((e) => e.department).filter(Boolean);
    return [...new Set([...orgDepts, ...fromEmps])].sort();
  }, [employees, orgDepts]);

  // Filtered data
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          emp.fullName?.toLowerCase().includes(q) ||
          emp.employeeCode?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterBranch && emp.branch !== filterBranch) return false;
      if (filterDept && emp.department !== filterDept) return false;
      if (filterStatus && emp.employmentStatus !== filterStatus) return false;
      if (filterCategory && emp.category !== filterCategory) return false;
      if (filterGender && emp.gender !== filterGender) return false;
      return true;
    });
  }, [employees, search, filterBranch, filterDept, filterStatus, filterCategory, filterGender]);

  // Active report fields
  const activeFields = useMemo(
    () => REPORT_FIELDS.filter((f) => selectedFields.includes(f.key)),
    [selectedFields],
  );

  /* â”€â”€â”€ Field toggle helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleGroup = (group: string) => {
    const groupKeys = REPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSelected = groupKeys.every((k) => selectedFields.includes(k));
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const selectAll = () => setSelectedFields(REPORT_FIELDS.map((f) => f.key));
  const clearAll = () => setSelectedFields([]);
  const resetDefaults = () => setSelectedFields(DEFAULT_SELECTED);

  const hasActiveFilters = filterBranch || filterDept || filterStatus || filterCategory || filterGender || search;

  const clearFilters = () => {
    setSearch('');
    setFilterBranch('');
    setFilterDept('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterGender('');
  };

  /* â”€â”€â”€ Export Excel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleExportExcel = async () => {
    if (filteredEmployees.length === 0) return;
    const XLSX = await import('xlsx');
    const rows = filteredEmployees.map((emp) => {
      const row: Record<string, string | number> = {};
      activeFields.forEach((f) => {
        row[f.label] = f.getValue(emp);
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = activeFields.map((f) => ({ wch: Math.max(f.label.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Report');
    XLSX.writeFile(wb, `employee_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /* â”€â”€â”€ Export PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleExportPdf = async () => {
    if (filteredEmployees.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({
      orientation: activeFields.length > 6 ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'A4',
    });

    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Employee Report', 40, 40);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const filterDesc: string[] = [];
    if (filterBranch) filterDesc.push(`Branch: ${filterBranch}`);
    if (filterDept) filterDesc.push(`Dept: ${filterDept}`);
    if (filterStatus) filterDesc.push(`Status: ${filterStatus}`);
    if (filterCategory) filterDesc.push(`Category: ${filterCategory}`);
    if (filterGender) filterDesc.push(`Gender: ${filterGender === 'M' ? 'Male' : 'Female'}`);
    const subtitle = `Generated: ${new Date().toLocaleString()}  |  Total: ${filteredEmployees.length}${filterDesc.length ? '  |  ' + filterDesc.join(', ') : ''}`;
    doc.text(subtitle, 40, 56);

    autoTable(doc, {
      startY: 68,
      head: [activeFields.map((f) => f.label)],
      body: filteredEmployees.map((emp) => activeFields.map((f) => String(f.getValue(emp)))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(170);
      doc.text(`Page ${i} / ${pages}`, pageW - 80, pageH - 20);
    }

    doc.save(`employee_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  /* â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Employees
          </button>
          <h2 className="text-3xl font-bold text-slate-900">Employee Reports</h2>
          <p className="text-slate-600 mt-1">Build custom reports with selected fields and filters</p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filteredEmployees.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={filteredEmployees.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4 text-red-500" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Toolbar â€” Field picker + Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">
        {/* Row 1: field picker + search */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Field picker toggle */}
          <div ref={fieldPickerRef} className="relative">
            <button
              onClick={() => setShowFieldPicker((v) => !v)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Columns className="h-4 w-4" />
              Fields ({selectedFields.length}/{REPORT_FIELDS.length})
            </button>

            {showFieldPicker && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-[420px] overflow-y-auto">
                {/* Quick actions */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex gap-2">
                  <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">Clear All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={resetDefaults} className="text-xs text-slate-500 hover:underline flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Defaults
                  </button>
                </div>

                {FIELD_GROUPS.map((group) => {
                  const groupFields = REPORT_FIELDS.filter((f) => f.group === group);
                  const allChecked = groupFields.every((f) => selectedFields.includes(f.key));
                  const someChecked = groupFields.some((f) => selectedFields.includes(f.key));
                  return (
                    <div key={group} className="px-3 py-2">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700"
                      >
                        {allChecked ? (
                          <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                        ) : someChecked ? (
                          <div className="h-3.5 w-3.5 border-2 border-blue-400 rounded bg-blue-100" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {group}
                      </button>
                      <div className="space-y-0.5 ml-1">
                        {groupFields.map((f) => (
                          <label
                            key={f.key}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(f.key)}
                              onChange={() => toggleField(f.key)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or emailâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 2: Filter dropdowns */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EmployeeStatus | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
            <option value="On Leave">On Leave</option>
            <option value="Retired">Retired</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as EmployeeCategory | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="WhiteCollar">White Collar</option>
            <option value="BlueCollar">Blue Collar</option>
            <option value="Management">Management</option>
            <option value="PartTime">Part Time</option>
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 ml-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredEmployees.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{employees.length}</span> employees
          {selectedFields.length > 0 && (
            <> &middot; <span className="font-semibold text-slate-900">{selectedFields.length}</span> fields selected</>
          )}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading employee dataâ€¦</p>
          </div>
        </div>
      )}

      {/* No fields selected */}
      {!isLoading && selectedFields.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Columns className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No fields selected</p>
          <p className="text-sm mt-1">Click the <strong>Fields</strong> button above to choose columns for your report.</p>
        </div>
      )}

      {/* Report Table */}
      {!isLoading && selectedFields.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                {activeFields.map((f) => (
                  <th key={f.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={activeFields.length + 1} className="px-6 py-12 text-center text-slate-500">
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    {activeFields.map((f) => (
                      <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {f.key === 'employmentStatus' ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            emp.employmentStatus === 'Active' ? 'bg-green-100 text-green-800' :
                            emp.employmentStatus === 'Resigned' ? 'bg-red-100 text-red-800' :
                            emp.employmentStatus === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {f.getValue(emp)}
                          </span>
                        ) : (
                          String(f.getValue(emp))
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --- Leaves Report Component --- */
function LeavesReportContent() {
  const { getAllEmployees } = useEmployee();

  const [leaves, setLeaves] = useState<LeaveReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_LEAVE_SELECTED);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [branches, setBranches] = useState<string[]>([]);
  const [depts, setDepts] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rawLeaves, emps, orgBranches, orgDepts] = await Promise.all([
        leavesService.getAll(),
        getAllEmployees(),
        organizationService.getBranches().catch(() => []),
        organizationService.getDepartments().catch(() => []),
      ]);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const enriched: LeaveReportRow[] = rawLeaves.map((l) => ({
        ...l,
        employeeDepartment: empMap.get(l.employeeId)?.department ?? '',
        employeeBranch: l.employeeBranch || empMap.get(l.employeeId)?.branch || '',
      }));
      setLeaves(enriched);
      const bFromEmps = emps.map((e) => e.branch).filter(Boolean) as string[];
      const dFromEmps = emps.map((e) => e.department).filter(Boolean) as string[];
      setBranches([...new Set([...orgBranches.filter((b) => b.isActive !== false).map((b) => b.name), ...bFromEmps])].sort());
      setDepts([...new Set([...orgDepts.map((d) => d.name), ...dFromEmps])].sort());
    } catch { console.error('Failed to load leaves'); }
    finally { setIsLoading(false); }
  };

  const filtered = useMemo(() => leaves.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.employeeName?.toLowerCase().includes(q) && !l.employeeId?.toLowerCase().includes(q)) return false;
    }
    if (filterBranch && l.employeeBranch !== filterBranch) return false;
    if (filterDept && l.employeeDepartment !== filterDept) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterType && l.leaveType !== filterType) return false;
    if (filterYear) {
      const year = new Date(l.startDate).getFullYear().toString();
      if (year !== filterYear) return false;
    }
    return true;
  }), [leaves, search, filterBranch, filterDept, filterStatus, filterType, filterYear]);

  const activeFields = useMemo(() => LEAVE_REPORT_FIELDS.filter((f) => selectedFields.includes(f.key)), [selectedFields]);

  const toggleField = (key: string) => setSelectedFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const toggleGroup = (group: string) => {
    const keys = LEAVE_REPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSel = keys.every((k) => selectedFields.includes(k));
    setSelectedFields((prev) => allSel ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])]);
  };

  const yearOptions = useMemo(() => {
    const years = leaves.map((l) => new Date(l.startDate).getFullYear()).filter((y) => !isNaN(y));
    return [...new Set(years)].sort((a, b) => b - a).map(String);
  }, [leaves]);

  const handleExportExcel = async () => {
    if (filtered.length === 0) return;
    const XLSX = await import('xlsx');
    const rows = filtered.map((r) => {
      const row: Record<string, string | number> = {};
      activeFields.forEach((f) => { row[f.label] = f.getValue(r); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = activeFields.map((f) => ({ wch: Math.max(f.label.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves Report');
    XLSX.writeFile(wb, `leaves_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (filtered.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: activeFields.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'A4' });
    doc.setFontSize(16); doc.setTextColor(30, 64, 175); doc.text('Leaves Report', 40, 40);
    doc.setFontSize(9); doc.setTextColor(100);
    const subtitle = `Generated: ${new Date().toLocaleString()}  |  Total: ${filtered.length}`;
    doc.text(subtitle, 40, 56);
    autoTable(doc, {
      startY: 68,
      head: [activeFields.map((f) => f.label)],
      body: filtered.map((r) => activeFields.map((f) => String(f.getValue(r)))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    const pages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(170);
      doc.text(`Page ${i} / ${pages}`, pageW - 80, doc.internal.pageSize.getHeight() - 20);
    }
    doc.save(`leaves_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const hasFilters = search || filterBranch || filterDept || filterStatus || filterType || filterYear;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leaves Report</h2>
          <p className="text-slate-500 mt-0.5 text-sm">Build custom leave reports with selected fields and filters</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Excel
          </button>
          <button onClick={handleExportPdf} disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileText className="h-4 w-4 text-red-500" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div ref={fieldPickerRef} className="relative">
            <button onClick={() => setShowFieldPicker((v) => !v)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2">
              <Columns className="h-4 w-4" /> Fields ({selectedFields.length}/{LEAVE_REPORT_FIELDS.length})
            </button>
            {showFieldPicker && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-[420px] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex gap-2">
                  <button onClick={() => setSelectedFields(LEAVE_REPORT_FIELDS.map((f) => f.key))} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields([])} className="text-xs text-slate-500 hover:underline">Clear All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields(DEFAULT_LEAVE_SELECTED)} className="text-xs text-slate-500 hover:underline flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Defaults</button>
                </div>
                {LEAVE_FIELD_GROUPS.map((group) => {
                  const gFields = LEAVE_REPORT_FIELDS.filter((f) => f.group === group);
                  const allChecked = gFields.every((f) => selectedFields.includes(f.key));
                  const someChecked = gFields.some((f) => selectedFields.includes(f.key));
                  return (
                    <div key={group} className="px-3 py-2">
                      <button onClick={() => toggleGroup(group)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700">
                        {allChecked ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : someChecked ? <div className="h-3.5 w-3.5 border-2 border-blue-400 rounded bg-blue-100" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                        {group}
                      </button>
                      <div className="space-y-0.5 ml-1">
                        {gFields.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                            <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by employee name or ID..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Departments</option>
            {depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Leave Types</option>
            {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Years</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterBranch(''); setFilterDept(''); setFilterStatus(''); setFilterType(''); setFilterYear(''); }}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 ml-1">
              <RotateCcw className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{leaves.length}</span> leave requests
          {selectedFields.length > 0 && <> &middot; <span className="font-semibold text-slate-900">{selectedFields.length}</span> fields selected</>}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading leaves data...</p>
          </div>
        </div>
      )}

      {!isLoading && selectedFields.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Columns className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No fields selected</p>
          <p className="text-sm mt-1">Click the <strong>Fields</strong> button above to choose columns for your report.</p>
        </div>
      )}

      {!isLoading && selectedFields.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                {activeFields.map((f) => (
                  <th key={f.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={activeFields.length + 1} className="px-6 py-12 text-center text-slate-500">No leave records match the current filters.</td></tr>
              ) : filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  {activeFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {f.key === 'status' ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {f.getValue(r)}
                        </span>
                      ) : String(f.getValue(r))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --- Leave Balance Report Component --- */
function LeaveBalanceReportContent() {
  const { getAllEmployees } = useEmployee();

  const [balances, setBalances] = useState<BalanceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_BALANCE_SELECTED);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [branches, setBranches] = useState<string[]>([]);
  const [depts, setDepts] = useState<string[]>([]);

  useEffect(() => { loadData(); }, [year]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rawBalances, emps, orgBranches, orgDepts] = await Promise.all([
        leaveBalanceService.getAll(year),
        getAllEmployees(),
        organizationService.getBranches().catch(() => []),
        organizationService.getDepartments().catch(() => []),
      ]);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const enriched: BalanceReportRow[] = rawBalances.map((b) => ({
        ...b,
        employeeCode: empMap.get(b.employeeId)?.employeeCode ?? '',
        branch: empMap.get(b.employeeId)?.branch ?? '',
        department: empMap.get(b.employeeId)?.department ?? '',
      }));
      setBalances(enriched);
      const bFromEmps = emps.map((e) => e.branch).filter(Boolean) as string[];
      const dFromEmps = emps.map((e) => e.department).filter(Boolean) as string[];
      setBranches([...new Set([...orgBranches.filter((b) => b.isActive !== false).map((b) => b.name), ...bFromEmps])].sort());
      setDepts([...new Set([...orgDepts.map((d) => d.name), ...dFromEmps])].sort());
    } catch { console.error('Failed to load balances'); }
    finally { setIsLoading(false); }
  };

  const filtered = useMemo(() => balances.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      if (!b.employeeName?.toLowerCase().includes(q) && !b.employeeCode?.toLowerCase().includes(q)) return false;
    }
    if (filterBranch && b.branch !== filterBranch) return false;
    if (filterDept && b.department !== filterDept) return false;
    return true;
  }), [balances, search, filterBranch, filterDept]);

  const activeFields = useMemo(() => BALANCE_REPORT_FIELDS.filter((f) => selectedFields.includes(f.key)), [selectedFields]);

  const toggleField = (key: string) => setSelectedFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const toggleGroup = (group: string) => {
    const keys = BALANCE_REPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSel = keys.every((k) => selectedFields.includes(k));
    setSelectedFields((prev) => allSel ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])]);
  };

  const handleExportExcel = async () => {
    if (filtered.length === 0) return;
    const XLSX = await import('xlsx');
    const rows = filtered.map((r) => {
      const row: Record<string, string | number> = {};
      activeFields.forEach((f) => { row[f.label] = f.getValue(r); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = activeFields.map((f) => ({ wch: Math.max(f.label.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
    XLSX.writeFile(wb, `leave_balances_${year}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (filtered.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: activeFields.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'A4' });
    doc.setFontSize(16); doc.setTextColor(30, 64, 175); doc.text(`Leave Balances Report - ${year}`, 40, 40);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${filtered.length}`, 40, 56);
    autoTable(doc, {
      startY: 68,
      head: [activeFields.map((f) => f.label)],
      body: filtered.map((r) => activeFields.map((f) => String(f.getValue(r)))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    const pages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(170);
      doc.text(`Page ${i} / ${pages}`, pageW - 80, doc.internal.pageSize.getHeight() - 20);
    }
    doc.save(`leave_balances_${year}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Balances Report</h2>
          <p className="text-slate-500 mt-0.5 text-sm">View and export leave balance data with selected fields</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Excel
          </button>
          <button onClick={handleExportPdf} disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <FileText className="h-4 w-4 text-red-500" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div ref={fieldPickerRef} className="relative">
            <button onClick={() => setShowFieldPicker((v) => !v)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2">
              <Columns className="h-4 w-4" /> Fields ({selectedFields.length}/{BALANCE_REPORT_FIELDS.length})
            </button>
            {showFieldPicker && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-[420px] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex gap-2">
                  <button onClick={() => setSelectedFields(BALANCE_REPORT_FIELDS.map((f) => f.key))} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields([])} className="text-xs text-slate-500 hover:underline">Clear All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields(DEFAULT_BALANCE_SELECTED)} className="text-xs text-slate-500 hover:underline flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Defaults</button>
                </div>
                {BALANCE_FIELD_GROUPS.map((group) => {
                  const gFields = BALANCE_REPORT_FIELDS.filter((f) => f.group === group);
                  const allChecked = gFields.every((f) => selectedFields.includes(f.key));
                  const someChecked = gFields.some((f) => selectedFields.includes(f.key));
                  return (
                    <div key={group} className="px-3 py-2">
                      <button onClick={() => toggleGroup(group)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700">
                        {allChecked ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : someChecked ? <div className="h-3.5 w-3.5 border-2 border-blue-400 rounded bg-blue-100" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                        {group}
                      </button>
                      <div className="space-y-0.5 ml-1">
                        {gFields.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                            <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by employee name or code..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Departments</option>
            {depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || filterBranch || filterDept) && (
            <button onClick={() => { setSearch(''); setFilterBranch(''); setFilterDept(''); }}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 ml-1">
              <RotateCcw className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{balances.length}</span> records for year{' '}
          <span className="font-semibold text-slate-900">{year}</span>
          {selectedFields.length > 0 && <> &middot; <span className="font-semibold text-slate-900">{selectedFields.length}</span> fields selected</>}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading balance data...</p>
          </div>
        </div>
      )}

      {!isLoading && selectedFields.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Columns className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No fields selected</p>
          <p className="text-sm mt-1">Click the <strong>Fields</strong> button above to choose columns for your report.</p>
        </div>
      )}

      {!isLoading && selectedFields.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                {activeFields.map((f) => (
                  <th key={f.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={activeFields.length + 1} className="px-6 py-12 text-center text-slate-500">No balance records match the current filters.</td></tr>
              ) : filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                  {activeFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {String(f.getValue(r))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Attendance Report ───────────────────────────────────────────────── */

function AttendanceReportContent() {
  const { getAllEmployees } = useEmployee();
  const [monthRanges, setMonthRanges] = useState<MonthRange[]>([]);
  const [selectedRangeId, setSelectedRangeId] = useState('');
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_ATTENDANCE_SELECTED);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    organizationService.getMonthRanges().then((ranges) => {
      setMonthRanges(ranges);
      if (ranges.length > 0) setSelectedRangeId(ranges[0].id ?? ranges[0].monthName);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRangeId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRangeId]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) {
        setShowFieldPicker(false);
      }
    }
    if (showFieldPicker) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showFieldPicker]);

  const loadData = async () => {
    const range = monthRanges.find((r) => (r.id ?? r.monthName) === selectedRangeId);
    if (!range) return;
    setIsLoading(true);
    try {
      const year = new Date(range.startDate).getFullYear();
      const [logs, emps, balances] = await Promise.all([
        attendanceService.getAllLogs({ startDate: range.startDate, endDate: range.endDate, limit: 10000 }),
        getAllEmployees(),
        leaveBalanceService.getAll(year).catch(() => [] as LeaveBalance[]),
      ]);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const balMap = new Map(balances.map((b) => [b.employeeId, b]));

      const grouped = new Map<string, AttendanceRecord[]>();
      for (const log of logs) {
        const arr = grouped.get(log.employeeId) ?? [];
        arr.push(log);
        grouped.set(log.employeeId, arr);
      }

      const result: AttendanceReportRow[] = [];
      for (const [empId, empLogs] of grouped) {
        const emp = empMap.get(empId);
        const bal = balMap.get(empId);
        let totalWorkingMins = 0;
        let totalLateMinutes = 0;
        let daysWithLate = 0;
        let absenceDays = 0;
        let onLeaveDays = 0;

        for (const log of empLogs) {
          totalWorkingMins += calcWorkingMinutes(log.checkIn, log.checkOut);
          const effectiveLate = log.lateMinutesOverride ?? log.lateMinutes ?? 0;
          totalLateMinutes += effectiveLate;
          if (effectiveLate > 0) daysWithLate++;
          if (log.status === 'absent') absenceDays++;
          if (log.status === 'on_leave' || log.status === 'unpaid_leave') onLeaveDays++;
        }

        result.push({
          employeeId: empId,
          employeeCode: empLogs[0].employeeCode || emp?.employeeCode || '',
          employeeName: empLogs[0].employeeName || emp?.fullName || '',
          branch: empLogs[0].branch || emp?.branch || '',
          jobTitle: emp?.jobTitle || '',
          totalWorkingHours: totalWorkingMins / 60,
          totalLateMinutes,
          daysWithLate,
          absenceDays,
          onLeaveDays,
          annualBalance: (bal?.annual?.allocated ?? 0) - (bal?.annual?.used ?? 0),
          casualBalance: (bal?.casual?.allocated ?? 0) - (bal?.casual?.used ?? 0),
          sickBalance:   (bal?.sick?.allocated ?? 0)   - (bal?.sick?.used ?? 0),
        });
      }

      result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      setRows(result);
      setBranches([...new Set(result.map((r) => r.branch).filter(Boolean))].sort());
    } catch (e) {
      console.error('Failed to load attendance report', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeFields = ATTENDANCE_REPORT_FIELDS.filter((f) => selectedFields.includes(f.key));

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterBranch && r.branch !== filterBranch) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.employeeName.toLowerCase().includes(q) && !r.employeeCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterBranch]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllInGroup = (group: string) => {
    const groupKeys = ATTENDANCE_REPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSelected = groupKeys.every((k) => selectedFields.includes(k));
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const exportExcel = () => {
    const header = activeFields.map((f) => f.label);
    const dataRows = filteredRows.map((r) => activeFields.map((f) => f.getValue(r)));
    const range = monthRanges.find((r) => (r.id ?? r.monthName) === selectedRangeId);
    const csvContent = [header, ...dataRows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${range?.monthName ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const range = monthRanges.find((r) => (r.id ?? r.monthName) === selectedRangeId);
    const title = `Attendance Report — ${range?.monthName ?? ''}`;
    const header = activeFields.map((f) => f.label);
    const dataRows = filteredRows.map((r) => activeFields.map((f) => String(f.getValue(r))));

    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:sans-serif;font-size:11px;padding:16px}
      h2{margin-bottom:8px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}
      th{background:#f0f4ff}
    </style></head><body>
      <h2>${title}</h2>
      <table>
        <thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${dataRows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win?.print();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Report</h1>
          <p className="text-slate-500 text-sm mt-1">Summary per employee for the selected period</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Month range selector */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <select
            value={selectedRangeId}
            onChange={(e) => setSelectedRangeId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthRanges.length === 0 && <option value="">No month ranges configured</option>}
            {monthRanges.map((r) => (
              <option key={r.id ?? r.monthName} value={r.id ?? r.monthName}>
                {r.monthName} ({r.startDate} → {r.endDate})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>

        {/* Branch filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Column picker */}
        <div className="relative" ref={fieldPickerRef}>
          <button
            onClick={() => setShowFieldPicker((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            <Columns className="h-4 w-4" />
            Columns ({selectedFields.length})
          </button>
          {showFieldPicker && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-72">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Choose Columns</span>
                <button
                  onClick={() => setSelectedFields(DEFAULT_ATTENDANCE_SELECTED)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
              {ATTENDANCE_FIELD_GROUPS.map((group) => {
                const groupFields = ATTENDANCE_REPORT_FIELDS.filter((f) => f.group === group);
                const allSelected = groupFields.every((f) => selectedFields.includes(f.key));
                return (
                  <div key={group} className="mb-3">
                    <button
                      onClick={() => toggleAllInGroup(group)}
                      className="flex items-center gap-2 w-full text-left mb-1"
                    >
                      {allSelected
                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                        : <Square className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group}</span>
                    </button>
                    <div className="ml-6 space-y-1">
                      {groupFields.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => toggleField(f.key)}
                          className="flex items-center gap-2 w-full text-left"
                        >
                          {selectedFields.includes(f.key)
                            ? <CheckSquare className="h-4 w-4 text-blue-600" />
                            : <Square className="h-4 w-4 text-slate-400" />}
                          <span className="text-sm text-slate-700">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <span className="text-sm text-slate-500 ml-auto">{filteredRows.length} employees</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No data for the selected period.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {activeFields.map((f) => (
                  <th key={f.key} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={row.employeeId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {activeFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap border-b border-slate-100">
                      {String(f.getValue(row))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Payroll Report Component ──────────────────────────────────────────── */

function PayrollReportContent() {
  const { getAllEmployees } = useEmployee();

  const [payrollData, setPayrollData] = useState<PayrollReportRow[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_PAYROLL_SELECTED);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search,         setSearch]         = useState('');
  const [filterMonth,    setFilterMonth]    = useState('');
  const [filterBranch,   setFilterBranch]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [response, emps] = await Promise.all([
        payrollService.getAll({ limit: 5000 }),
        getAllEmployees(),
      ]);
      const empMap = new Map(emps.map((e) => [e.id, e]));
      const enriched: PayrollReportRow[] = (response.items ?? []).map((rec) => ({
        ...rec,
        category: empMap.get(rec.employeeId)?.category ?? '',
        jobTitle:  empMap.get(rec.employeeId)?.jobTitle  ?? '',
      }));
      setPayrollData(enriched);
    } catch (err) {
      console.error('Failed to load payroll report data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived filter options from loaded data
  const monthOptions = useMemo(
    () => [...new Set(payrollData.map((r) => r.payrollMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [payrollData],
  );
  const branchOptions = useMemo(
    () => [...new Set(payrollData.map((r) => r.branch).filter(Boolean))].sort(),
    [payrollData],
  );

  // Filtered rows
  const filtered = useMemo(() => {
    return payrollData.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.employeeName?.toLowerCase().includes(q) && !r.employeeCode?.toLowerCase().includes(q)) return false;
      }
      if (filterMonth    && r.payrollMonth !== filterMonth)    return false;
      if (filterBranch   && r.branch       !== filterBranch)   return false;
      if (filterCategory && r.category     !== filterCategory) return false;
      if (filterStatus   && r.status       !== filterStatus)   return false;
      return true;
    });
  }, [payrollData, search, filterMonth, filterBranch, filterCategory, filterStatus]);

  const activeFields = useMemo(
    () => PAYROLL_REPORT_FIELDS.filter((f) => selectedFields.includes(f.key)),
    [selectedFields],
  );

  const toggleField = (key: string) =>
    setSelectedFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const toggleGroup = (group: string) => {
    const keys = PAYROLL_REPORT_FIELDS.filter((f) => f.group === group).map((f) => f.key);
    const allSel = keys.every((k) => selectedFields.includes(k));
    setSelectedFields((prev) => allSel ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])]);
  };

  const hasFilters = search || filterMonth || filterBranch || filterCategory || filterStatus;

  const clearFilters = () => {
    setSearch('');
    setFilterMonth('');
    setFilterBranch('');
    setFilterCategory('');
    setFilterStatus('');
  };

  /* --- Export Excel --- */
  const handleExportExcel = async () => {
    if (filtered.length === 0) return;
    const XLSX = await import('xlsx');
    const rows = filtered.map((r) => {
      const row: Record<string, string | number> = {};
      activeFields.forEach((f) => { row[f.label] = f.getValue(r); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = activeFields.map((f) => ({ wch: Math.max(f.label.length + 2, 16) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Report');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, 'payroll_report_' + dateStr + '.xlsx');
  };

  /* --- Export PDF --- */
  const handleExportPdf = async () => {
    if (filtered.length === 0) return;
    const { jsPDF }    = await import('jspdf');
    const autoTable    = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: activeFields.length > 7 ? 'landscape' : 'portrait', unit: 'pt', format: 'A4' });

    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Payroll Report', 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const filterDesc: string[] = [];
    if (filterMonth)    filterDesc.push('Month: ' + filterMonth);
    if (filterBranch)   filterDesc.push('Branch: ' + filterBranch);
    if (filterCategory) filterDesc.push('Category: ' + filterCategory);
    if (filterStatus)   filterDesc.push('Status: ' + filterStatus);
    const subtitle = 'Generated: ' + new Date().toLocaleString() + '  |  Total: ' + filtered.length +
      (filterDesc.length ? '  |  ' + filterDesc.join(', ') : '');
    doc.text(subtitle, 40, 56);

    autoTable(doc, {
      startY: 68,
      head: [activeFields.map((f) => f.label)],
      body: filtered.map((r) => activeFields.map((f) => String(f.getValue(r)))),
      styles: { fontSize: 6.5, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pages  = doc.getNumberOfPages();
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(170);
      doc.text('Page ' + i + ' / ' + pages, pageW - 80, pageH - 20);
    }
    doc.save('payroll_report_' + new Date().toISOString().split('T')[0] + '.pdf');
  };

  /* --- Render --- */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll Report</h2>
          <p className="text-slate-500 mt-0.5 text-sm">Build custom payroll reports with selected fields and filters</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4 text-red-500" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">

        {/* Row 1: field picker + search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div ref={fieldPickerRef} className="relative">
            <button
              onClick={() => setShowFieldPicker((v) => !v)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Columns className="h-4 w-4" />
              Fields ({selectedFields.length}/{PAYROLL_REPORT_FIELDS.length})
            </button>

            {showFieldPicker && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-[440px] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex gap-2">
                  <button onClick={() => setSelectedFields(PAYROLL_REPORT_FIELDS.map((f) => f.key))} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields([])} className="text-xs text-slate-500 hover:underline">Clear All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => setSelectedFields(DEFAULT_PAYROLL_SELECTED)} className="text-xs text-slate-500 hover:underline flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Defaults
                  </button>
                </div>
                {PAYROLL_FIELD_GROUPS.map((group) => {
                  const gFields = PAYROLL_REPORT_FIELDS.filter((f) => f.group === group);
                  const allChecked  = gFields.every((f) => selectedFields.includes(f.key));
                  const someChecked = gFields.some((f) => selectedFields.includes(f.key));
                  return (
                    <div key={group} className="px-3 py-2">
                      <button onClick={() => toggleGroup(group)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 hover:text-slate-700">
                        {allChecked ? (
                          <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                        ) : someChecked ? (
                          <div className="h-3.5 w-3.5 border-2 border-blue-400 rounded bg-blue-100" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {group}
                      </button>
                      <div className="space-y-0.5 ml-1">
                        {gFields.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(f.key)}
                              onChange={() => toggleField(f.key)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 2: filter dropdowns */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="WhiteCollar">White Collar</option>
            <option value="BlueCollar">Blue Collar</option>
            <option value="Management">Management</option>
            <option value="PartTime">Part Time</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 ml-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{payrollData.length}</span> payroll records
          {selectedFields.length > 0 && (
            <> &middot; <span className="font-semibold text-slate-900">{selectedFields.length}</span> fields selected</>
          )}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading payroll data...</p>
          </div>
        </div>
      )}

      {/* No fields */}
      {!isLoading && selectedFields.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Columns className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No fields selected</p>
          <p className="text-sm mt-1">Click the <strong>Fields</strong> button above to choose columns for your report.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && selectedFields.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                {activeFields.map((f) => (
                  <th key={f.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeFields.length + 1} className="px-6 py-12 text-center text-slate-500">
                    No payroll records match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    {activeFields.map((f) => (
                      <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {f.key === 'status' ? (
                          <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' +
                            (r.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            {String(f.getValue(r))}
                          </span>
                        ) : (
                          String(f.getValue(r))
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
