'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useEmployee } from '@/hooks/use-employee';
import { organizationService } from '@/lib/services/organization.service';
import { Employee, EmployeeStatus, EmployeeCategory } from '@/types/employee';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Columns,
  Download,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  Eye,
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
function ReportsContent() {
  const router = useRouter();
  const { user } = useAuth();
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
