'use client';

import { useRouter } from 'next/navigation';
import { EmployeeForm } from '@/components/forms/employee-form';
import { ToastContainer } from '@/components/ui/toast-container';
import { useToast } from '@/hooks/use-toast';
import { useEmployee } from '@/hooks/use-employee';
import { EmployeeFormData } from '@/types/employee';

export default function AddEmployeePage() {
  const router = useRouter();
  const { toasts, dismiss, success, error } = useToast();
  const { createEmployee, loading } = useEmployee();

  const handleSubmit = async (formData: EmployeeFormData) => {
    const employeeId = await createEmployee(formData);

    if (employeeId) {
      success(`✓ Employee "${formData.fullName}" created successfully!`);

      // Redirect after success notification
      setTimeout(() => {
        router.push('/dashboard/employees');
      }, 1500);
    } else {
      error('Failed to create employee. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Add New Employee</h1>
            <p className="text-slate-600 mt-2">Fill in the employee information below</p>
          </div>

          <EmployeeForm
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
