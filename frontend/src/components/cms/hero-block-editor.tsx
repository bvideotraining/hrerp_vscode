'use client';

import { useState } from 'react';
import { HeroData } from '@/lib/services/cms.service';
import { cmsService } from '@/lib/services/cms.service';
import { Upload, X, ChevronDown, ChevronUp } from 'lucide-react';

const HERO_TEMPLATES = [
  { id: 'centered', label: 'Centered', preview: 'Text centered with CTA button' },
  { id: 'split', label: 'Split', preview: 'Text left, image right' },
  { id: 'gradient', label: 'Gradient', preview: 'Gradient background with overlay' },
  { id: 'image-bg', label: 'Image BG', preview: 'Full background image with overlay' },
];

const FONT_FAMILIES = [
  { value: '', label: 'Default (System UI)' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: 'Georgia, serif', label: 'Georgia' },
];

const FONT_SIZES_TITLE = [
  { value: '', label: 'Default' },
  { value: '2rem', label: '2xl (32px)' },
  { value: '2.5rem', label: '3xl (40px)' },
  { value: '3rem', label: '4xl (48px)' },
  { value: '3.75rem', label: '5xl (60px)' },
  { value: '4.5rem', label: '6xl (72px)' },
  { value: '6rem', label: '7xl (96px)' },
];

const FONT_SIZES_SUBTITLE = [
  { value: '', label: 'Default' },
  { value: '0.875rem', label: 'sm (14px)' },
  { value: '1rem', label: 'base (16px)' },
  { value: '1.125rem', label: 'lg (18px)' },
  { value: '1.25rem', label: 'xl (20px)' },
  { value: '1.5rem', label: '2xl (24px)' },
  { value: '1.875rem', label: '3xl (30px)' },
];

interface Props {
  data: HeroData;
  onChange: (data: HeroData) => void;
}

export default function HeroBlockEditor({ data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);

  const update = (partial: Partial<HeroData>) => {
    onChange({ ...data, ...partial });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await cmsService.uploadImage(file);
      update({ backgroundImage: url });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Template</label>
        <div className="grid grid-cols-4 gap-2">
          {HERO_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ template: t.id as HeroData['template'] })}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.template === t.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-semibold text-slate-800 block">{t.label}</span>
              <span className="text-[10px] text-slate-500">{t.preview}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          placeholder="Hero title"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Subtitle</label>
        <textarea
          value={data.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
          rows={2}
          placeholder="Hero subtitle"
        />
      </div>

      {/* Button */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Button Text</label>
          <input
            type="text"
            value={data.buttonText || ''}
            onChange={(e) => update({ buttonText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Get Started"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Button Link</label>
          <input
            type="text"
            value={data.buttonLink || ''}
            onChange={(e) => update({ buttonLink: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="#section or /page"
          />
        </div>
      </div>

      {/* Background Image */}
      {(data.template === 'image-bg' || data.template === 'split' || data.template === 'gradient') && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Background Image</label>
          <div className="flex items-center gap-3">
            {data.backgroundImage ? (
              <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.backgroundImage} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => update({ backgroundImage: '' })}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">
                {uploading ? 'Uploading...' : 'Upload Image'}
              </span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Overlay Color */}
      {(data.template === 'image-bg' || data.template === 'gradient') && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Overlay Color</label>
          <input
            type="text"
            value={data.overlayColor || ''}
            onChange={(e) => update({ overlayColor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="rgba(0,0,0,0.5)"
          />
        </div>
      )}

      {/* ── Text & Button Styles ─────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setStylesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-700">Text &amp; Button Styles</span>
          {stylesOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {stylesOpen && (
          <div className="p-4 space-y-5 bg-white">

            {/* ── Title Styles ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Title</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Font Family</label>
                  <select
                    value={data.titleFontFamily || ''}
                    onChange={(e) => update({ titleFontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Font Size</label>
                  <select
                    value={data.titleFontSize || ''}
                    onChange={(e) => update({ titleFontSize: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {FONT_SIZES_TITLE.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-slate-600 mb-1">Font Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.titleColor || '#ffffff'}
                    onChange={(e) => update({ titleColor: e.target.value })}
                    className="h-8 w-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={data.titleColor || ''}
                    onChange={(e) => update({ titleColor: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                    placeholder="#ffffff or rgba(255,255,255,1)"
                  />
                  {data.titleColor && (
                    <button
                      type="button"
                      onClick={() => update({ titleColor: '' })}
                      className="text-slate-400 hover:text-red-500"
                      title="Reset to default"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Subtitle Styles ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Subtitle</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Font Family</label>
                  <select
                    value={data.subtitleFontFamily || ''}
                    onChange={(e) => update({ subtitleFontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Font Size</label>
                  <select
                    value={data.subtitleFontSize || ''}
                    onChange={(e) => update({ subtitleFontSize: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {FONT_SIZES_SUBTITLE.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-slate-600 mb-1">Font Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.subtitleColor || '#e2e8f0'}
                    onChange={(e) => update({ subtitleColor: e.target.value })}
                    className="h-8 w-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={data.subtitleColor || ''}
                    onChange={(e) => update({ subtitleColor: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                    placeholder="#e2e8f0 or rgba(...)"
                  />
                  {data.subtitleColor && (
                    <button
                      type="button"
                      onClick={() => update({ subtitleColor: '' })}
                      className="text-slate-400 hover:text-red-500"
                      title="Reset to default"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Button Styles ── */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Button</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.buttonBgColor || '#ffffff'}
                      onChange={(e) => update({ buttonBgColor: e.target.value })}
                      className="h-8 w-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={data.buttonBgColor || ''}
                      onChange={(e) => update({ buttonBgColor: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs min-w-0"
                      placeholder="#ffffff"
                    />
                    {data.buttonBgColor && (
                      <button
                        type="button"
                        onClick={() => update({ buttonBgColor: '' })}
                        className="text-slate-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.buttonTextColor || '#1e293b'}
                      onChange={(e) => update({ buttonTextColor: e.target.value })}
                      className="h-8 w-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={data.buttonTextColor || ''}
                      onChange={(e) => update({ buttonTextColor: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs min-w-0"
                      placeholder="#1e293b"
                    />
                    {data.buttonTextColor && (
                      <button
                        type="button"
                        onClick={() => update({ buttonTextColor: '' })}
                        className="text-slate-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live button preview */}
              {(data.buttonBgColor || data.buttonTextColor) && data.buttonText && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Preview:</span>
                  <span
                    className="inline-block px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{
                      backgroundColor: data.buttonBgColor || '#ffffff',
                      color: data.buttonTextColor || '#1e293b',
                    }}
                  >
                    {data.buttonText}
                  </span>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
