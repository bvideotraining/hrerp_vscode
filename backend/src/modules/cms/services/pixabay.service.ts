import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  PixabaySearchParams,
  PixabayApiResponse,
  PixabaySearchResult,
  PixabayStatusResult,
  PixabayVideoApiResponse,
  PixabayMusicApiResponse,
} from '../dto/pixabay.dto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class PixabayService {
  private readonly logger = new Logger(PixabayService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly PIXABAY_PER_PAGE = 20;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ── Status ─────────────────────────────────────────────────────────

  getStatus(): PixabayStatusResult {
    const apiKey = this.configService.get<string>('PIXABAY_API_KEY');
    const enabled = this.configService.get<string>('ENABLE_PIXABAY_STORAGE') === 'true';
    return {
      available: !!apiKey,
      storageEnabled: enabled,
      hasApiKey: !!apiKey,
    };
  }

  validateApiKey(): boolean {
    return !!this.configService.get<string>('PIXABAY_API_KEY');
  }

  // ── Images ──────────────────────────────────────────────────────────

  async searchImages(params: PixabaySearchParams): Promise<PixabaySearchResult> {
    const cacheKey = `images:${JSON.stringify(params)}`;
    const cached = this.getFromCache<PixabaySearchResult>(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    const baseUrl = this.configService.get<string>('PIXABAY_API_URL', 'https://pixabay.com/api');

    const queryParams = new URLSearchParams({
      key: apiKey,
      q: params.query,
      page: String(params.page || 1),
      per_page: String(this.PIXABAY_PER_PAGE),
      safesearch: 'true',
      ...(params.imageType && { image_type: params.imageType }),
      ...(params.orientation && { orientation: params.orientation }),
      ...(params.category && { category: params.category }),
      ...(params.minWidth && { min_width: String(params.minWidth) }),
      ...(params.minHeight && { min_height: String(params.minHeight) }),
    });

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PixabayApiResponse>(`${baseUrl}/?${queryParams}`)
          .pipe(
            timeout(this.REQUEST_TIMEOUT_MS),
            catchError((err) => {
              throw this.mapError(err);
            }),
          ),
      );

      const result: PixabaySearchResult = {
        hits: response.data.hits,
        totalHits: response.data.totalHits,
        total: response.data.total,
        page: params.page || 1,
        perPage: this.PIXABAY_PER_PAGE,
        totalPages: Math.ceil(response.data.totalHits / this.PIXABAY_PER_PAGE),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      this.logger.error(`Pixabay image search failed: ${err?.message || err}`);
      throw err;
    }
  }

  // ── Videos ──────────────────────────────────────────────────────────

  async searchVideos(params: PixabaySearchParams): Promise<PixabaySearchResult> {
    const cacheKey = `videos:${JSON.stringify(params)}`;
    const cached = this.getFromCache<PixabaySearchResult>(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    const baseUrl = this.configService.get<string>('PIXABAY_API_URL', 'https://pixabay.com/api');

    const queryParams = new URLSearchParams({
      key: apiKey,
      q: params.query,
      page: String(params.page || 1),
      per_page: String(this.PIXABAY_PER_PAGE),
      safesearch: 'true',
      ...(params.videoType && { video_type: params.videoType }),
      ...(params.category && { category: params.category }),
    });

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PixabayVideoApiResponse>(`${baseUrl}/videos/?${queryParams}`)
          .pipe(
            timeout(this.REQUEST_TIMEOUT_MS),
            catchError((err) => {
              throw this.mapError(err);
            }),
          ),
      );

      const result: PixabaySearchResult = {
        hits: response.data.hits,
        totalHits: response.data.totalHits,
        total: response.data.total,
        page: params.page || 1,
        perPage: this.PIXABAY_PER_PAGE,
        totalPages: Math.ceil(response.data.totalHits / this.PIXABAY_PER_PAGE),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      this.logger.error(`Pixabay video search failed: ${err?.message || err}`);
      throw err;
    }
  }

  // ── Music ───────────────────────────────────────────────────────────

  async searchMusic(params: PixabaySearchParams): Promise<PixabaySearchResult> {
    const cacheKey = `music:${JSON.stringify(params)}`;
    const cached = this.getFromCache<PixabaySearchResult>(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey();
    const baseUrl = this.configService.get<string>('PIXABAY_API_URL', 'https://pixabay.com/api');

    const queryParams = new URLSearchParams({
      key: apiKey,
      q: params.query,
      page: String(params.page || 1),
      per_page: String(this.PIXABAY_PER_PAGE),
      ...(params.category && { category: params.category }),
      ...(params.genre && { genre: params.genre }),
    });

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PixabayMusicApiResponse>(`${baseUrl}/music/?${queryParams}`)
          .pipe(
            timeout(this.REQUEST_TIMEOUT_MS),
            catchError((err) => {
              throw this.mapError(err);
            }),
          ),
      );

      const result: PixabaySearchResult = {
        hits: response.data.hits,
        totalHits: response.data.totalHits,
        total: response.data.total,
        page: params.page || 1,
        perPage: this.PIXABAY_PER_PAGE,
        totalPages: Math.ceil(response.data.totalHits / this.PIXABAY_PER_PAGE),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      this.logger.error(`Pixabay music search failed: ${err?.message || err}`);
      throw err;
    }
  }

  // ── Cache helpers ───────────────────────────────────────────────────

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ── Error mapper ────────────────────────────────────────────────────

  private getApiKey(): string {
    const key = this.configService.get<string>('PIXABAY_API_KEY');
    if (!key) throw { code: 'INVALID_API_KEY', message: 'Pixabay API key is not configured', status: 403 };
    return key;
  }

  private mapError(err: any): any {
    const status = err?.response?.status || err?.status;
    if (status === 429) return { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.', status: 429 };
    if (status === 403) return { code: 'INVALID_API_KEY', message: 'Invalid Pixabay API key.', status: 403 };
    if (status === 503 || status === 504) return { code: 'SERVICE_UNAVAILABLE', message: 'Pixabay service is temporarily unavailable.', status: 503 };
    if (err?.name === 'TimeoutError') return { code: 'TIMEOUT', message: 'Request to Pixabay timed out. Please retry.', status: 504 };
    return { code: 'SEARCH_FAILED', message: err?.message || 'Search failed', status: 500 };
  }
}
