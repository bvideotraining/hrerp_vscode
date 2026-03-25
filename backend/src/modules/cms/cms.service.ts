import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateCmsPageDto, UpdateCmsPageDto, MenuConfigDto } from './dto/cms-page.dto';

@Injectable()
export class CmsService {
  private readonly COLLECTION = 'cms_pages';
  private readonly CONFIG_COLLECTION = 'cms_config';
  private readonly MENU_CONFIG_DOC = 'menu';

  constructor(private firebaseService: FirebaseService) {}

  // ═══ PAGES ════════════════════════════════════════════════════════════════

  async getPages() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.COLLECTION).get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0));
  }

  async getPublishedPages() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.COLLECTION).get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((p: any) => p.isPublished === true)
      .sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0));
  }

  async getPublishedMenuPages() {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection(this.COLLECTION).get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((p: any) => p.isPublished === true && p.showInMenu === true)
      .sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0))
      .map((p: any) => ({ id: p.id, title: p.title, slug: p.slug, menuOrder: p.menuOrder }));
  }

  async getPageById(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Page not found');
    return { id: doc.id, ...doc.data() };
  }

  async getPageBySlug(slug: string) {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.COLLECTION)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty) throw new NotFoundException('Page not found');
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async createPage(dto: CreateCmsPageDto) {
    const db = this.firebaseService.getFirestore();

    // Check for duplicate slug
    const existing = await db
      .collection(this.COLLECTION)
      .where('slug', '==', dto.slug)
      .limit(1)
      .get();
    if (!existing.empty) throw new ConflictException(`Page with slug '${dto.slug}' already exists`);

    // Deep-serialize to plain object: class-transformer creates class instances
    // that Firestore Admin SDK rejects (custom prototypes not supported)
    const plain = JSON.parse(JSON.stringify(dto));
    const ref = db.collection(this.COLLECTION).doc();
    const data = {
      ...plain,
      blocks: plain.blocks || [],
      isPublished: plain.isPublished ?? false,
      showInMenu: plain.showInMenu ?? true,
      menuOrder: plain.menuOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ref.set(data);
    return { id: ref.id, ...data };
  }

  async updatePage(id: string, dto: UpdateCmsPageDto) {
    const db = this.firebaseService.getFirestore();

    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Page not found');

    // Check slug conflict if slug is being changed
    if (dto.slug) {
      const existing = await db
        .collection(this.COLLECTION)
        .where('slug', '==', dto.slug)
        .limit(1)
        .get();
      if (!existing.empty && existing.docs[0].id !== id) {
        throw new ConflictException(`Page with slug '${dto.slug}' already exists`);
      }
    }

    // Deep-serialize to plain object before Firestore write
    const plain = JSON.parse(JSON.stringify(dto));
    const data = { ...plain, updatedAt: new Date() };
    await db.collection(this.COLLECTION).doc(id).update(data);
    return { id, ...doc.data(), ...data };
  }

  async deletePage(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Page not found');
    await db.collection(this.COLLECTION).doc(id).delete();
    return { deleted: true };
  }

  // ═══ IMAGE UPLOAD ═════════════════════════════════════════════════════════

  async uploadImage(buffer: Buffer, mimeType: string, originalName: string) {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
    const { v4: uuidv4 } = await import('uuid');
    const storagePath = `cms/images/${uuidv4()}.${ext}`;
    const url = await this.firebaseService.uploadToStorage(buffer, mimeType, storagePath);
    return { url };
  }

  // ═══ MENU CONFIG ══════════════════════════════════════════════════════════

  async getMenuConfig() {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.CONFIG_COLLECTION).doc(this.MENU_CONFIG_DOC).get();
    if (!doc.exists) return this.getDefaultMenuConfig();
    return doc.data();
  }

  async updateMenuConfig(dto: MenuConfigDto) {
    const db = this.firebaseService.getFirestore();
    // Deep-serialize to plain object: class-transformer creates class instances
    // with custom prototypes (e.g. SocialLinkDto) that Firestore Admin SDK rejects
    const plain = JSON.parse(JSON.stringify(dto));
    const data = { ...plain, updatedAt: new Date() };
    await db.collection(this.CONFIG_COLLECTION).doc(this.MENU_CONFIG_DOC).set(data, { merge: true });
    return data;
  }

  // ═══ FORM SUBMISSIONS ══════════════════════════════════════════════════════

  async submitForm(payload: {
    pageSlug: string;
    blockId: string;
    firestoreCollection: string;
    fields: Record<string, any>;
  }) {
    // Validate collection name: only alphanumeric, underscores, hyphens allowed
    if (!payload.firestoreCollection || !/^[a-zA-Z0-9_-]{1,50}$/.test(payload.firestoreCollection)) {
      throw new BadRequestException('Invalid destination collection name');
    }
    // Sanitize field values — ensure they are plain primitive types
    const safeFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload.fields || {})) {
      if (typeof key !== 'string' || key.length > 100) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        safeFields[key] = value;
      }
    }
    const db = this.firebaseService.getFirestore();
    const ref = db.collection(payload.firestoreCollection).doc();
    const data = {
      submittedAt: new Date(),
      pageSlug: payload.pageSlug || '',
      blockId: payload.blockId || '',
      ...safeFields,
    };
    await ref.set(data);
    return { id: ref.id, success: true };
  }

  private getDefaultMenuConfig() {
    return {
      backgroundColor: '#ffffff',
      backgroundStyle: 'solid',
      gradientFrom: '#1e293b',
      gradientTo: '#334155',
      menuItemColor: '#475569',
      menuItemHoverColor: '#1e293b',
      logoUrl: '',
      logoText: 'HR ERP',
      logoPosition: 'left',
      socialLinks: [],
      showSocialIcons: false,
      showSignInButton: true,
      signInButtonText: 'Sign In',
      signInButtonUrl: '/login',
      signInButtonColor: '#2563eb',
      signInButtonTextColor: '#ffffff',
      borderStyle: 'solid',
      sticky: true,
    };
  }
}
