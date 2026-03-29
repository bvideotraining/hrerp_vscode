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
import { employeeService } from '@/lib/services/employee.service';
import { auditLoggingService } from '@/lib/services/audit-logging.service';
import { Plus, Download, Upload, FileSpreadsheet, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { EmployeeImportGuideModal } from '@/components/employees/import-guide-modal';

export default function EmployeesPage() {
  return (
    <ProtectedRoute moduleId="employees">
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
  const isOwnScope = user?.accessType === 'custom' && !!(user?.employeeId);
  const { getAllEmployees, deleteEmployee, batchCreateEmployees } = useEmployee();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#export-menu-container')) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnScope, user?.employeeId]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      if (isOwnScope && user?.employeeId) {
        // Standard employees only see their own record
        const emp = await employeeService.getEmployeeById(user.employeeId);
        setEmployees(emp ? [emp as unknown as EmployeeData] : []);
      } else {
        const data = await getAllEmployees();
        setEmployees(data);
      }
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
        success(`âœ“ Employee "${emp?.fullName}" deleted successfully`);
        await loadEmployees();
      } else {
        error('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleAddEmployee = () => {
    router.push('/dashboard/employees/add');
  };

  /* â”€â”€â”€ Export helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const buildRows = () =>
    employees.map(e => ({
      'Employee Code': e.employeeCode ?? '',
      'Full Name': e.fullName ?? '',
      'Email': e.email ?? '',
      'Phone': e.phone ?? '',
      'Date of Birth': e.dateOfBirth ?? '',
      'Hiring Date': e.startDate ?? '',
      'Branch': e.branch ?? '',
      'Department': e.department ?? '',
      'Job Title': e.jobTitle ?? '',
      'Category': e.category ?? '',
      'Status': e.employmentStatus ?? '',
      'Salary': e.currentSalary ?? 0,
      'Currency': e.currency ?? '',
      'Payment Method': e.paymentMethod ?? '',
      'Bank Name': e.bankName ?? '',
      'Account Number': e.accountNumber ?? '',
      'National ID': e.nationalId ?? '',
      'Nationality': e.nationality ?? '',
    }));

  const handleExportExcel = async () => {
    if (employees.length === 0) { warning('No employees to export'); return; }
    setShowExportMenu(false);

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    // Auto-width columns
    const colWidths = Object.keys(buildRows()[0] || {}).map(k => ({ wch: Math.max(k.length, 18) }));
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);

    success(`âœ“ Exported ${employees.length} employee(s) as Excel`);
    if (user) await auditLoggingService.logExport(user.id, 'EMPLOYEE', employees.length);
  };

  const handleExportPdf = async () => {
    if (employees.length === 0) { warning('No employees to export'); return; }
    setShowExportMenu(false);

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    doc.setFontSize(14);
    doc.text('Employee Report', 40, 40);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${employees.length}`, 40, 58);

    autoTable(doc, {
      startY: 70,
      head: [['Code', 'Name', 'Email', 'DOB', 'Hire Date', 'Branch', 'Dept', 'Job Title', 'Salary', 'Account No', 'Status']],
      body: employees.map(e => [
        e.employeeCode ?? '',
        e.fullName ?? '',
        e.email ?? '',
        e.dateOfBirth ?? '',
        e.startDate ?? '',
        e.branch ?? '',
        e.department ?? '',
        e.jobTitle ?? '',
        `${e.currency ?? ''} ${e.currentSalary ?? 0}`,
        e.accountNumber ?? '',
        e.employmentStatus ?? '',
      ]),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`employees_${new Date().toISOString().split('T')[0]}.pdf`);
    success(`âœ“ Exported ${employees.length} employee(s) as PDF`);
    if (user) await auditLoggingService.logExport(user.id, 'EMPLOYEE', employees.length);
  };

  /* â”€â”€â”€ Import handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleImportFile = async (file: File) => {
    setShowImportGuide(false);
    setImportErrors([]);
    setIsImporting(true);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        setImportErrors(['The spreadsheet appears to be empty.']);
        setIsImporting(false);
        return;
      }

      const errors: string[] = [];
      const valid: any[] = [];

      rows.forEach((row, i) => {
        const rowNum = i + 2; // 1-indexed + header row
        const code = String(row['Employee Code'] ?? row['employeeCode'] ?? '').trim();
        const name = String(row['Full Name'] ?? row['fullName'] ?? '').trim();
        const email = String(row['Email'] ?? row['email'] ?? '').trim();
        const phone = String(row['Phone'] ?? row['phone'] ?? '').trim();
        const dob = String(row['Date of Birth'] ?? row['dateOfBirth'] ?? '').trim();
        const hireDate = String(row['Hiring Date'] ?? row['startDate'] ?? '').trim();

        if (!code) { errors.push(`Row ${rowNum}: Employee Code is required`); return; }
        if (!name) { errors.push(`Row ${rowNum}: Full Name is required`); return; }
        if (!email) { errors.push(`Row ${rowNum}: Email is required`); return; }

        valid.push({
          employeeCode: code,
          fullName: name,
          email,
          phone: phone || '',
          dateOfBirth: dob || '',
          startDate: hireDate || new Date().toISOString().split('T')[0],
          branch: String(row['Branch'] ?? row['branch'] ?? 'Dubai Main').trim(),
          department: String(row['Department'] ?? row['department'] ?? 'HR').trim(),
          jobTitle: String(row['Job Title'] ?? row['jobTitle'] ?? 'Staff').trim(),
          category: String(row['Category'] ?? row['category'] ?? 'WhiteCollar').trim(),
          employmentStatus: String(row['Status'] ?? row['employmentStatus'] ?? 'Active').trim(),
          currentSalary: Number(row['Salary'] ?? row['currentSalary'] ?? 0),
          currency: String(row['Currency'] ?? row['currency'] ?? 'AED').trim(),
          paymentMethod: String(row['Payment Method'] ?? row['paymentMethod'] ?? 'Bank Transfer').trim(),
          bankName: String(row['Bank Name'] ?? row['bankName'] ?? '').trim(),
          accountNumber: String(row['Account Number'] ?? row['accountNumber'] ?? '').trim(),
          nationalId: String(row['National ID'] ?? row['nationalId'] ?? '').trim(),
          nationality: String(row['Nationality'] ?? row['nationality'] ?? '').trim(),
          positionType: 'Full-time',
          employmentType: 'Permanent',
        });
      });

      if (errors.length > 0) {
        setImportErrors(errors);
        setIsImporting(false);
        return;
      }

      await batchCreateEmployees(valid);
      success(`âœ“ Imported ${valid.length} employee(s) successfully`);
      await loadEmployees();
    } catch (err: any) {
      setImportErrors([err.message || 'Failed to import. Please check the file format.']);
    } finally {
      setIsImporting(false);
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
          {!isOwnScope && (
          <div className="flex gap-3 items-center">

            {/* Import button */}
            <button
              onClick={() => setShowImportGuide(true)}
              disabled={isImporting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Import from Excel"
            >
              {isImporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                : <><Upload className="h-4 w-4" /> Import</>}
            </button>

            {/* Export dropdown */}
            <div id="export-menu-container" className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                disabled={isLoading || employees.length === 0}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
          )}
        </div>

        {/* Import errors */}
        {importErrors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">Import failed â€” please fix the following:</p>
                  <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
                    {importErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              </div>
              <button onClick={() => setImportErrors([])} className="p-1 hover:bg-red-100 rounded">
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        )}

        {/* Import help hint — hidden for own-scope employees */}
        {!isOwnScope && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Import tip:</strong> Excel file should have columns: <em>Employee Code, Full Name, Email, Phone, Date of Birth, Hiring Date, Branch, Department, Job Title, Salary, Account Number</em>
          </span>
        </div>
        )}

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
      {showImportGuide && (
        <EmployeeImportGuideModal
          onClose={() => setShowImportGuide(false)}
          onFileImport={handleImportFile}
          isImporting={isImporting}
        />
      )}
    </>
  );
}
