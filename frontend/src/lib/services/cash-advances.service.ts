import type {
  CashAdvance,
  CreateCashAdvancePayload,
  UpdateCashAdvancePayload,
  DecideCashAdvancePayload,
} from '@/types/cash-advances';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const cashAdvancesService = {
  // ── List ──────────────────────────────────────────────────────────────
  getAll(employeeId?: string, status?: string): Promise<CashAdvance[]> {
    const p = new URLSearchParams();
    if (employeeId) p.set('employeeId', employeeId);
    if (status) p.set('status', status);
    const qs = p.toString();
    return apiFetch<CashAdvance[]>(`/api/cash-advances${qs ? `?${qs}` : ''}`);
  },

  // ── Single ────────────────────────────────────────────────────────────
  getOne(id: string): Promise<CashAdvance> {
    return apiFetch<CashAdvance>(`/api/cash-advances/${encodeURIComponent(id)}`);
  },

  // ── Create ────────────────────────────────────────────────────────────
  create(payload: CreateCashAdvancePayload): Promise<CashAdvance> {
    return apiFetch<CashAdvance>('/api/cash-advances', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Update ────────────────────────────────────────────────────────────
  update(id: string, payload: UpdateCashAdvancePayload): Promise<CashAdvance> {
    return apiFetch<CashAdvance>(`/api/cash-advances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // ── Decide (approve / reject) ─────────────────────────────────────────
  decide(id: string, payload: DecideCashAdvancePayload): Promise<CashAdvance> {
    return apiFetch<CashAdvance>(`/api/cash-advances/${encodeURIComponent(id)}/decide`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Delete ────────────────────────────────────────────────────────────
  remove(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/cash-advances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
