import type {
  SalaryConfig,
  SalaryLineItem,
  CreateSalaryConfigPayload,
  UpdateSalaryConfigPayload,
} from '@/types/salary-config';
import type { SalaryIncrease, CreateSalaryIncreasePayload, UpdateSalaryIncreasePayload } from '@/types/salary-increases';

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

export const salaryConfigService = {
  // ─── List / filter ──────────────────────────────────────────────────────
  getAll(employeeId?: string, month?: string, search?: string): Promise<SalaryConfig[]> {
    const p = new URLSearchParams();
    if (employeeId) p.set('employeeId', employeeId);
    if (month) p.set('month', month);
    if (search) p.set('search', search);
    const qs = p.toString();
    return apiFetch<SalaryConfig[]>(`/api/salary-config${qs ? `?${qs}` : ''}`);
  },

  // ─── Load editor (by employee + month) ─────────────────────────────────
  getByEmployeeAndMonth(employeeId: string, month: string): Promise<SalaryConfig | null> {
    const p = new URLSearchParams({ employeeId, month });
    return apiFetch<SalaryConfig | null>(`/api/salary-config/by-employee?${p.toString()}`);
  },

  // ─── Single ─────────────────────────────────────────────────────────────
  getOne(id: string): Promise<SalaryConfig> {
    return apiFetch<SalaryConfig>(`/api/salary-config/${encodeURIComponent(id)}`);
  },

  // ─── CRUD ───────────────────────────────────────────────────────────────
  create(payload: CreateSalaryConfigPayload): Promise<SalaryConfig> {
    return apiFetch<SalaryConfig>('/api/salary-config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateSalaryConfigPayload): Promise<SalaryConfig> {
    return apiFetch<SalaryConfig>(`/api/salary-config/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/salary-config/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // ─── Import helpers ─────────────────────────────────────────────────────
  importAllowances(employeeId: string, month: string): Promise<SalaryLineItem[]> {
    const p = new URLSearchParams({ employeeId, month });
    return apiFetch<SalaryLineItem[]>(`/api/salary-config/import-allowances?${p.toString()}`);
  },

  importDeductions(employeeId: string, month: string): Promise<SalaryLineItem[]> {
    const p = new URLSearchParams({ employeeId, month });
    return apiFetch<SalaryLineItem[]>(`/api/salary-config/import-deductions?${p.toString()}`);
  },
};

export const salaryIncreasesService = {
  getAll(employeeId?: string, search?: string, filterYear?: string, filterBranch?: string): Promise<SalaryIncrease[]> {
    const p = new URLSearchParams();
    if (employeeId) p.set('employeeId', employeeId);
    if (search) p.set('search', search);
    if (filterYear) p.set('year', filterYear);
    if (filterBranch) p.set('branch', filterBranch);
    const qs = p.toString();
    return apiFetch<SalaryIncrease[]>(`/api/salary-increases${qs ? `?${qs}` : ''}`);
  },

  getOne(id: string): Promise<SalaryIncrease> {
    return apiFetch<SalaryIncrease>(`/api/salary-increases/${encodeURIComponent(id)}`);
  },

  create(payload: CreateSalaryIncreasePayload): Promise<SalaryIncrease> {
    return apiFetch<SalaryIncrease>('/api/salary-increases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateSalaryIncreasePayload): Promise<SalaryIncrease> {
    return apiFetch<SalaryIncrease>(`/api/salary-increases/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/salary-increases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Apply a scheduled increase: sets status → 'applied' and writes increaseAmount to salary_config */
  apply(id: string): Promise<SalaryIncrease> {
    return apiFetch<SalaryIncrease>(`/api/salary-increases/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
    });
  },

  bulkSave(payload: {
    creates: CreateSalaryIncreasePayload[];
    updates: { id: string; data: UpdateSalaryIncreasePayload }[];
    deletes: string[];
  }): Promise<{ created: SalaryIncrease[]; updated: SalaryIncrease[]; deleted: string[]; errors?: string[] }> {
    return apiFetch('/api/salary-increases/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
