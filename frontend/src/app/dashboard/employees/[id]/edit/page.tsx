'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeData } from '@/types/employee';
import { Employee } from '@/types/employee';
import { EmployeeForm } from '@/components/forms/employee-form';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToast } from '@/hooks/use-toast';
import { useEmployee } from '@/hooks/use-employee';

interface EditEmployeePageProps {
  params: { id: string };
}

export default function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id } = params;
  const router = useRouter();
  const { toasts, dismiss, success, error } = useToast();
  const { getEmployee, updateEmployee, loading, error: updateError } = useEmployee();
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
      error('Failed to load employee');
      console.error('Error loading employee:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: Partial<Employee>) => {
    const isSuccess = await updateEmployee(id, formData as any);

    if (isSuccess) {
      success(`✓ Employee "${formData.fullName}" updated successfully!`);

      setTimeout(() => {
        router.push(`/dashboard/employees/${id}`);
      }, 1500);
    } else {
      error(`Failed to update employee. ${updateError || 'Please try again.'}`);
    }
  };

  const handleCancel = () => {
    router.back();
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
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Employee not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Edit Employee</h1>
            <p className="text-slate-600 mt-2">{employee.fullName}</p>
          </div>

          <EmployeeForm
            initialData={employee as any}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={loading}
          />
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
