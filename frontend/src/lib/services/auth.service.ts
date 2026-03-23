// Firestore-based Auth Service
'use client';

import {
  auth,
} from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';

class FirebaseAuthService {
  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string): Promise<UserCredential> {
    try {
      return await createUserWithEmailAndPassword(auth as any, email, password);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async login(email: string, password: string): Promise<UserCredential> {
    try {
      return await signInWithEmailAndPassword(auth as any, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    try {
      return await signOut(auth as any);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return (auth as any)?.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth as any, callback);
  }

  /**
   * Get user ID token
   */
  async getUserIdToken(): Promise<string> {
    const user = (auth as any)?.currentUser;
    if (!user) throw new Error('No authenticated user');
    return await user.getIdToken();
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
