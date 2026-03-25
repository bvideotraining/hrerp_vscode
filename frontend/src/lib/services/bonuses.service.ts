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
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export interface BonusRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branch: string;
  category: string;
  monthId: string;
  monthName: string;
  saturday: number;
  duty: number;
  potty: number;
  afterSchool: number;
  transportation: number;
  extraBonus: number;
  total: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBonusPayload {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branch: string;
  category: string;
  monthId: string;
  monthName: string;
  saturday?: number;
  duty?: number;
  potty?: number;
  afterSchool?: number;
  transportation?: number;
  extraBonus?: number;
  notes?: string;
}

export interface SyncSaturdaysPayload {
  monthId: string;
  startDate: string;
  endDate: string;
}

export interface SyncSaturdaysResult {
  synced: number;
  message: string;
}

export const bonusesService = {
  getAll(monthId?: string, branch?: string, category?: string): Promise<BonusRecord[]> {
    const params = new URLSearchParams();
    if (monthId) params.set('monthId', monthId);
    if (branch) params.set('branch', branch);
    if (category) params.set('category', category);
    const qs = params.toString();
    return apiFetch<BonusRecord[]>(`/api/bonuses${qs ? `?${qs}` : ''}`);
  },

  create(payload: CreateBonusPayload): Promise<BonusRecord> {
    return apiFetch<BonusRecord>('/api/bonuses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<CreateBonusPayload>): Promise<BonusRecord> {
    return apiFetch<BonusRecord>(`/api/bonuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/bonuses/${id}`, { method: 'DELETE' });
  },

  syncSaturdays(payload: SyncSaturdaysPayload): Promise<SyncSaturdaysResult> {
    return apiFetch<SyncSaturdaysResult>('/api/bonuses/sync-saturdays', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
