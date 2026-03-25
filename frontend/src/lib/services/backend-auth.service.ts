/**
 * Backend API Service for authenticating with NestJS API
 * JWT is stored in an HTTP-only cookie set by the server — never in localStorage.
 * All requests use the direct backend URL with credentials: 'include' for cross-origin cookies.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleName?: string;
  roleId?: string;
  accessType?: 'full' | 'custom';
  permissions?: { moduleId: string; moduleName: string; actions: string[] }[];
  scopeType?: string[];
  employeeId?: string;
  employeeCode?: string;
  branch?: string;
  department?: string;
}

class BackendAuthService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Login failed');
    }
    return response.json();
  }

  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Signup failed');
    }
    return response.json();
  }

  async resetPassword(payload: { email: string; newPassword: string }): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Password reset failed');
    }
    return response.json();
  }

  async getMe(): Promise<AuthResponse | null> {
    const response = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
    if (!response.ok) return null;
    return response.json();
  }

  async logout(): Promise<void> {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  }
}

export const backendAuthService = new BackendAuthService();
