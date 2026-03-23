'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeData } from '@/types/employee';
import { useEmployee } from '@/hooks/use-employee';
import { ArrowLeft } from 'lucide-react';

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { getEmployee } = useEmployee();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployee(id);
      setEmployee(data);
    } catch (err) {
      console.error('Error loading employee:', err);
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading employee...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Employee not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-4xl font-bold">
                  {employee.fullName.split(' ').map((n: string) => n[0]).join('')}
                </div>
              </div>

              {/* Info */}
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-slate-900">{employee.fullName}</h1>
                <p className="text-slate-600 mt-1">{employee.jobTitle}</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Employee Code</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {employee.employmentStatus}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Department</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Branch</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.branch}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Date of Birth</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Nationality</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.nationality}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">National ID</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.nationalId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Gender</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.gender === 'M' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Current Address</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.currentAddress}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Marital Status</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.maritalStatus}</p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Employment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.startDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Employment Type</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.employmentType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Category</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.category}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Position Type</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.positionType}</p>
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Salary Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Current Salary</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: employee.currency || 'AED'
                  }).format(employee.currentSalary)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Payment Method</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          {employee.documents && employee.documents.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Documents</h2>
              <div className="space-y-3">
                {employee.documents.map((doc: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg flex items-between justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{doc.type}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Received: {doc.receivedDate}
                        {doc.expiryDate && ` | Expires: ${doc.expiryDate}`}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                        doc.status === 'Current' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={() => router.push(`/dashboard/employees/${id}/edit`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Edit Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
