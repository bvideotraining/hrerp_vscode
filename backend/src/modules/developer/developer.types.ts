/**
 * Developer Module Types
 */

export interface DeveloperOwner {
  id: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface DeveloperOwnerResponse {
  id: string;
  name: string;
  createdAt: Date;
}

export interface PlatformResource {
  key: string;
  value: string;
  label: string;
  category: 'Firebase Client' | 'Firebase Admin' | 'Application';
  isSecret: boolean;
  description: string;
  updatedAt: Date | string;
}

export interface PlatformResourceResponse extends Omit<PlatformResource, 'updatedAt'> {
  updatedAt: string; // Always serialized as ISO string in responses
  envValue?: string; // Current process.env value for reference
}

export const PLATFORM_RESOURCES_SEED: Omit<PlatformResource, 'updatedAt'>[] = [
  // ── Firebase Client (frontend config) ──────────────────────────
  {
    key: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    value: '',
    label: 'API Key',
    category: 'Firebase Client',
    isSecret: true,
    description: 'Firebase API Key for client-side authentication (env: NEXT_PUBLIC_FIREBASE_API_KEY)',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    value: '',
    label: 'Auth Domain',
    category: 'Firebase Client',
    isSecret: false,
    description: 'Firebase Auth domain (env: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    value: '',
    label: 'Project ID',
    category: 'Firebase Client',
    isSecret: false,
    description: 'Firebase Project ID (env: NEXT_PUBLIC_FIREBASE_PROJECT_ID)',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    value: '',
    label: 'Storage Bucket',
    category: 'Firebase Client',
    isSecret: false,
    description: 'Firebase Storage bucket (env: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    value: '',
    label: 'Messaging Sender ID',
    category: 'Firebase Client',
    isSecret: false,
    description: 'Firebase Cloud Messaging Sender ID (env: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    value: '',
    label: 'App ID',
    category: 'Firebase Client',
    isSecret: false,
    description: 'Firebase App ID (env: NEXT_PUBLIC_FIREBASE_APP_ID)',
  },
  // ── Firebase Admin (server-side) ──────────────────────────────
  {
    key: 'FIREBASE_PROJECT_ID',
    value: '',
    label: 'Project ID',
    category: 'Firebase Admin',
    isSecret: false,
    description: 'Firebase Admin Project ID (env: FIREBASE_PROJECT_ID)',
  },
  {
    key: 'FIREBASE_CLIENT_EMAIL',
    value: '',
    label: 'Client Email',
    category: 'Firebase Admin',
    isSecret: true,
    description: 'Firebase Admin SDK client email (env: FIREBASE_CLIENT_EMAIL)',
  },
  {
    key: 'FIREBASE_PRIVATE_KEY',
    value: '',
    label: 'Private Key',
    category: 'Firebase Admin',
    isSecret: true,
    description: 'Firebase Admin SDK private key (env: FIREBASE_PRIVATE_KEY)',
  },
  {
    key: 'FIREBASE_STORAGE_BUCKET',
    value: '',
    label: 'Storage Bucket',
    category: 'Firebase Admin',
    isSecret: false,
    description: 'Firebase Storage bucket for admin SDK (env: FIREBASE_STORAGE_BUCKET)',
  },
  // ── Application ───────────────────────────────────────────────
  {
    key: 'JWT_SECRET',
    value: '',
    label: 'JWT Secret',
    category: 'Application',
    isSecret: true,
    description: 'Secret key for JWT token signing (env: JWT_SECRET)',
  },
];
