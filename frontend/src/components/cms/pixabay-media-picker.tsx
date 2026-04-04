'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Search, ChevronLeft, ChevronRight, Download, Heart,
  Image as ImageIcon, Film, Music, Loader2, AlertCircle,
  RotateCcw, ExternalLink, Save, Check, Filter,
} from 'lucide-react';
import { pixabayService } from '@/lib/services/pixabay.service';
import type {
  PixabayMediaType,
  PixabayImageHit,
  PixabayVideoHit,
  PixabayMusicHit,
  PixabayHit,
  PixabaySearchResponse,
  PixabayFirebaseItem,
  CompressionLevel,
} from '@/types/pixabay';
import {
  getPixabayImageUrl,
  getPixabayPreviewUrl,
  getPixabayVideoUrl,
  getPixabayVideoThumbnail,
  formatFileSize,
  formatDuration,
} from '@/types/pixabay';

// ── Constants ─────────────────────────────────────────────────────────────────

const IMAGE_CATEGORIES = ['', 'backgrounds', 'fashion', 'nature', 'science', 'education', 'feelings', 'health', 'people', 'religion', 'places', 'animals', 'industry', 'computer', 'food', 'sports', 'transportation', 'travel', 'buildings', 'business', 'music'];
const VIDEO_CATEGORIES = ['', 'film', 'animation', 'nature', 'people', 'sports', 'travel', 'buildings', 'business', 'technology'];
const MUSIC_CATEGORIES = ['', 'classical', 'electronic', 'jazz', 'pop', 'rock', 'ambient', 'country', 'hip-hop', 'r&b'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PixabayMediaPickerProps {
  onSelect: (url: string, mediaType: PixabayMediaType, hit: PixabayHit) => void;
  onClose: () => void;
  defaultTab?: PixabayMediaType;
  title?: string;
}

type SearchState = 'idle' | 'loading' | 'success' | 'error';

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { id: PixabayMediaType; label: string; Icon: any }[] = [
  { id: 'image', label: 'Images', Icon: ImageIcon },
  { id: 'video', label: 'Videos', Icon: Film },
  { id: 'music', label: 'Music', Icon: Music },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PixabayMediaPicker({
  onSelect,
  onClose,
  defaultTab = 'image',
  title = 'Search Pixabay',
}: PixabayMediaPickerProps) {
  const [activeTab, setActiveTab] = useState<PixabayMediaType>(defaultTab);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [results, setResults] = useState<PixabaySearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedHit, setSelectedHit] = useState<PixabayHit | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentItems, setRecentItems] = useState<PixabayFirebaseItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Save-to-Firebase state
  const [saveToFirebase, setSaveToFirebase] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filters
  const [imageType, setImageType] = useState('all');
  const [orientation, setOrientation] = useState('all');
  const [videoType, setVideoType] = useState('all');
  const [category, setCategory] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ESC key to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  // Auto-focus search input
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Reset when tab changes
  const handleTabChange = (tab: PixabayMediaType) => {
    setActiveTab(tab);
    setResults(null);
    setPage(1);
    setSelectedHit(null);
    setErrorMsg('');
    setCategory('');
  };

  // Load recently saved items
  const loadRecentItems = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await pixabayService.getSavedItems(activeTab, 1, 12);
      setRecentItems(res.items);
    } catch {
      setRecentItems([]);
    } finally {
      setRecentLoading(false);
    }
  }, [activeTab]);

  const toggleRecent = () => {
    if (!showRecent) loadRecentItems();
    setShowRecent((v) => !v);
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const doSearch = useCallback(async (q: string, p: number, tab: PixabayMediaType) => {
    if (!q.trim()) { setErrorMsg('Please enter a search term'); return; }
    setSearchState('loading');
    setErrorMsg('');
    setSelectedHit(null);
    gridRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const filters: any = {};
      if (tab === 'image') { filters.imageType = imageType !== 'all' ? imageType : undefined; filters.orientation = orientation !== 'all' ? orientation : undefined; }
      if (tab === 'video') { filters.videoType = videoType !== 'all' ? videoType : undefined; }
      if (category) filters.category = category;

      const res = await pixabayService.search(q.trim(), p, tab, filters);
      setResults(res);
      setSearchState('success');
    } catch (err: any) {
      setSearchState('error');
      const code = err?.code || '';
      const status = err?.status || 0;
      if (code === 'RATE_LIMITED') setErrorMsg('Too many requests. Please try again in a minute.');
      else if (code === 'INVALID_API_KEY') setErrorMsg('Pixabay API key is not configured correctly.');
      else if (code === 'SERVICE_UNAVAILABLE') setErrorMsg('Pixabay service is temporarily unavailable.');
      else if (code === 'TIMEOUT') setErrorMsg('Request timed out. Please retry.');
      else if (status === 401) setErrorMsg('Session expired — please refresh the page and log in again.');
      else if (status === 403) setErrorMsg('You do not have permission to search Pixabay.');
      else if (status === 404) setErrorMsg('Search service not found. The backend may need to be restarted.');
      else setErrorMsg(err?.message || 'Search failed. Please try again.');
    }
  }, [imageType, orientation, videoType, category]);

  const handleSearch = () => {
    setPage(1);
    doSearch(query, 1, activeTab);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(query, newPage, activeTab);
  };

  // ── Select + optional Firebase save ──────────────────────────────────────

  const handleSelect = async (hit: PixabayHit) => {
    let url = '';
    if (activeTab === 'image') url = getPixabayImageUrl(hit as PixabayImageHit);
    else if (activeTab === 'video') url = getPixabayVideoUrl(hit as PixabayVideoHit);
    else url = (hit as PixabayMusicHit).audio || (hit as PixabayMusicHit).previewURL;

    if (saveToFirebase) {
      setSaving(true);
      try {
        const saved = await pixabayService.saveItem({
          sourceUrl: url,
          mediaType: activeTab,
          shouldCompress: compressionLevel !== 'high',
          compressionLevel,
          metadata: {
            sourceId: String(hit.id),
            author: hit.user,
            authorUrl: hit.userImageURL,
            downloads: hit.downloads,
            likes: hit.likes,
            tags: hit.tags.split(',').map((t: string) => t.trim()),
          },
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        onSelect(saved.firebaseUrl, activeTab, hit);
      } catch {
        // Fallback to CDN URL even if Firebase save fails
        onSelect(url, activeTab, hit);
      } finally {
        setSaving(false);
      }
    } else {
      onSelect(url, activeTab, hit);
    }
  };

  const handleRecentSelect = (item: PixabayFirebaseItem) => {
    onSelect(item.firebaseUrl, item.mediaType, {} as PixabayHit);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderImageGrid = (hits: PixabayImageHit[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {hits.map((hit) => (
        <div
          key={hit.id}
          className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedHit?.id === hit.id ? 'border-orange-500 ring-2 ring-orange-300' : 'border-transparent hover:border-slate-300'}`}
          onClick={() => setSelectedHit(hit)}
          onDoubleClick={() => handleSelect(hit)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPixabayPreviewUrl(hit)}
            alt={hit.tags}
            className="w-full h-28 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100">
            <p className="text-white text-[10px] font-medium truncate">{hit.user}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Download className="w-2.5 h-2.5 text-white" /><span className="text-white text-[9px]">{hit.downloads.toLocaleString()}</span>
              <Heart className="w-2.5 h-2.5 text-white ml-1" /><span className="text-white text-[9px]">{hit.likes.toLocaleString()}</span>
            </div>
          </div>
          {selectedHit?.id === hit.id && (
            <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderVideoGrid = (hits: PixabayVideoHit[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {hits.map((hit) => (
        <div
          key={hit.id}
          className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedHit?.id === hit.id ? 'border-orange-500 ring-2 ring-orange-300' : 'border-transparent hover:border-slate-300'}`}
          onClick={() => setSelectedHit(hit)}
          onDoubleClick={() => handleSelect(hit)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPixabayVideoThumbnail(hit)}
            alt={hit.tags}
            className="w-full h-32 object-cover"
            loading="lazy"
          />
          {/* Duration badge */}
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
            {formatDuration(hit.duration)}
          </div>
          {/* Resolution badge */}
          {hit.videos?.large?.width && (
            <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
              {hit.videos.large.width >= 3840 ? '4K' : hit.videos.large.width >= 1920 ? 'FHD' : 'HD'}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100">
            <p className="text-white text-[10px] font-medium truncate">{hit.user}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Download className="w-2.5 h-2.5 text-white" /><span className="text-white text-[9px]">{hit.downloads.toLocaleString()}</span>
              <Heart className="w-2.5 h-2.5 text-white ml-1" /><span className="text-white text-[9px]">{hit.likes.toLocaleString()}</span>
            </div>
          </div>
          {selectedHit?.id === hit.id && (
            <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderMusicGrid = (hits: PixabayMusicHit[]) => (
    <div className="space-y-2">
      {hits.map((hit) => (
        <div
          key={hit.id}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${selectedHit?.id === hit.id ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
          onClick={() => setSelectedHit(hit)}
          onDoubleClick={() => handleSelect(hit)}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedHit?.id === hit.id ? 'bg-orange-500' : 'bg-slate-200'}`}>
            <Music className={`w-5 h-5 ${selectedHit?.id === hit.id ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{hit.title || hit.tags || `Track ${hit.id}`}</p>
            <p className="text-xs text-slate-500">{hit.user} · {formatDuration(hit.duration)}</p>
            {hit.tags && <p className="text-[10px] text-slate-400 truncate mt-0.5">{hit.tags}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-slate-400">
              <Download className="w-3 h-3" /><span className="text-[10px]">{hit.downloads?.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-slate-400">{formatDuration(hit.duration)}</span>
          </div>
          {selectedHit?.id === hit.id && <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />}
        </div>
      ))}
    </div>
  );

  const renderGrid = () => {
    if (!results || !results.hits.length) return null;
    if (activeTab === 'image') return renderImageGrid(results.hits as PixabayImageHit[]);
    if (activeTab === 'video') return renderVideoGrid(results.hits as PixabayVideoHit[]);
    return renderMusicGrid(results.hits as PixabayMusicHit[]);
  };

  // ── Preview panel ──────────────────────────────────────────────────────────

  const renderPreview = () => {
    if (!selectedHit) return null;
    const hit = selectedHit;

    return (
      <div className="border-t border-slate-100 bg-slate-50 p-3">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-200">
            {activeTab === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getPixabayPreviewUrl(hit as PixabayImageHit)} alt="" className="w-full h-full object-cover" />
            )}
            {activeTab === 'video' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getPixabayVideoThumbnail(hit as PixabayVideoHit)} alt="" className="w-full h-full object-cover" />
            )}
            {activeTab === 'music' && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500">
                <Music className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">
              {activeTab === 'music' ? (hit as PixabayMusicHit).title || `Track ${hit.id}` : `By ${hit.user}`}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Download className="w-2.5 h-2.5" />{hit.downloads?.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" />{hit.likes?.toLocaleString()}
              </span>
              {activeTab === 'image' && (
                <span className="text-[10px] text-slate-500">
                  {(hit as PixabayImageHit).imageWidth}×{(hit as PixabayImageHit).imageHeight}
                </span>
              )}
              {(activeTab === 'video' || activeTab === 'music') && (
                <span className="text-[10px] text-slate-500">{formatDuration((hit as PixabayVideoHit | PixabayMusicHit).duration)}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{hit.tags}</p>
          </div>

          <a href={hit.pageURL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 flex-shrink-0" title="View on Pixabay">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Save to Firebase options */}
        <div className="mt-3 pt-2 border-t border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={saveToFirebase} onChange={(e) => setSaveToFirebase(e.target.checked)} className="rounded text-orange-500" />
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Save className="w-3 h-3" /> Also save to Firebase Storage
            </span>
          </label>
          {saveToFirebase && (
            <div className="mt-2 ml-5">
              <p className="text-[10px] text-slate-500 mb-1">Compression level:</p>
              <div className="flex gap-2">
                {(['high', 'balanced', 'compressed'] as CompressionLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCompressionLevel(lvl)}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${compressionLevel === lvl ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-orange-300'}`}
                  >
                    {lvl === 'high' ? 'High Quality' : lvl === 'balanced' ? 'Balanced' : 'Compressed'}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                {compressionLevel === 'high' ? 'Original quality (larger file)' : compressionLevel === 'balanced' ? '~50% size reduction, good quality' : '~75% size reduction, smaller file'}
              </p>
            </div>
          )}
        </div>

        {/* Use button */}
        <button
          type="button"
          onClick={() => handleSelect(selectedHit)}
          disabled={saving}
          className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving to Firebase…</> : saveSuccess ? <><Check className="w-4 h-4" />Saved!</> : `Use this ${activeTab}`}
        </button>
      </div>
    );
  };

  // ── Filters panel ──────────────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {activeTab === 'image' && (
        <>
          <select value={imageType} onChange={(e) => setImageType(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="all">All Types</option>
            <option value="photo">Photo</option>
            <option value="illustration">Illustration</option>
            <option value="vector">Vector</option>
          </select>
          <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="all">All Orientations</option>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="">All Categories</option>
            {IMAGE_CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </>
      )}
      {activeTab === 'video' && (
        <>
          <select value={videoType} onChange={(e) => setVideoType(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="all">All Types</option>
            <option value="film">Film</option>
            <option value="animation">Animation</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="">All Categories</option>
            {VIDEO_CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </>
      )}
      {activeTab === 'music' && (
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
          <option value="">All Genres</option>
          {MUSIC_CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      )}
    </div>
  );

  // ── Recently saved panel ───────────────────────────────────────────────────

  const renderRecent = () => (
    <div className="p-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-600 mb-2">Recently Saved in Firebase</p>
      {recentLoading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : recentItems.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No saved {activeTab}s yet.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {recentItems.map((item) => (
            <div
              key={item.id}
              className="relative group rounded-lg overflow-hidden cursor-pointer border border-slate-200 hover:border-orange-400 transition-all"
              onClick={() => handleRecentSelect(item)}
            >
              {item.mediaType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.firebaseUrl} alt="" className="w-full h-16 object-cover" loading="lazy" />
              ) : item.mediaType === 'video' ? (
                <div className="w-full h-16 bg-slate-800 flex items-center justify-center">
                  <Film className="w-5 h-5 text-slate-400" />
                </div>
              ) : (
                <div className="w-full h-16 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              {item.compressed && (
                <div className="absolute top-0.5 left-0.5 bg-green-500 text-white text-[8px] px-1 rounded">
                  {formatFileSize(item.compressedSize)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500">Free stock media · CC0 License</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 px-5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${activeTab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
          {/* Recently saved toggle */}
          <button
            type="button"
            onClick={toggleRecent}
            className={`ml-auto flex items-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors ${showRecent ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Save className="w-3 h-3" /> Saved
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${activeTab === 'image' ? 'images' : activeTab === 'video' ? 'videos' : 'music'}…`}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`px-3 py-2 border rounded-lg text-xs flex items-center gap-1 transition-colors ${filtersOpen ? 'border-orange-400 text-orange-600 bg-orange-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchState === 'loading'}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5 transition-opacity"
            >
              {searchState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        {filtersOpen && renderFilters()}

        {/* ── Recently saved ── */}
        {showRecent && renderRecent()}

        {/* ── Results grid (scrollable) ── */}
        <div ref={gridRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {/* Idle state */}
          {searchState === 'idle' && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Search free stock {activeTab}s</p>
              <p className="text-xs text-slate-400 mt-1">Powered by Pixabay · CC0 License</p>
            </div>
          )}

          {/* Loading skeleton */}
          {searchState === 'loading' && (
            <div className={`grid gap-2 ${activeTab === 'music' ? 'grid-cols-1' : activeTab === 'video' ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {Array.from({ length: activeTab === 'music' ? 6 : 12 }).map((_, i) => (
                <div key={i} className={`rounded-lg bg-slate-100 animate-pulse ${activeTab === 'music' ? 'h-14' : 'h-28'}`} />
              ))}
            </div>
          )}

          {/* Error */}
          {searchState === 'error' && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm font-medium text-red-600">{errorMsg}</p>
              <button
                type="button"
                onClick={handleSearch}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Results */}
          {searchState === 'success' && results && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">{results.totalHits.toLocaleString()} results</p>
                {results.totalPages > 1 && (
                  <p className="text-xs text-slate-500">Page {results.page} of {results.totalPages}</p>
                )}
              </div>
              {results.hits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-sm text-slate-500">No results found for "{query}"</p>
                  <p className="text-xs text-slate-400 mt-1">Try different keywords</p>
                </div>
              ) : (
                renderGrid()
              )}
            </>
          )}
        </div>

        {/* ── Preview panel (when item selected) ── */}
        {selectedHit && renderPreview()}

        {/* ── Pagination footer ── */}
        {searchState === 'success' && results && results.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Page</span>
              <input
                type="number"
                min={1}
                max={results.totalPages}
                value={page}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= results.totalPages) handlePageChange(v);
                }}
                className="w-14 text-center text-xs border border-slate-200 rounded px-2 py-1"
              />
              <span className="text-xs text-slate-500">of {results.totalPages}</span>
            </div>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= results.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Attribution footer ── */}
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">Images provided by <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline">Pixabay</a> under CC0 License</p>
          <p className="text-[10px] text-slate-400">Double-click to use instantly</p>
        </div>
      </div>
    </div>
  );
}
