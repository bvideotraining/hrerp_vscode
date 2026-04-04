'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Film, Music, Image as ImageIcon, Trash2, Loader2,
  RefreshCw, ExternalLink, AlertCircle, LayoutGrid,
} from 'lucide-react';
import { pixabayService } from '@/lib/services/pixabay.service';
import type { PixabayMediaType, PixabayFirebaseItem } from '@/types/pixabay';
import { formatFileSize } from '@/types/pixabay';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentlyUsedPixabayPanelProps {
  /** Called when the user clicks an item to re-use it */
  onSelect?: (item: PixabayFirebaseItem) => void;
  /** Optional filter to show only one media type */
  mediaType?: PixabayMediaType | 'all';
  /** Max items per page */
  perPage?: number;
  /** Show delete buttons */
  allowDelete?: boolean;
  className?: string;
}

const TABS: { id: PixabayMediaType | 'all'; label: string; Icon: any }[] = [
  { id: 'all', label: 'All', Icon: LayoutGrid },
  { id: 'image', label: 'Images', Icon: ImageIcon },
  { id: 'video', label: 'Videos', Icon: Film },
  { id: 'music', label: 'Music', Icon: Music },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecentlyUsedPixabayPanel({
  onSelect,
  mediaType: initialTab = 'all',
  perPage = 12,
  allowDelete = true,
  className = '',
}: RecentlyUsedPixabayPanelProps) {
  const [activeTab, setActiveTab] = useState<PixabayMediaType | 'all'>(initialTab);
  const [items, setItems] = useState<PixabayFirebaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async (tab: PixabayMediaType | 'all', pg: number) => {
    setLoading(true);
    setError('');
    try {
      const type = tab === 'all' ? undefined : tab;
      const res = await pixabayService.getSavedItems(type, pg, perPage);
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Failed to load saved items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [perPage]);

  useEffect(() => {
    load(activeTab, page);
  }, [activeTab, page, load]);

  const handleTabChange = (tab: PixabayMediaType | 'all') => {
    setActiveTab(tab);
    setPage(1);
    setConfirmDeleteId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    try {
      await pixabayService.deleteSavedItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      // silently ignore — item stays in list
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // ── Item card ─────────────────────────────────────────────────────────────

  const renderCard = (item: PixabayFirebaseItem) => {
    const isDeleting = deletingId === item.id;
    const isConfirming = confirmDeleteId === item.id;

    return (
      <div
        key={item.id}
        className={`group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all ${onSelect ? 'cursor-pointer' : ''} ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => !isConfirming && onSelect?.(item)}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-28 bg-slate-100 overflow-hidden">
          {item.mediaType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.firebaseUrl}
              alt={item.tags?.[0] || 'image'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : item.mediaType === 'video' ? (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <Film className="w-8 h-8 text-slate-300" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded capitalize">
            {item.mediaType}
          </div>

          {/* Compression badge */}
          {item.compressed && (
            <div className="absolute top-1.5 right-1.5 bg-green-500/90 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
              Compressed
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            {onSelect && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelect(item); }}
                className="bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
              >
                Use
              </button>
            )}
            <a
              href={item.firebaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors"
              title="Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Info row */}
        <div className="px-2.5 py-2">
          <p className="text-[10px] font-semibold text-slate-700 truncate">
            {item.mediaType === 'music' && item.tags?.[0] ? item.tags[0] : item.author || `Item ${item.id.slice(0, 6)}`}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-2">
              {item.compressed ? (
                <span className="text-[9px] text-green-600 font-medium">
                  {formatFileSize(item.compressedSize)}
                </span>
              ) : (
                <span className="text-[9px] text-slate-400">
                  {formatFileSize(item.originalSize)}
                </span>
              )}
              {item.usedInBlocks?.length > 0 && (
                <span className="text-[9px] text-blue-500">
                  Used ×{item.usedInBlocks.length}
                </span>
              )}
            </div>
            {item.tags?.length > 0 && (
              <span className="text-[9px] text-slate-400 truncate max-w-[60px]">{item.tags[0]}</span>
            )}
          </div>
        </div>

        {/* Delete button */}
        {allowDelete && (
          <div
            className="px-2.5 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isConfirming ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  className="flex-1 py-1 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-1 text-[10px] font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="w-full py-1 text-[10px] text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 rounded hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Saved from Pixabay</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {total > 0 ? `${total} item${total !== 1 ? 's' : ''} in Firebase Storage` : 'No items saved yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(activeTab, page)}
          disabled={loading}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar (only when showing all types or when initialTab is not fixed) */}
      {initialTab === 'all' && (
        <div className="flex border-b border-slate-100">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1 px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors -mb-px ${activeTab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: perPage > 6 ? 6 : perPage }).map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-100 animate-pulse h-40" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-xs text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => load(activeTab, page)}
              className="mt-2 text-xs text-slate-500 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              {activeTab === 'image' ? <ImageIcon className="w-5 h-5 text-slate-400" /> :
               activeTab === 'video' ? <Film className="w-5 h-5 text-slate-400" /> :
               activeTab === 'music' ? <Music className="w-5 h-5 text-slate-400" /> :
               <LayoutGrid className="w-5 h-5 text-slate-400" />}
            </div>
            <p className="text-xs font-medium text-slate-500">No saved {activeTab === 'all' ? 'items' : activeTab + 's'} yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Search Pixabay and save items to Firebase to see them here</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map(renderCard)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs text-slate-500 px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-[10px] text-slate-500">
            Page {page} of {totalPages} · {total} items
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-xs text-slate-500 px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
