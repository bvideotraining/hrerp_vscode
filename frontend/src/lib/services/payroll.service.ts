import type {
  PayrollRecord,
  PayrollListResponse,
  PayrollFilters,
  GeneratePayrollPayload,
  UpdatePayrollPayload,
  BatchGenerateResult,
} from '@/types/payroll';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const payrollService = {
  getAll(filters?: PayrollFilters): Promise<PayrollListResponse> {
    const p = new URLSearchParams();
    if (filters?.payrollMonth) p.set('payrollMonth', filters.payrollMonth);
    if (filters?.employeeId) p.set('employeeId', filters.employeeId);
    if (filters?.department) p.set('department', filters.department);
    if (filters?.branch) p.set('branch', filters.branch);
    if (filters?.status) p.set('status', filters.status);
    if (filters?.search) p.set('search', filters.search);
    if (filters?.page != null) p.set('page', String(filters.page));
    if (filters?.limit != null) p.set('limit', String(filters.limit));
    const qs = p.toString();
    return apiFetch<PayrollListResponse>(`/api/payroll${qs ? `?${qs}` : ''}`);
  },

  getOne(id: string): Promise<PayrollRecord> {
    return apiFetch<PayrollRecord>(`/api/payroll/${encodeURIComponent(id)}`);
  },

  generate(payload: GeneratePayrollPayload): Promise<PayrollRecord> {
    return apiFetch<PayrollRecord>('/api/payroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdatePayrollPayload): Promise<PayrollRecord> {
    return apiFetch<PayrollRecord>(`/api/payroll/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  publish(id: string): Promise<PayrollRecord> {
    return apiFetch<PayrollRecord>(`/api/payroll/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/payroll/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  generateBatch(monthRangeId: string): Promise<BatchGenerateResult> {
    return apiFetch<BatchGenerateResult>('/api/payroll/generate-batch', {
      method: 'POST',
      body: JSON.stringify({ monthRangeId }),
    });
  },
};
