'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { backendAuthService } from '@/lib/services/backend-auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr_manager' | 'finance_manager' | 'supervisor' | 'employee';
  branch?: string;
  department?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate checking if user is already logged in (from localStorage/session)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In production, this would verify token with backend
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await backendAuthService.login({ email, password });

      const user: User = {
        id: response.id,
        email: response.email,
        name: response.fullName,
        role: (response.role as any) || 'employee',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.email}`
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await backendAuthService.signup({
        email,
        password,
        fullName: name
      });

      const user: User = {
        id: response.id,
        email: response.email,
        name: response.fullName,
        role: (response.role as any) || 'employee',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.email}`
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        signup
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
