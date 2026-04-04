import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import * as bcryptjs from 'bcryptjs';
import { DeveloperOwner, DeveloperOwnerResponse, PlatformResource, PlatformResourceResponse, PLATFORM_RESOURCES_SEED } from './developer.types';
import { AuthSetupDto, AuthVerifyDto, CreateOwnerDto, UpdateResourceDto } from './dto/index';

@Injectable()
export class DeveloperService {
  private readonly OWNERS_COLLECTION = 'developer_owners';
  private readonly RESOURCES_COLLECTION = 'platform_resources';

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Initialize platform_resources collection with pre-seeded values.
   * Uses an upsert approach: adds missing keys, never overwrites existing stored values.
   */
  async initializePlatformResources(): Promise<void> {
    const db = this.firebaseService.getFirestore();

    for (const resource of PLATFORM_RESOURCES_SEED) {
      const docRef = db.collection(this.RESOURCES_COLLECTION).doc(resource.key);
      const doc = await docRef.get();

      if (!doc.exists) {
        // New key — seed it with default values
        await docRef.set({
          ...resource,
          updatedAt: new Date(),
        });
      }
    }
    console.log('✓ Platform resources initialized/updated');
  }

  /**
   * Remove legacy VITE_ prefixed keys that were used in the old seed format.
   * Safe to call repeatedly — only deletes docs that no longer belong.
   */
  async cleanupLegacyKeys(): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const validKeys = new Set(PLATFORM_RESOURCES_SEED.map((r) => r.key));
    const snap = await db.collection(this.RESOURCES_COLLECTION).get();

    const toDelete = snap.docs.filter((doc) => !validKeys.has(doc.id));
    if (toDelete.length === 0) return;

    const batch = db.batch();
    toDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✓ Removed ${toDelete.length} legacy resource key(s)`);
  }

  /**
   * GET /developer/auth/status
   */
  async getAuthStatus(): Promise<{ hasOwners: boolean }> {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.OWNERS_COLLECTION).limit(1).get();
    return { hasOwners: !snap.empty };
  }

  /**
   * POST /developer/auth/setup
   * Create the first owner — only works when no owners exist
   */
  async setupFirstOwner(dto: AuthSetupDto): Promise<{ success: boolean; message: string }> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const db = this.firebaseService.getFirestore();
    const existing = await db.collection(this.OWNERS_COLLECTION).limit(1).get();

    if (!existing.empty) {
      throw new BadRequestException('Owners already exist. Use /verify to authenticate.');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(dto.password, saltRounds);

    // Create first owner
    const ownerRef = db.collection(this.OWNERS_COLLECTION).doc();
    await ownerRef.set({
      id: ownerRef.id,
      name: dto.name,
      passwordHash,
      createdAt: new Date(),
    });

    return { success: true, message: 'First owner created successfully' };
  }

  /**
   * POST /developer/auth/verify
   * Verify owner credentials
   */
  async verifyOwner(dto: AuthVerifyDto): Promise<{ ok: boolean }> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.OWNERS_COLLECTION)
      .where('name', '==', dto.name)
      .limit(1)
      .get();

    if (snap.empty) {
      return { ok: false };
    }

    const owner = snap.docs[0].data() as DeveloperOwner;
    const isMatch = await bcryptjs.compare(dto.password, owner.passwordHash);

    return { ok: isMatch };
  }

  /**
   * GET /developer/owners
   * List all owners (names only, no hashes)
   */
  async listOwners(): Promise<DeveloperOwnerResponse[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.OWNERS_COLLECTION).get();
    return snap.docs.map((doc) => {
      const owner = doc.data() as DeveloperOwner;
      return {
        id: owner.id,
        name: owner.name,
        createdAt: owner.createdAt,
      };
    });
  }

  /**
   * POST /developer/owners
   * Add a new owner
   */
  async addOwner(dto: CreateOwnerDto): Promise<DeveloperOwnerResponse> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    const db = this.firebaseService.getFirestore();

    // Check for duplicate name
    const existing = await db
      .collection(this.OWNERS_COLLECTION)
      .where('name', '==', dto.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictException(`Owner with name "${dto.name}" already exists`);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(dto.password, saltRounds);

    // Create owner
    const ownerRef = db.collection(this.OWNERS_COLLECTION).doc();
    const createdAt = new Date();
    await ownerRef.set({
      id: ownerRef.id,
      name: dto.name,
      passwordHash,
      createdAt,
    });

    return {
      id: ownerRef.id,
      name: dto.name,
      createdAt,
    };
  }

  /**
   * DELETE /developer/owners/:id
   * Remove an owner — reject if only one owner remains
   */
  async removeOwner(id: string): Promise<{ success: boolean; message: string }> {
    const db = this.firebaseService.getFirestore();

    // Check owner count
    const snap = await db.collection(this.OWNERS_COLLECTION).get();
    if (snap.size <= 1) {
      throw new BadRequestException('Cannot remove the last owner');
    }

    // Delete owner
    await db.collection(this.OWNERS_COLLECTION).doc(id).delete();

    return { success: true, message: 'Owner removed successfully' };
  }

  /**
   * GET /developer/resources
   * Return all platform resources with current env values as reference.
   * Results are ordered by the canonical seed order.
   */
  async getResources(): Promise<PlatformResourceResponse[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.RESOURCES_COLLECTION).get();

    const docMap = new Map<string, PlatformResource>(
      snap.docs.map((doc) => [doc.id, doc.data() as PlatformResource]),
    );

    // Return in canonical seed order
    const ordered: PlatformResourceResponse[] = [];
    for (const seed of PLATFORM_RESOURCES_SEED) {
      const resource = docMap.get(seed.key);
      if (resource) {
        // Normalize Firestore Timestamp → ISO string so JSON serialization is valid
        const rawUpdatedAt = resource.updatedAt as unknown;
        const updatedAt: string =
          rawUpdatedAt instanceof Date
            ? rawUpdatedAt.toISOString()
            : rawUpdatedAt != null &&
              typeof (rawUpdatedAt as { toDate?: () => Date }).toDate === 'function'
            ? (rawUpdatedAt as { toDate: () => Date }).toDate().toISOString()
            : typeof rawUpdatedAt === 'string'
            ? rawUpdatedAt
            : '';
        ordered.push({
          ...resource,
          updatedAt,
          envValue: process.env[seed.key] || undefined,
        });
      }
    }
    return ordered;
  }

  /**
   * PUT /developer/resources/:key
   * Update a resource value
   */
  async updateResource(key: string, dto: UpdateResourceDto): Promise<PlatformResource> {
    if (!dto.value || dto.value.trim() === '') {
      throw new BadRequestException('Resource value cannot be empty');
    }

    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.RESOURCES_COLLECTION).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Resource with key "${key}" not found`);
    }

    const updated = {
      ...doc.data(),
      value: dto.value,
      updatedAt: new Date(),
    } as PlatformResource;

    await docRef.set(updated);
    return updated;
  }

  /**
   * GET /developer/firebase-client-config
   * PUBLIC endpoint — return only Firebase client config from platform_resources.
   * Keyed by NEXT_PUBLIC_FIREBASE_* names, returned as Firebase config object.
   */
  async getFirebaseClientConfig(): Promise<Record<string, string>> {
    const db = this.firebaseService.getFirestore();

    const clientKeyMap: Record<string, string> = {
      'NEXT_PUBLIC_FIREBASE_API_KEY':            'apiKey',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN':        'authDomain',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID':         'projectId',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET':     'storageBucket',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': 'messagingSenderId',
      'NEXT_PUBLIC_FIREBASE_APP_ID':             'appId',
    };

    const config: Record<string, string> = {};

    for (const [dbKey, configField] of Object.entries(clientKeyMap)) {
      const doc = await db.collection(this.RESOURCES_COLLECTION).doc(dbKey).get();
      if (doc.exists) {
        const resource = doc.data() as PlatformResource;
        if (resource.value && resource.value.trim() !== '') {
          config[configField] = resource.value;
        }
      }
    }

    return config;
  }

  /**
   * POST /developer/restart
   * Graceful server restart
   */
  async restartServer(): Promise<{ success: boolean; message: string }> {
    // Give a brief moment for the response to be sent before exiting
    setTimeout(() => {
      console.log('🔄 Server restart triggered by developer module');
      process.exit(0);
    }, 500);

    return { success: true, message: 'Server restarting...' };
  }
}
