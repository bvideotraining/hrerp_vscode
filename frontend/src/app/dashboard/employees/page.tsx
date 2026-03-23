'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { EmployeeData } from '@/types/employee';
import { EmployeeList } from '@/components/employees/employee-list';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToast } from '@/hooks/use-toast';
import { useEmployee } from '@/hooks/use-employee';
import { useAuth } from '@/context/auth-context';
import { auditLoggingService } from '@/lib/services/audit-logging.service';
import { Plus, Download } from 'lucide-react';

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <EmployeesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function EmployeesContent() {
  const router = useRouter();
  const { toasts, dismiss, success, warning, error } = useToast();
  const { user } = useAuth();
  const { getAllEmployees, deleteEmployee } = useEmployee();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      error('Failed to load employees');
      console.error('Error loading employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (emp: EmployeeData) => {
    router.push(`/dashboard/employees/${emp.id}/edit`);
  };

  const handleView = (emp: EmployeeData) => {
    router.push(`/dashboard/employees/${emp.id}`);
  };

  const handleDelete = async (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const confirmDelete = confirm(
      `Are you sure you want to delete ${emp?.fullName}? This action cannot be undone.`
    );

    if (confirmDelete) {
      const isSuccess = await deleteEmployee(empId);
      if (isSuccess) {
        success(`✓ Employee "${emp?.fullName}" deleted successfully`);
        // Reload employees
        await loadEmployees();
      } else {
        error('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleAddEmployee = () => {
    router.push('/dashboard/employees/add');
  };

  const handleExport = async () => {
    if (employees.length === 0) {
      warning('No employees to export');
      return;
    }

    const csvContent = [
      ['Name', 'Code', 'Email', 'Phone', 'Department', 'Branch', 'Job Title', 'Salary', 'Status'],
      ...employees.map(e => [
        e.fullName,
        e.employeeCode,
        e.email,
        e.phone,
        e.department,
        e.branch,
        e.jobTitle,
        e.currentSalary,
        e.employmentStatus
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success(`✓ Exported ${employees.length} employee(s)`);

    // Log the export
    if (user) {
      await auditLoggingService.logExport(user.id, 'EMPLOYEE', employees.length);
    }
  };

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Employees</h2>
            <p className="text-slate-600 mt-2">Manage and view all employee information</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={isLoading || employees.length === 0}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading employees...</p>
            </div>
          </div>
        )}

        {/* Employee List */}
        {!isLoading && (
          <EmployeeList
            employees={employees}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        )}
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
