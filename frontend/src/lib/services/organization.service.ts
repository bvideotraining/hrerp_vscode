'use client';

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Branding {
  appName: string;
  logoUrl?: string;
}

export interface Branch {
  id?: string;
  code: string;
  name: string;
}

export interface Department {
  id?: string;
  code: string;
  name: string;
  type: 'operation' | 'non-operation';
}

export interface JobTitle {
  id?: string;
  code: string;
  name: string;
  department: string;
  category: string;
}

export interface MonthRange {
  id?: string;
  monthName: string;
  startDate: string;
  endDate: string;
}

export interface DeductionEntry {
  upToMinutes: number;
  days: number;
}

export interface AttendanceRule {
  id?: string;
  category: string;
  workStart?: string;
  workEnd: string;
  freeMinutes: number;
  isFlexible: boolean;
  deductionSchedule?: DeductionEntry[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

class OrganizationService {
  // Branding
  getBranding(): Promise<Branding> {
    return apiFetch<Branding>('/api/organization/branding');
  }
  updateBranding(data: Branding): Promise<Branding> {
    return apiFetch<Branding>('/api/organization/branding', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Branches
  getBranches(): Promise<Branch[]> {
    return apiFetch<Branch[]>('/api/organization/branches');
  }
  createBranch(data: Omit<Branch, 'id'>): Promise<Branch> {
    return apiFetch<Branch>('/api/organization/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  updateBranch(id: string, data: Omit<Branch, 'id'>): Promise<Branch> {
    return apiFetch<Branch>(`/api/organization/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  deleteBranch(id: string): Promise<void> {
    return apiFetch<void>(`/api/organization/branches/${id}`, { method: 'DELETE' });
  }

  // Departments
  getDepartments(): Promise<Department[]> {
    return apiFetch<Department[]>('/api/organization/departments');
  }
  createDepartment(data: Omit<Department, 'id'>): Promise<Department> {
    return apiFetch<Department>('/api/organization/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  updateDepartment(id: string, data: Omit<Department, 'id'>): Promise<Department> {
    return apiFetch<Department>(`/api/organization/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  deleteDepartment(id: string): Promise<void> {
    return apiFetch<void>(`/api/organization/departments/${id}`, { method: 'DELETE' });
  }

  // Job Titles
  getJobTitles(): Promise<JobTitle[]> {
    return apiFetch<JobTitle[]>('/api/organization/job-titles');
  }
  createJobTitle(data: Omit<JobTitle, 'id'>): Promise<JobTitle> {
    return apiFetch<JobTitle>('/api/organization/job-titles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  updateJobTitle(id: string, data: Omit<JobTitle, 'id'>): Promise<JobTitle> {
    return apiFetch<JobTitle>(`/api/organization/job-titles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  deleteJobTitle(id: string): Promise<void> {
    return apiFetch<void>(`/api/organization/job-titles/${id}`, { method: 'DELETE' });
  }

  // Month Ranges
  getMonthRanges(): Promise<MonthRange[]> {
    return apiFetch<MonthRange[]>('/api/organization/month-ranges');
  }
  createMonthRange(data: Omit<MonthRange, 'id'>): Promise<MonthRange> {
    return apiFetch<MonthRange>('/api/organization/month-ranges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  updateMonthRange(id: string, data: Omit<MonthRange, 'id'>): Promise<MonthRange> {
    return apiFetch<MonthRange>(`/api/organization/month-ranges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  deleteMonthRange(id: string): Promise<void> {
    return apiFetch<void>(`/api/organization/month-ranges/${id}`, { method: 'DELETE' });
  }

  // Attendance Rules
  getAttendanceRules(): Promise<AttendanceRule[]> {
    return apiFetch<AttendanceRule[]>('/api/organization/attendance-rules');
  }
  updateAttendanceRule(category: string, data: Partial<AttendanceRule>): Promise<AttendanceRule> {
    return apiFetch<AttendanceRule>(`/api/organization/attendance-rules/${category}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const organizationService = new OrganizationService();
