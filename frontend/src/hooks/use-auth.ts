// Custom React hook for Firebase Authentication
'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '@/lib/services/auth.service';
import { auditLoggingService } from '@/lib/services/audit-logging.service';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Log login
      if (currentUser) {
        auditLoggingService.logLogin(currentUser.uid).catch((err) => {
          console.error('Failed to log login:', err);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await firebaseAuthService.login(email, password);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signup = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await firebaseAuthService.signup(email, password);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signup failed';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        await auditLoggingService.logLogout(user.uid);
      }
      await firebaseAuthService.logout();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: !!user,
  };
}
