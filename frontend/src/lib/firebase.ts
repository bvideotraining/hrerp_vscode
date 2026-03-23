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

try {
  // Use environment config if available, otherwise use demo config
  const config = firebaseConfig.apiKey ? firebaseConfig : DEMO_FIREBASE_CONFIG;
  
  try {
    app = getApp();
  } catch {
    app = initializeApp(config);
  }

  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Fallback for development without Firebase
}

export { app, db, auth, storage };
export default app as FirebaseApp;
