import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ── Search Params ──────────────────────────────────────────────────────────

export class PixabaySearchParams {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'photo', 'illustration', 'vector'])
  imageType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'horizontal', 'vertical'])
  orientation?: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'film', 'animation', 'sprite', 'stillframe'])
  videoType?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minWidth?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minHeight?: number;
}

// ── Pixabay API Raw Types ──────────────────────────────────────────────────

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
  collections: number;
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

export interface PixabayApiResponse {
  total: number;
  totalHits: number;
  hits: PixabayImageHit[];
}

export interface PixabayVideoApiResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideoHit[];
}

export interface PixabayMusicApiResponse {
  total: number;
  totalHits: number;
  hits: PixabayMusicHit[];
}

// ── Search Result (normalized) ─────────────────────────────────────────────

export interface PixabaySearchResult {
  hits: PixabayImageHit[] | PixabayVideoHit[] | PixabayMusicHit[];
  totalHits: number;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ── Status ─────────────────────────────────────────────────────────────────

export interface PixabayStatusResult {
  available: boolean;
  storageEnabled: boolean;
  hasApiKey: boolean;
}

// ── Save Item DTO ───────────────────────────────────────────────────────────

export class SavePixabayItemDto {
  @IsString()
  sourceUrl: string;

  @IsString()
  @IsIn(['image', 'video', 'music'])
  mediaType: 'image' | 'video' | 'music';

  @IsOptional()
  @IsBoolean()
  shouldCompress?: boolean = false;

  @IsOptional()
  @IsString()
  @IsIn(['high', 'balanced', 'compressed'])
  compressionLevel?: string = 'balanced';

  @IsOptional()
  metadata?: {
    sourceId?: string;
    author?: string;
    authorUrl?: string;
    downloads?: number;
    likes?: number;
    tags?: string[];
  };
}

// ── Firebase Saved Item ─────────────────────────────────────────────────────

export interface PixabayFirebaseItem {
  id: string;
  sourceId: string;
  sourceUrl: string;
  firebaseUrl: string;
  storagePath: string;
  mediaType: 'image' | 'video' | 'music';
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
