'use client';

import { AttendanceRecord, AttendanceFormData, AttendanceFilters } from '@/types/attendance';

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
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

class AttendanceService {
  async createLog(data: AttendanceFormData): Promise<AttendanceRecord> {
    return apiFetch<AttendanceRecord>('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllLogs(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.branch) params.set('branch', filters.branch);
    if (filters?.employeeName) params.set('employeeName', filters.employeeName);
    if (filters?.employeeCode) params.set('employeeCode', filters.employeeCode);
    if (filters?.employeeId) params.set('employeeId', filters.employeeId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return apiFetch<AttendanceRecord[]>(`/api/attendance${qs ? `?${qs}` : ''}`);
  }

  async getLogById(id: string): Promise<AttendanceRecord | null> {
    try {
      return await apiFetch<AttendanceRecord>(`/api/attendance/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  async updateLog(id: string, data: Partial<AttendanceFormData>): Promise<AttendanceRecord> {
    return apiFetch<AttendanceRecord>(`/api/attendance/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLog(id: string): Promise<void> {
    await apiFetch<void>(`/api/attendance/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async bulkImport(records: AttendanceFormData[]): Promise<{ imported: number; records: AttendanceRecord[] }> {
    return apiFetch('/api/attendance/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  }

  async getExportData(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.branch) params.set('branch', filters.branch);
    if (filters?.employeeName) params.set('employeeName', filters.employeeName);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return apiFetch<AttendanceRecord[]>(`/api/attendance/export${qs ? `?${qs}` : ''}`);
  }

  async getImportTemplate(): Promise<any> {
    return apiFetch('/api/attendance/import-template');
  }
}

export const attendanceService = new AttendanceService();
