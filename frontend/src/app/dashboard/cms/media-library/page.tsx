'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import RecentlyUsedPixabayPanel from '@/components/cms/recently-used-pixabay-panel';
import PixabayMediaPicker from '@/components/cms/pixabay-media-picker';
import { pixabayService } from '@/lib/services/pixabay.service';
import type { PixabayFirebaseItem, PixabayMediaType } from '@/types/pixabay';
import {
  Image as ImageIcon,
  Film,
  Music,
  Search,
  ExternalLink,
  Check,
} from 'lucide-react';

export default function MediaLibraryPage() {
  return (
    <ProtectedRoute moduleId="cms">
      <DashboardLayout>
        <MediaLibraryContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function MediaLibraryContent() {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<PixabayMediaType>('image');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenPicker = (tab: PixabayMediaType) => {
    setPickerTab(tab);
    setShowPicker(true);
  };

  const handlePickerSelect = async (url: string, mediaType: PixabayMediaType) => {
    // When selected from the picker in this context, save to Firebase automatically
    try {
      await pixabayService.saveItem({
        sourceUrl: url,
        mediaType,
        shouldCompress: true,
        compressionLevel: 'balanced',
      });
    } catch {
      // ignore — item may already be saved
    }
    setShowPicker(false);
    setRefreshKey((k) => k + 1);
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleItemSelect = (item: PixabayFirebaseItem) => {
    handleCopyUrl(item.firebaseUrl);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Media Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and manage media saved from Pixabay to Firebase Storage
          </p>
        </div>
        <a
          href="https://pixabay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Pixabay.com
        </a>
      </div>

      {/* Quick-add cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { tab: 'image' as PixabayMediaType, label: 'Add Images', Icon: ImageIcon, from: 'from-orange-400', to: 'to-pink-500' },
          { tab: 'video' as PixabayMediaType, label: 'Add Videos', Icon: Film, from: 'from-blue-500', to: 'to-indigo-600' },
          { tab: 'music' as PixabayMediaType, label: 'Add Music', Icon: Music, from: 'from-emerald-400', to: 'to-teal-600' },
        ].map(({ tab, label, Icon, from, to }) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleOpenPicker(tab)}
            className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${from} ${to} text-white hover:opacity-90 transition-opacity shadow-sm`}
          >
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">{label}</p>
              <p className="text-[11px] text-white/80">Search &amp; save to Firebase</p>
            </div>
            <Search className="w-4 h-4 ml-auto opacity-70" />
          </button>
        ))}
      </div>

      {/* Copied URL toast */}
      {copiedUrl && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-green-400" />
          URL copied to clipboard
        </div>
      )}

      {/* Media grid — all tabs */}
      <RecentlyUsedPixabayPanel
        key={refreshKey}
        mediaType="all"
        perPage={16}
        allowDelete
        onSelect={handleItemSelect}
        className="shadow-sm"
      />

      {/* Pixabay picker modal */}
      {showPicker && (
        <PixabayMediaPicker
          defaultTab={pickerTab}
          title={`Search Pixabay ${pickerTab === 'image' ? 'Images' : pickerTab === 'video' ? 'Videos' : 'Music'}`}
          onClose={() => setShowPicker(false)}
          onSelect={handlePickerSelect}
        />
      )}
    </div>
  );
}
