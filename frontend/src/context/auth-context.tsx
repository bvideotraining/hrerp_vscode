'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { backendAuthService } from '@/lib/services/backend-auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr_manager' | 'finance_manager' | 'supervisor' | 'employee' | 'approver' | 'branch_approver';
  /** Human-readable role label from the roles collection e.g. "Application Admin" */
  roleName?: string;
  roleId?: string;
  /** 'full' = all modules; 'custom' = check permissions array */
  accessType?: 'full' | 'custom';
  permissions?: { moduleId: string; moduleName: string; actions: string[] }[];
  /** Which employee record this user corresponds to */
  employeeId?: string;
  /** Alphanumeric code for the employee (e.g. EMP001) */
  employeeCode?: string;
  /** Data scope from the role (e.g. ['own']) */
  scopeType?: string[];
  branch?: string;
  department?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Returns true if the user can read the given moduleId */
  canAccess: (moduleId: string) => boolean;
  /** Returns true if the user can perform the given action on the module */
  canDo: (moduleId: string, action: 'read' | 'create' | 'edit' | 'delete') => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify JWT and fetch fresh profile from database
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await backendAuthService.getMe();
        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.fullName,
            role: (profile.role as any) || 'employee',
            roleName: profile.roleName || '',
            roleId: profile.roleId,
            accessType: profile.accessType,
            permissions: profile.permissions || [],
            employeeId: profile.employeeId || '',
            employeeCode: profile.employeeCode || '',
            scopeType: profile.scopeType || [],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`,
          });
        } else {
          // Cookie missing or invalid — clear any stale data
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
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

      console.log('[Auth] Login response — accessType:', response.accessType, '| permissions:', response.permissions?.length ?? 0, '| employeeId:', response.employeeId, '| employeeCode:', response.employeeCode, '| scopeType:', response.scopeType);

      const user: User = {
        id: response.id,
        email: response.email,
        name: response.fullName,
        role: (response.role as any) || 'employee',
        roleName: response.roleName || '',
        roleId: response.roleId,
        accessType: response.accessType,
        permissions: response.permissions || [],
        employeeId: response.employeeId || '',
        employeeCode: response.employeeCode || '',
        scopeType: response.scopeType || [],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.email}`
      };

      setUser(user);
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
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await backendAuthService.logout(); // clears HTTP-only cookie on server
  };

  /**
   * Returns true if the current user has at least read access to the given module.
   * Admins and users with accessType='full' always return true.
   * 'dashboard' is always accessible to authenticated users.
   */
  const canAccess = (moduleId: string): boolean => {
    if (!user) return false;
    if (moduleId === 'dashboard') return true;
    if (user.role === 'admin') return true;
    if (user.accessType === 'full') return true;
    // 'custom' — must have at least 'read' in permissions
    const result = (user.permissions || []).some(
      (p) => p.moduleId === moduleId && p.actions.includes('read')
    );
    if (!result) {
      console.log(`[canAccess] BLOCKED "${moduleId}" — accessType=${user.accessType}, permissions=`, user.permissions?.map(p => p.moduleId));
    }
    return result;
  };

  /**
   * Returns true if the current user can perform a specific action on a module.
   */
  const canDo = (moduleId: string, action: 'read' | 'create' | 'edit' | 'delete'): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.accessType === 'full') return true;
    return (user.permissions || []).some(
      (p) => p.moduleId === moduleId && p.actions.includes(action)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        canAccess,
        canDo,
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
