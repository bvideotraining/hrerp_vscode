// Employee Service — routes through backend API (NestJS + Firebase Admin SDK)
'use client';

import { Employee, EmployeeListFilters } from '@/types/employee';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function getAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `API error ${response.status}`);
  }
  // DELETE may return empty body
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

class EmployeeService {
  // Simple in-memory TTL cache (20 s) for the full employee list
  private _listCache: { data: Employee[]; ts: number } | null = null;
  private readonly _listTTL = 20_000;
  private _invalidateList() { this._listCache = null; }

  async createEmployee(employeeData: Partial<Employee>): Promise<string> {
    const result = await apiFetch<{ id: string }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
    this._invalidateList();
    return result.id;
  }

  async getAllEmployees(filters?: EmployeeListFilters): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (filters?.branch) params.set('branch', filters.branch);
    if (filters?.department) params.set('department', filters.department);
    if (filters?.status) params.set('employmentStatus', filters.status);
    if (filters?.category) params.set('category', filters.category);
    const qs = params.toString();
    // Only cache the unfilterd list (used by dashboard + dropdowns)
    if (!qs) {
      if (this._listCache && Date.now() - this._listCache.ts < this._listTTL) {
        return Promise.resolve(this._listCache.data);
      }
      return apiFetch<Employee[]>('/api/employees').then((data) => {
        this._listCache = { data, ts: Date.now() };
        return data;
      });
    }
    return apiFetch<Employee[]>(`/api/employees?${qs}`);
  }

  async getEmployeeById(employeeId: string): Promise<Employee | null> {
    try {
      return await apiFetch<Employee>(`/api/employees/${encodeURIComponent(employeeId)}`);
    } catch {
      return null;
    }
  }

  async updateEmployee(employeeId: string, updateData: Partial<Employee>): Promise<void> {
    await apiFetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    this._invalidateList();
  }

  async updateEmployeeDocuments(employeeId: string, documents: any[]): Promise<void> {
    await apiFetch(`/api/employees/${encodeURIComponent(employeeId)}/documents`, {
      method: 'PUT',
      body: JSON.stringify({ documents }),
    });
  }

  async uploadProfilePhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/employees/upload-photo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Photo upload failed ${response.status}`);
    }
    const result = await response.json();
    return result.url;
  }

  async uploadEmployeeDocument(employeeId: string, file: File): Promise<{ url: string; originalName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/employees/${encodeURIComponent(employeeId)}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Upload failed ${response.status}`);
    }
    return response.json();
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await apiFetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
      method: 'DELETE',
    });
    this._invalidateList();
  }

  async searchEmployees(searchTerm: string): Promise<Employee[]> {
    return apiFetch<Employee[]>(`/api/employees/search/${encodeURIComponent(searchTerm)}`);
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    return apiFetch<Employee[]>(`/api/employees/department/${encodeURIComponent(department)}`);
  }

  async getEmployeesByBranch(branch: string): Promise<Employee[]> {
    return apiFetch<Employee[]>(`/api/employees/branch/${encodeURIComponent(branch)}`);
  }

  async getActiveEmployeeCount(): Promise<number> {
    const result = await apiFetch<number | { count: number }>('/api/employees/stats/active-count');
    return typeof result === 'number' ? result : result.count;
  }

  async batchCreateEmployees(employees: Partial<Employee>[]): Promise<string[]> {
    return apiFetch<string[]>('/api/employees/batch/create', {
      method: 'POST',
      body: JSON.stringify(employees),
    });
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();
export default employeeService;
