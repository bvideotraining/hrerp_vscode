import type {
  MedicalInsuranceRecord,
  CreateMedicalInsurancePayload,
  UpdateMedicalInsurancePayload,
} from '@/types/medical-insurance';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const medicalInsuranceService = {
  getAll(employeeId?: string, search?: string): Promise<MedicalInsuranceRecord[]> {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (search) params.set('search', search);
    const qs = params.toString();
    return apiFetch<MedicalInsuranceRecord[]>(
      `/api/medical-insurance${qs ? `?${qs}` : ''}`,
    );
  },

  getOne(id: string): Promise<MedicalInsuranceRecord> {
    return apiFetch<MedicalInsuranceRecord>(
      `/api/medical-insurance/${encodeURIComponent(id)}`,
    );
  },

  create(payload: CreateMedicalInsurancePayload): Promise<MedicalInsuranceRecord> {
    return apiFetch<MedicalInsuranceRecord>('/api/medical-insurance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(
    id: string,
    payload: UpdateMedicalInsurancePayload,
  ): Promise<MedicalInsuranceRecord> {
    return apiFetch<MedicalInsuranceRecord>(
      `/api/medical-insurance/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
  },

  remove(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(
      `/api/medical-insurance/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },
};

export type { MedicalInsuranceRecord, CreateMedicalInsurancePayload, UpdateMedicalInsurancePayload };
