import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import * as crypto from 'crypto';
import { FirebaseService } from '@config/firebase/firebase.service';
import { PixabayCompressionService, CompressionLevel } from './pixabay-compression.service';
import { SavePixabayItemDto, PixabayFirebaseItem } from '../dto/pixabay.dto';

@Injectable()
export class FirebasePixabayStorageService {
  private readonly logger = new Logger(FirebasePixabayStorageService.name);
  private readonly COLLECTION = 'cms_pixabay_items';
  private readonly DOWNLOAD_TIMEOUT_MS = 60000;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly httpService: HttpService,
    private readonly compressionService: PixabayCompressionService,
    private readonly configService: ConfigService,
  ) {}

  // ── Save a Pixabay item to Firebase Storage ─────────────────────────

  async savePixabayItem(dto: SavePixabayItemDto): Promise<PixabayFirebaseItem> {
    const { sourceUrl, mediaType, shouldCompress, compressionLevel = 'balanced', metadata } = dto;

    // Check duplicate first
    const existing = await this.getItemBySourceUrl(sourceUrl);
    if (existing) {
      this.logger.log(`Duplicate detected — returning cached item for ${sourceUrl}`);
      return existing;
    }

    // Download from Pixabay CDN
    this.logger.log(`Downloading ${mediaType} from Pixabay: ${sourceUrl}`);
    const downloadedBuffer = await this.downloadItem(sourceUrl);
    const originalSize = downloadedBuffer.length;

    // Compress if requested
    let finalBuffer = downloadedBuffer;
    let mimeType = this.compressionService.detectMimeType(sourceUrl);
    let extension = mimeType.split('/')[1] || 'bin';
    let compressed = false;
    let compressedSize = originalSize;

    if (shouldCompress) {
      const level: CompressionLevel = compressionLevel as CompressionLevel;
      let result: Awaited<ReturnType<PixabayCompressionService['compressImage']>>;

      if (mediaType === 'image') {
        result = await this.compressionService.compressImage(downloadedBuffer, level);
      } else if (mediaType === 'video') {
        result = await this.compressionService.compressVideo(downloadedBuffer, level);
      } else {
        result = await this.compressionService.compressAudio(downloadedBuffer, level);
      }

      finalBuffer = result.buffer;
      mimeType = result.mimeType;
      extension = result.extension;
      compressed = result.compressed;
      compressedSize = result.compressedSize;
    }

    // Build Firebase Storage path
    const folder = this.configService.get<string>('FIREBASE_STORAGE_PIXABAY_FOLDER', 'pixabay');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const itemId = crypto.randomUUID();
    const storagePath = `${folder}/${mediaType}s/${year}/${month}/${itemId}.${extension}`;

    // Upload to Firebase Storage
    const firebaseUrl = await this.firebaseService.uploadToStorage(finalBuffer, mimeType, storagePath);

    // Save metadata to Firestore
    const firestoreItem: Omit<PixabayFirebaseItem, 'id'> = {
      sourceId: metadata?.sourceId || '',
      sourceUrl,
      firebaseUrl,
      storagePath,
      mediaType,
      author: metadata?.author || '',
      authorUrl: metadata?.authorUrl || '',
      downloads: metadata?.downloads || 0,
      likes: metadata?.likes || 0,
      tags: metadata?.tags || [],
      compressed,
      originalSize,
      compressedSize,
      compressionLevel: shouldCompress ? compressionLevel : 'high',
      usedInBlocks: [],
      createdAt: new Date().toISOString(),
    };

    const db = this.firebaseService.getFirestore();
    const ref = await db.collection(this.COLLECTION).add(firestoreItem);

    this.logger.log(`Saved Pixabay ${mediaType} to Firebase: ${firebaseUrl}`);
    return { id: ref.id, ...firestoreItem };
  }

  // ── Get saved items (paginated) ─────────────────────────────────────

  async getSavedItems(
    mediaType?: string,
    page: number = 1,
    perPage: number = 20,
  ): Promise<{ items: PixabayFirebaseItem[]; total: number; page: number; totalPages: number }> {
    const db = this.firebaseService.getFirestore();
    const isFiltered = mediaType && ['image', 'video', 'music'].includes(mediaType);

    // When filtering by mediaType, avoid combining where() + orderBy() on different
    // fields — that requires a composite Firestore index which may not exist.
    // Instead, fetch filtered docs without orderBy, then sort in memory.
    let query: FirebaseFirestore.Query = db.collection(this.COLLECTION);

    if (isFiltered) {
      query = query.where('mediaType', '==', mediaType);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    const allSnap = await query.get();
    let allDocs = allSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PixabayFirebaseItem));

    // Sort in-memory when we couldn't use orderBy
    if (isFiltered) {
      allDocs.sort((a, b) => {
        const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any)?.toMillis?.() ?? 0;
        const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any)?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    }

    const total = allDocs.length;
    const offset = (page - 1) * perPage;
    const items = allDocs.slice(offset, offset + perPage);

    return { items, total, page, totalPages: Math.ceil(total / perPage) || 1 };
  }

  // ── Delete a saved item ─────────────────────────────────────────────

  async deleteSavedItem(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) return;

    const data = doc.data() as PixabayFirebaseItem;
    this.logger.log(`Deleting Pixabay item ${id} from Firebase Storage`);
    await db.collection(this.COLLECTION).doc(id).delete();
    this.logger.log(`Deleted Pixabay item metadata for ${id}`);
  }

  // ── Track block usage ───────────────────────────────────────────────

  async markUsedInBlock(itemId: string, blockId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(itemId).get();
    if (!doc.exists) return;

    const data = doc.data() as PixabayFirebaseItem;
    const usedInBlocks = data.usedInBlocks || [];
    if (!usedInBlocks.includes(blockId)) {
      await db.collection(this.COLLECTION).doc(itemId).update({
        usedInBlocks: [...usedInBlocks, blockId],
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async downloadItem(url: string): Promise<Buffer> {
    const response = await firstValueFrom(
      this.httpService
        .get(url, { responseType: 'arraybuffer' })
        .pipe(timeout(this.DOWNLOAD_TIMEOUT_MS)),
    );
    return Buffer.from(response.data);
  }

  private async getItemBySourceUrl(sourceUrl: string): Promise<PixabayFirebaseItem | null> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.COLLECTION)
      .where('sourceUrl', '==', sourceUrl)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as PixabayFirebaseItem;
  }
}
