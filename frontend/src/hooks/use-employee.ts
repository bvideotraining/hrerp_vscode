// Custom React hook for employee operations with Firestore
'use client';

import { useState, useCallback } from 'react';
import { employeeService } from '@/lib/services/employee.service';
import { auditLoggingService } from '@/lib/services/audit-logging.service';
import { useAuth } from '@/context/auth-context';
import { EmployeeData, EmployeeFormData } from '@/types/employee';

export function useEmployee() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEmployee = useCallback(
    async (data: EmployeeFormData): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const id = await employeeService.createEmployee(data as any);
        
        // Log the action
        if (user) {
          await auditLoggingService.logEmployeeCreate(user.id, id, data);
        }
        
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create employee';
        setError(message);
        
        // Log failure
        if (user) {
          await auditLoggingService.logFailure(
            user.id,
            'CREATE',
            'EMPLOYEE',
            err instanceof Error ? err : new Error(message)
          );
        }
        
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const updateEmployee = useCallback(
    async (id: string, data: EmployeeFormData): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await employeeService.updateEmployee(id, data as any);
        
        // Log the action
        if (user) {
          await auditLoggingService.logEmployeeUpdate(user.id, id, data);
        }
        
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update employee';
        setError(message);
        
        // Log failure
        if (user) {
          await auditLoggingService.logFailure(
            user.id,
            'UPDATE',
            'EMPLOYEE',
            err instanceof Error ? err : new Error(message)
          );
        }
        
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteEmployee = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await employeeService.deleteEmployee(id);
        
        // Log the action
        if (user) {
          await auditLoggingService.logEmployeeDelete(user.id, id);
        }
        
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete employee';
        setError(message);
        
        // Log failure
        if (user) {
          await auditLoggingService.logFailure(
            user.id,
            'DELETE',
            'EMPLOYEE',
            err instanceof Error ? err : new Error(message)
          );
        }
        
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const getEmployee = useCallback(
    async (id: string): Promise<EmployeeData | null> => {
      setLoading(true);
      setError(null);
      try {
        return await employeeService.getEmployeeById(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch employee';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getAllEmployees = useCallback(
    async (filters?: {
      branch?: string;
      department?: string;
      employmentStatus?: string;
      category?: string;
    }): Promise<EmployeeData[]> => {
      setLoading(true);
      setError(null);
      try {
        return await employeeService.getAllEmployees(filters as any);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch employees';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const searchEmployees = useCallback(
    async (searchTerm: string): Promise<EmployeeData[]> => {
      setLoading(true);
      setError(null);
      try {
        return await employeeService.searchEmployees(searchTerm);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search employees';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const batchCreateEmployees = useCallback(
    async (employees: any[]): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await employeeService.batchCreateEmployees(employees);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import employees';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    getAllEmployees,
    searchEmployees,
    batchCreateEmployees,
    clearError,
  };
}
