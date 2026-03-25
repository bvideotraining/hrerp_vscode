import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';
import { Auth } from 'firebase-admin/auth';
import { Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore!: Firestore;
  private auth!: Auth;
  private bucket!: Bucket;

  onModuleInit() {
    try {
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        const serviceAccount = this.getServiceAccountFromEnv();

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }

      this.firestore = admin.firestore();
      this.firestore.settings({ ignoreUndefinedProperties: true });
      this.auth = admin.auth();
      this.bucket = admin.storage().bucket();

      console.log('✓ Firebase Admin SDK initialized');
      console.log('✓ Firebase Storage bucket:', this.bucket.name);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  private getServiceAccountFromEnv() {
    return {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: 'key-id',
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: 'client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  getAuth(): Auth {
    return this.auth;
  }

  async verifyIdToken(token: string) {
    return this.auth.verifyIdToken(token);
  }

  /**
   * Upload a file buffer to Firebase Storage at a specific path.
   * Uses Firebase download tokens — no public ACL needed, URL never expires.
   */
  async uploadToStorage(
    buffer: Buffer,
    mimeType: string,
    storagePath: string,
  ): Promise<string> {
    const downloadToken = uuidv4();
    const file = this.bucket.file(storagePath);
    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        contentType: mimeType,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });
    // Build the authenticated Firebase Storage URL using the download token.
    // This does NOT require the object to be publicly accessible.
    const encodedPath = encodeURIComponent(storagePath);
    return `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
  }

  /**
   * Upload a document file for an employee.
   */
  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    employeeId: string,
    originalName: string,
  ): Promise<string> {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
    const storagePath = `employees/${employeeId}/documents/${uuidv4()}${ext ? '.' + ext : ''}`;
    return this.uploadToStorage(buffer, mimeType, storagePath);
  }
}
