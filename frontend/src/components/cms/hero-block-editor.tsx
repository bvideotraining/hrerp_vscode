'use client';

import { useState } from 'react';
import { HeroData } from '@/lib/services/cms.service';
import { cmsService } from '@/lib/services/cms.service';
import { Upload, X } from 'lucide-react';

const HERO_TEMPLATES = [
  { id: 'centered', label: 'Centered', preview: 'Text centered with CTA button' },
  { id: 'split', label: 'Split', preview: 'Text left, image right' },
  { id: 'gradient', label: 'Gradient', preview: 'Gradient background with overlay' },
  { id: 'image-bg', label: 'Image BG', preview: 'Full background image with overlay' },
];

interface Props {
  data: HeroData;
  onChange: (data: HeroData) => void;
}

export default function HeroBlockEditor({ data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

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
              <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200">
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
    </div>
  );
}
