'use client';

import { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeeStatus, EmployeeCategory } from '@/types/employee';
import { organizationService } from '@/lib/services/organization.service';
import { Eye, Trash2, Edit2, Search } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
  onView: (employee: Employee) => void;
}

export function EmployeeList({ employees, onEdit, onDelete, onView }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    branch: '',
    department: '',
    status: '' as EmployeeStatus | '',
    category: '' as EmployeeCategory | ''
  });

  // Dynamic org data for filters
  const [orgBranches, setOrgBranches] = useState<string[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([
      organizationService.getBranches(),
      organizationService.getDepartments(),
    ]).then(([b, d]) => {
      setOrgBranches(b.filter((x) => x.isActive !== false).map((x) => x.name));
      setOrgDepartments(d.map((x) => x.name));
    }).catch(() => {});
  }, []);

  // Merge org data with any unique values already in employee records
  const branchOptions = useMemo(() => {
    const fromEmployees = employees.map(e => e.branch).filter(Boolean);
    return [...new Set([...orgBranches, ...fromEmployees])].sort();
  }, [employees, orgBranches]);

  const departmentOptions = useMemo(() => {
    const fromEmployees = employees.map(e => e.department).filter(Boolean);
    return [...new Set([...orgDepartments, ...fromEmployees])].sort();
  }, [employees, orgDepartments]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = !filters.branch || emp.branch === filters.branch;
    const matchesDepartment = !filters.department || emp.department === filters.department;
    const matchesStatus = !filters.status || emp.employmentStatus === filters.status;
    const matchesCategory = !filters.category || emp.category === filters.category;

    return matchesSearch && matchesBranch && matchesDepartment && matchesStatus && matchesCategory;
  });

  const statusColors: Record<EmployeeStatus, string> = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-slate-100 text-slate-800',
    'Resigned': 'bg-red-100 text-red-800',
    'On Leave': 'bg-orange-100 text-orange-800',
    'Retired': 'bg-blue-100 text-blue-800'
  };

  const categoryColors: Record<EmployeeCategory, string> = {
    'WhiteCollar': 'text-blue-600',
    'BlueCollar': 'text-orange-600',
    'Management': 'text-purple-600',
    'PartTime': 'text-green-600'
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-4 py-2">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-slate-900 placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branchOptions.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departmentOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as EmployeeStatus | '' })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
            <option value="On Leave">On Leave</option>
            <option value="Retired">Retired</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as EmployeeCategory | '' })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="WhiteCollar">White Collar</option>
            <option value="BlueCollar">Blue Collar</option>
            <option value="Management">Management</option>
            <option value="PartTime">Part Time</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-600">
        Showing {filteredEmployees.length} of {employees.length} employees
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Code</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Branch</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Department</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Job Title</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-600">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{emp.fullName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.employeeCode}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.branch}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.jobTitle}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-medium ${categoryColors[emp.category]}`}>
                      {emp.category.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[emp.employmentStatus]}`}>
                      {emp.employmentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView(emp)}
                        title="View"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(emp)}
                        title="Edit"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(emp.id)}
                        title="Delete"
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-600 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
