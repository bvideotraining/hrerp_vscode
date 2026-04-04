'use client';

import type {
  PixabaySearchParams,
  PixabaySearchResponse,
  PixabayImageHit,
  PixabayVideoHit,
  PixabayMusicHit,
  PixabayStatus,
  SavePixabayItemRequest,
  PixabayFirebaseItem,
  PixabayFirebaseItemsResponse,
  PixabayMediaType,
} from '@/types/pixabay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// ── Internal fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(body.message || `API error ${response.status}`);
    error.code = body.code || 'REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  return body;
}

// ── Types for API wrapper responses ──────────────────────────────────────────

interface ApiSuccess<T> {
  success: true;
  data: T;
}

// ── Pixabay Service ───────────────────────────────────────────────────────────

export const pixabayService = {

  // ── Status ────────────────────────────────────────────────────────────────

  async getStatus(): Promise<PixabayStatus> {
    const res = await apiFetch<ApiSuccess<PixabayStatus>>('/api/cms/pixabay/status');
    return res.data;
  },

  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch {
      return false;
    }
  },

  // ── Images ────────────────────────────────────────────────────────────────

  async searchImages(
    query: string,
    page = 1,
    filters?: Partial<Pick<PixabaySearchParams, 'imageType' | 'orientation' | 'category' | 'minWidth' | 'minHeight'>>,
  ): Promise<PixabaySearchResponse<PixabayImageHit>> {
    const res = await apiFetch<ApiSuccess<PixabaySearchResponse<PixabayImageHit>>>(
      '/api/cms/pixabay/search',
      {
        method: 'POST',
        body: JSON.stringify({ query, page, mediaType: 'image', filters }),
      },
    );
    return res.data;
  },

  // ── Videos ────────────────────────────────────────────────────────────────

  async searchVideos(
    query: string,
    page = 1,
    filters?: Partial<Pick<PixabaySearchParams, 'videoType' | 'category'>>,
  ): Promise<PixabaySearchResponse<PixabayVideoHit>> {
    const res = await apiFetch<ApiSuccess<PixabaySearchResponse<PixabayVideoHit>>>(
      '/api/cms/pixabay/search',
      {
        method: 'POST',
        body: JSON.stringify({ query, page, mediaType: 'video', filters }),
      },
    );
    return res.data;
  },

  // ── Music ─────────────────────────────────────────────────────────────────

  async searchMusic(
    query: string,
    page = 1,
    filters?: Partial<Pick<PixabaySearchParams, 'category' | 'genre'>>,
  ): Promise<PixabaySearchResponse<PixabayMusicHit>> {
    const res = await apiFetch<ApiSuccess<PixabaySearchResponse<PixabayMusicHit>>>(
      '/api/cms/pixabay/search',
      {
        method: 'POST',
        body: JSON.stringify({ query, page, mediaType: 'music', filters }),
      },
    );
    return res.data;
  },

  // ── Generic search (resolves to correct type based on mediaType) ───────────

  async search(
    query: string,
    page = 1,
    mediaType: PixabayMediaType = 'image',
    filters?: Partial<PixabaySearchParams>,
  ): Promise<PixabaySearchResponse> {
    const res = await apiFetch<ApiSuccess<PixabaySearchResponse>>(
      '/api/cms/pixabay/search',
      {
        method: 'POST',
        body: JSON.stringify({ query, page, mediaType, filters }),
      },
    );
    return res.data;
  },

  // ── Firebase Storage ──────────────────────────────────────────────────────

  async saveItem(request: SavePixabayItemRequest): Promise<PixabayFirebaseItem> {
    const res = await apiFetch<ApiSuccess<PixabayFirebaseItem>>(
      '/api/cms/pixabay/save-item',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );
    return res.data;
  },

  async getSavedItems(
    mediaType?: PixabayMediaType,
    page = 1,
    perPage = 20,
  ): Promise<PixabayFirebaseItemsResponse> {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (mediaType) params.set('type', mediaType);
    const res = await apiFetch<ApiSuccess<PixabayFirebaseItemsResponse>>(
      `/api/cms/pixabay/saved-items?${params}`,
    );
    return res.data;
  },

  async deleteSavedItem(id: string): Promise<void> {
    await apiFetch(`/api/cms/pixabay/saved-items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
