'use client';

import { useState, useRef } from 'react';
import { Branding } from '@/lib/services/organization.service';
import { useBranding } from '@/context/branding-context';
import { Save, Upload, X } from 'lucide-react';

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB — safe for Firestore document size

export function BrandingTab() {
  const { appName, logoUrl, updateBranding } = useBranding();
  const [form, setForm] = useState<Branding>({ appName, logoUrl });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast('error', 'Image must be smaller than 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected if removed
    e.target.value = '';
  };

  const handleRemoveLogo = () => setForm((f) => ({ ...f, logoUrl: '' }));

  const handleSave = async () => {
    if (!form.appName.trim()) {
      showToast('error', 'App name is required');
      return;
    }
    setSaving(true);
    try {
      await updateBranding(form);
      showToast('success', 'Branding updated successfully');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {toast && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Application Identity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Application Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.appName}
                onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
                placeholder="e.g. HR ERP"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Displayed in the sidebar and browser title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo</label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {form.logoUrl ? (
                /* Logo already selected — show preview with remove button */
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* No logo — show upload drop zone */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Upload className="h-6 w-6" />
                  <span className="font-medium">Click to upload logo</span>
                  <span className="text-xs">PNG, JPG, SVG, WebP — max 500 KB</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">
                  {(form.appName || 'HR').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-slate-900">{form.appName || 'HR ERP'}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>
      </div>
    </div>
  );
}
