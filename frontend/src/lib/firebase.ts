// Firebase initialization and services
'use client';

import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig, { DEMO_FIREBASE_CONFIG } from '@/config/firebase.config';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let isInitialized = false;

/**
 * Fetch Firebase client config from the API at runtime
 */
async function fetchFirebaseConfigFromApi() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/developer/firebase-client-config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('Failed to fetch Firebase config from API:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data && data.apiKey) {
      console.log('✓ Firebase config fetched from API');
      return {
        apiKey: data.apiKey || '',
        authDomain: data.authDomain || '',
        projectId: data.projectId || '',
        storageBucket: data.storageBucket || '',
        messagingSenderId: data.messagingSenderId || '',
        appId: data.appId || '',
      };
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch Firebase config from API:', error);
    return null;
  }
}

/**
 * Initialize Firebase with config from API or environment
 */
async function initializeFirebase() {
  if (isInitialized) {
    return;
  }

  try {
    // First, try to fetch config from API
    let config = await fetchFirebaseConfigFromApi();

    // Fall back to environment config or demo config
    if (!config) {
      config = firebaseConfig.apiKey ? firebaseConfig : DEMO_FIREBASE_CONFIG;
    }

    try {
      app = getApp();
    } catch {
      app = initializeApp(config);
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
      storage = getStorage(app);
      isInitialized = true;
      console.log('✓ Firebase initialized');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback for development without Firebase
  }
}

// Initialize Firebase immediately on module load
initializeFirebase().catch((error) => {
  console.error('Failed to initialize Firebase:', error);
});

export { app, db, auth, storage, initializeFirebase };
export default (app || null) as FirebaseApp | null;
