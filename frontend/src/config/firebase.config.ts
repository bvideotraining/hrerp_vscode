// Firebase configuration and initialization
// This file should be kept private and not committed to version control

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// For development/demo purposes only - replace with your actual Firebase config
export const DEMO_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDemoKeyOnlyForDevelopment123456789',
  authDomain: 'hr-erp-demo.firebaseapp.com',
  projectId: 'hr-erp-demo-project',
  storageBucket: 'hr-erp-demo.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
  measurementId: 'G-DEMOKEY123456',
};

export default firebaseConfig;
