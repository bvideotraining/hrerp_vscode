/**
 * Backend API Service for authenticating with NestJS API
 * Handles login/signup with JWT token management
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
  accessToken: string;
  tokenType: string;
}

class BackendAuthService {
  /**
   * Login with backend API
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store JWT token in localStorage
    if (data.accessToken) {
      localStorage.setItem('jwtToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      }));
    }

    return data;
  }

  /**
   * Signup with backend API
   */
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();

    // Store JWT token
    if (data.accessToken) {
      localStorage.setItem('jwtToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      }));
    }

    return data;
  }

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('jwtToken');
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): any {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Logout and clear token
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Get authorization header with JWT token
   */
  getAuthHeader(): {Authorization: string} | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, clear storage
      this.logout();
      window.location.href = '/login';
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }
}

export const backendAuthService = new BackendAuthService();
