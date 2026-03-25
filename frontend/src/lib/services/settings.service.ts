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

export interface SystemUser {
  id?: string;
  name: string;
  email: string;
  password?: string;
  roleId: string;
  roleName?: string;
  employeeId?: string;
  branchId?: string;
  departmentId?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface RolePermission {
  moduleId: string;
  moduleName: string;
  actions: ('read' | 'create' | 'edit' | 'delete')[];
}

export interface Role {
  id?: string;
  name: string;
  description?: string;
  accessType: 'full' | 'custom';
  permissions?: RolePermission[];
  scopeBranches?: string[];
  scopeDepartments?: string[];
  scopeType?: ('own' | 'same_branch' | 'same_department' | 'specific_job_titles')[];
  scopeJobTitles?: string[];
  isBuiltIn?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface OfficialVacation {
  name: string;
  date: string;
}

export interface SystemConfig {
  defaultCurrency: string;
  workingDaysPerWeek: number;
  weeklyHolidays: string[];
  officialVacations: OfficialVacation[];
}

export interface NotificationRule {
  moduleId: string;
  moduleName: string;
  events: ('create' | 'update' | 'delete')[];
  roleIds: string[];
}

export interface NotificationConfig {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  rules: NotificationRule[];
}

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  moduleId?: string;
  event?: string;
  isRead: boolean;
  createdAt?: any;
}

// ─── Settings Service ─────────────────────────────────────────────────────────

class SettingsService {
  // System Users
  getUsers(): Promise<SystemUser[]> { return apiFetch('/api/settings/users'); }
  createUser(dto: Omit<SystemUser, 'id'>): Promise<SystemUser> {
    return apiFetch('/api/settings/users', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateUser(id: string, dto: Partial<SystemUser>): Promise<SystemUser> {
    return apiFetch(`/api/settings/users/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  }
  deleteUser(id: string): Promise<{ deleted: boolean }> {
    return apiFetch(`/api/settings/users/${id}`, { method: 'DELETE' });
  }

  // Roles
  getRoles(): Promise<Role[]> { return apiFetch('/api/settings/roles'); }
  createRole(dto: Omit<Role, 'id'>): Promise<Role> {
    return apiFetch('/api/settings/roles', { method: 'POST', body: JSON.stringify(dto) });
  }
  updateRole(id: string, dto: Omit<Role, 'id'>): Promise<Role> {
    return apiFetch(`/api/settings/roles/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  }
  deleteRole(id: string): Promise<{ deleted: boolean }> {
    return apiFetch(`/api/settings/roles/${id}`, { method: 'DELETE' });
  }

  // System Config
  getConfig(): Promise<SystemConfig> { return apiFetch('/api/settings/config'); }
  updateConfig(dto: SystemConfig): Promise<SystemConfig> {
    return apiFetch('/api/settings/config', { method: 'PUT', body: JSON.stringify(dto) });
  }

  // Backup & Restore
  generateBackup(): Promise<any> { return apiFetch('/api/settings/backup'); }
  restoreBackup(data: any): Promise<{ restored: number }> {
    return apiFetch('/api/settings/restore', { method: 'POST', body: JSON.stringify(data) });
  }

  // Notification Config
  getNotificationConfig(): Promise<NotificationConfig> {
    return apiFetch('/api/settings/notifications/config');
  }
  updateNotificationConfig(dto: NotificationConfig): Promise<NotificationConfig> {
    return apiFetch('/api/settings/notifications/config', { method: 'PUT', body: JSON.stringify(dto) });
  }

  // User Notifications (bell)
  getUserNotifications(userId: string): Promise<AppNotification[]> {
    return apiFetch(`/api/settings/notifications/user/${userId}`);
  }
  markNotificationRead(id: string): Promise<{ updated: boolean }> {
    return apiFetch(`/api/settings/notifications/${id}/read`, { method: 'PUT' });
  }
  markAllNotificationsRead(userId: string): Promise<{ updated: number }> {
    return apiFetch(`/api/settings/notifications/user/${userId}/read-all`, { method: 'PUT' });
  }

  // System Reset
  resetSystem(resetPassword: string, confirmPhrase: string): Promise<{ deleted: number; reset: boolean }> {
    return apiFetch('/api/settings/reset', {
      method: 'POST',
      body: JSON.stringify({ resetPassword, confirmPhrase }),
    });
  }
}

export const settingsService = new SettingsService();
