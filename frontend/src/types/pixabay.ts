// ── Enums & Literals ────────────────────────────────────────────────────────

export type PixabayMediaType = 'image' | 'video' | 'music';
export type PixabayImageType = 'all' | 'photo' | 'illustration' | 'vector';
export type PixabayOrientation = 'all' | 'horizontal' | 'vertical';
export type PixabayVideoType = 'all' | 'film' | 'animation' | 'sprite' | 'stillframe';
export type CompressionLevel = 'high' | 'balanced' | 'compressed';

// ── Search Params ────────────────────────────────────────────────────────────

export interface PixabaySearchParams {
  query: string;
  page?: number;
  mediaType?: PixabayMediaType;
  imageType?: PixabayImageType;
  orientation?: PixabayOrientation;
  videoType?: PixabayVideoType;
  category?: string;
  genre?: string;
  minWidth?: number;
  minHeight?: number;
}

// ── Raw API Hit Types ────────────────────────────────────────────────────────

export interface PixabayImageHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabayVideoVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
}

export interface PixabayVideoHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  picture_id: string;
  videos: {
    large: PixabayVideoVariant;
    medium: PixabayVideoVariant;
    small: PixabayVideoVariant;
    tiny: PixabayVideoVariant;
  };
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabayMusicHit {
  id: number;
  pageURL: string;
  tags: string;
  duration: number;
  previewURL: string;
  audio: string;
  title: string;
  level: string;
  contributors: string[];
  albums: string[];
  views: number;
  downloads: number;
  likes: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

// Union of all hit types
export type PixabayHit = PixabayImageHit | PixabayVideoHit | PixabayMusicHit;

// ── Search Response (from backend proxy) ────────────────────────────────────

export interface PixabaySearchResponse<T extends PixabayHit = PixabayHit> {
  hits: T[];
  totalHits: number;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ── Status ───────────────────────────────────────────────────────────────────

export interface PixabayStatus {
  available: boolean;
  storageEnabled: boolean;
  hasApiKey: boolean;
}

// ── Save Item Request ─────────────────────────────────────────────────────────

export interface SavePixabayItemRequest {
  sourceUrl: string;
  mediaType: PixabayMediaType;
  shouldCompress?: boolean;
  compressionLevel?: CompressionLevel;
  metadata?: {
    sourceId?: string;
    author?: string;
    authorUrl?: string;
    downloads?: number;
    likes?: number;
    tags?: string[];
  };
}

// ── Firebase Saved Item ───────────────────────────────────────────────────────

export interface PixabayFirebaseItem {
  id: string;
  sourceId: string;
  sourceUrl: string;
  firebaseUrl: string;
  storagePath: string;
  mediaType: PixabayMediaType;
  author: string;
  authorUrl: string;
  downloads: number;
  likes: number;
  tags: string[];
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionLevel: string;
  usedInBlocks: string[];
  createdAt: string;
}

// ── Saved Items List Response ─────────────────────────────────────────────────

export interface PixabayFirebaseItemsResponse {
  items: PixabayFirebaseItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Helper: Get best URL from a hit ──────────────────────────────────────────

export function getPixabayImageUrl(hit: PixabayImageHit): string {
  return hit.largeImageURL || hit.webformatURL || hit.previewURL;
}

export function getPixabayPreviewUrl(hit: PixabayImageHit): string {
  return hit.webformatURL || hit.previewURL;
}

export function getPixabayVideoUrl(hit: PixabayVideoHit): string {
  return (
    hit.videos?.large?.url ||
    hit.videos?.medium?.url ||
    hit.videos?.small?.url ||
    hit.videos?.tiny?.url ||
    ''
  );
}

export function getPixabayVideoThumbnail(hit: PixabayVideoHit): string {
  return (
    hit.videos?.large?.thumbnail ||
    hit.videos?.medium?.thumbnail ||
    hit.videos?.small?.thumbnail ||
    ''
  );
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
