const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

export type LeaveType =
  | 'annual' | 'casual' | 'sick' | 'death' | 'maternity'
  | 'unpaid' | 'emergency' | 'paternity' | 'other';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeBranch?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  rejectedReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateLeavePayload {
  employeeId: string;
  employeeName: string;
  employeeBranch?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual:    'Annual Leave',
  casual:    'Casual Leave',
  sick:      'Sick Leave',
  death:     'Death Leave',
  maternity: 'Maternity Leave',
  unpaid:    'Unpaid Leave',
  emergency: 'Emergency Leave',
  paternity: 'Paternity Leave',
  other:     'Other',
};

// ─── Leave Balance ─────────────────────────────────────────────────────────────

export interface LeaveBalanceEntry {
  allocated: number;
  used: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName?: string;
  year: number;
  annual:    LeaveBalanceEntry;
  casual:    LeaveBalanceEntry;
  sick:      LeaveBalanceEntry;
  death:     LeaveBalanceEntry;
  maternity: LeaveBalanceEntry;
  unpaid:    { used: number };
  initialized?: boolean;
}

export interface SetBalancePayload {
  employeeName?: string;
  year?: number;
  annual?: number;
  casual?: number;
  sick?: number;
  death?: number;
  maternity?: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const leavesService = {
  getAll(employeeId?: string, status?: string): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (status)     params.set('status', status);
    const qs = params.toString();
    return apiFetch(`/api/leaves${qs ? `?${qs}` : ''}`);
  },

  create(payload: CreateLeavePayload): Promise<LeaveRequest> {
    return apiFetch('/api/leaves', { method: 'POST', body: JSON.stringify(payload) });
  },

  update(
    id: string,
    dto: Partial<{
      status: LeaveStatus;
      rejectedReason: string;
      approvedBy: string;
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      totalDays: number;
      reason: string;
    }>,
  ): Promise<LeaveRequest> {
    return apiFetch(`/api/leaves/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  },

  remove(id: string): Promise<{ deleted: boolean }> {
    return apiFetch(`/api/leaves/${id}`, { method: 'DELETE' });
  },
};

export const leaveBalanceService = {
  getAll(year?: number): Promise<LeaveBalance[]> {
    const qs = year ? `?year=${year}` : '';
    return apiFetch(`/api/leave-balances${qs}`);
  },

  getOne(employeeId: string, year?: number): Promise<LeaveBalance | null> {
    const qs = year ? `?year=${year}` : '';
    return apiFetch(`/api/leave-balances/${encodeURIComponent(employeeId)}${qs}`);
  },

  set(employeeId: string, payload: SetBalancePayload): Promise<LeaveBalance> {
    return apiFetch(`/api/leave-balances/${encodeURIComponent(employeeId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  initialize(employeeId: string, employeeName?: string, year?: number): Promise<LeaveBalance> {
    return apiFetch(`/api/leave-balances/init/${encodeURIComponent(employeeId)}`, {
      method: 'POST',
      body: JSON.stringify({ employeeName, year }),
    });
  },
};
