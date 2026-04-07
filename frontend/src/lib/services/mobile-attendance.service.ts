const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface MobileAttendanceRecord {
  id?: string;
  employeeId: string;
  branchId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  checkInLat?: number;
  checkInLon?: number;
  checkOutLat?: number;
  checkOutLon?: number;
  checkInDistance?: number;
  checkOutDistance?: number;
  status?: string;
  source?: string;
}

export interface MobileDevice {
  id: string;
  deviceId: string;
  employeeId: string;
  deviceModel?: string;
  osVersion?: string;
  fcmToken?: string;
  isActive: boolean;
  registeredAt?: any;
  revokedAt?: any;
}

export interface MobileMember {
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  branch: string;
  department: string;
  jobTitle: string;
  deviceModel: string;
  osVersion: string;
  registeredAt: any;
  isActive: boolean;
}

async function get(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const mobileAttendanceService = {
  getRecords: (date?: string): Promise<MobileAttendanceRecord[]> =>
    get(`/api/mobile-attendance/admin/records${date ? `?date=${date}` : ''}`),

  getDevices: (): Promise<MobileDevice[]> =>
    get('/api/mobile-attendance/admin/devices'),

  revokeDevice: (deviceId: string): Promise<{ success: boolean }> =>
    del(`/api/mobile-attendance/admin/devices/${deviceId}`),

  updateRecord: (id: string, data: Partial<MobileAttendanceRecord>): Promise<MobileAttendanceRecord> =>
    patch(`/api/mobile-attendance/admin/records/${id}`, data),

  deleteRecord: (id: string): Promise<{ success: boolean }> =>
    del(`/api/mobile-attendance/admin/records/${id}`),

  getMembers: (): Promise<MobileMember[]> =>
    get('/api/mobile-attendance/admin/members'),
};
