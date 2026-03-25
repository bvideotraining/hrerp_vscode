'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { cmsService, MenuConfig, MenuItem, CmsPage } from '@/lib/services/cms.service';
import {
  ArrowLeft,
  Save,
  Eye,
  Palette,
  Type,
  Image as ImageIcon,
  Share2,
  LogIn,
  Navigation,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Plus,
  Trash2,
} from 'lucide-react';

export default function MenuConfigPage() {
  return (
    <ProtectedRoute moduleId="cms">
      <DashboardLayout>
        <MenuConfigContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const DEFAULT_CONFIG: MenuConfig = {
  backgroundColor: '#ffffff',
  backgroundStyle: 'solid',
  gradientFrom: '#1e293b',
  gradientTo: '#334155',
  menuItemColor: '#475569',
  menuItemHoverColor: '#1e293b',
  logoUrl: '',
  logoText: 'HR ERP',
  logoPosition: 'left',
  socialLinks: [],
  showSocialIcons: false,
  showSignInButton: true,
  signInButtonText: 'Sign In',
  signInButtonUrl: '/login',
  signInButtonColor: '#2563eb',
  signInButtonTextColor: '#ffffff',
  borderStyle: 'solid',
  sticky: true,
};

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'twitter', label: 'Twitter / X', icon: Twitter },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'github', label: 'GitHub', icon: Github },
];

const BG_STYLES = [
  { id: 'solid', label: 'Solid Color' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'transparent', label: 'Transparent' },
  { id: 'blur', label: 'Glass Blur' },
];

const BORDER_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'solid', label: 'Border Line' },
  { id: 'shadow', label: 'Shadow' },
];

function MenuConfigContent() {
  const router = useRouter();
  const [config, setConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [allPages, setAllPages] = useState<CmsPage[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      cmsService.getMenuConfig().catch(() => DEFAULT_CONFIG),
      cmsService.getMenu().catch(() => []),
      cmsService.getPages().catch(() => []),
    ]).then(([cfg, menuItems, pages]) => {
      setConfig({ ...DEFAULT_CONFIG, ...cfg });
      setMenu(menuItems);
      setAllPages((pages as CmsPage[]).sort((a, b) => (a.menuOrder ?? 99) - (b.menuOrder ?? 99)));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await cmsService.updateMenuConfig(config);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const update = useCallback((patch: Partial<MenuConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleMenuPage = async (page: CmsPage) => {
    if (!page.id) return;
    setTogglingId(page.id);
    try {
      await cmsService.updatePage(page.id, { showInMenu: !page.showInMenu });
      const updated = await cmsService.getPages();
      setAllPages(updated.sort((a, b) => (a.menuOrder ?? 99) - (b.menuOrder ?? 99)));
      setMenu(await cmsService.getMenu());
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const addSocialLink = () => {
    const used = new Set((config.socialLinks || []).map((s) => s.platform));
    const next = SOCIAL_PLATFORMS.find((p) => !used.has(p.id));
    if (!next) return;
    update({ socialLinks: [...(config.socialLinks || []), { platform: next.id, url: '' }] });
  };

  const removeSocialLink = (idx: number) => {
    update({ socialLinks: (config.socialLinks || []).filter((_, i) => i !== idx) });
  };

  const updateSocialLink = (idx: number, field: string, value: string) => {
    update({
      socialLinks: (config.socialLinks || []).map((s, i) =>
        i === idx ? { ...s, [field]: value } : s
      ),
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading menu configuration...</div>;
  }

  // â”€â”€â”€ Preview Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const getHeaderStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (config.backgroundStyle === 'solid') {
      style.backgroundColor = config.backgroundColor || '#ffffff';
    } else if (config.backgroundStyle === 'gradient') {
      style.background = `linear-gradient(to right, ${config.gradientFrom || '#1e293b'}, ${config.gradientTo || '#334155'})`;
    } else if (config.backgroundStyle === 'transparent') {
      style.backgroundColor = 'transparent';
    } else if (config.backgroundStyle === 'blur') {
      style.backgroundColor = 'rgba(255,255,255,0.7)';
      style.backdropFilter = 'blur(12px)';
    }
    if (config.borderStyle === 'solid') {
      style.borderBottom = '1px solid #e2e8f0';
    } else if (config.borderStyle === 'shadow') {
      style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
    return style;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/cms')} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Menu Configuration</h2>
            <p className="text-xs text-slate-500">Customize header style, logo, navigation & social links</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm transition-colors ${
              showPreview ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      {showPreview && (
        <div className="border-b border-slate-200 bg-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Live Preview</p>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <header style={getHeaderStyle()}>
              <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className={`flex items-center gap-2 ${config.logoPosition === 'center' ? 'absolute left-1/2 -translate-x-1/2' : ''}`}>
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-10 w-auto" />
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                        <span className="text-lg font-bold text-white">{(config.logoText || 'HR').substring(0, 2)}</span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: config.menuItemColor }}>{config.logoText || 'HR ERP'}</span>
                    </>
                  )}
                </div>

                {/* Menu Items */}
                <nav className="flex items-center gap-6">
                  <span className="text-sm cursor-pointer" style={{ color: config.menuItemColor }}>Home</span>
                  {menu.slice(0, 4).map((item) => (
                    <span key={item.id} className="text-sm cursor-pointer" style={{ color: config.menuItemColor }}>
                      {item.title}
                    </span>
                  ))}
                </nav>

                {/* Right Side */}
                <div className="flex items-center gap-4">
                  {config.showSocialIcons && (config.socialLinks || []).length > 0 && (
                    <div className="flex items-center gap-2">
                      {(config.socialLinks || []).map((s, i) => {
                        const platform = SOCIAL_PLATFORMS.find((p) => p.id === s.platform);
                        const Icon = platform?.icon || Share2;
                        return <Icon key={i} className="h-4 w-4" style={{ color: config.menuItemColor }} />;
                      })}
                    </div>
                  )}
                  {config.showSignInButton && (
                    <span
                      className="px-5 py-2 rounded-lg text-sm font-medium cursor-pointer"
                      style={{
                        backgroundColor: config.signInButtonColor || '#2563eb',
                        color: config.signInButtonTextColor || '#ffffff',
                      }}
                    >
                      {config.signInButtonText || 'Sign In'}
                    </span>
                  )}
                </div>
              </div>
            </header>
          </div>
        </div>
      )}

      {/* Editor Panels */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* â•â•â• Navigation Pages â•â•â• */}
          <Section icon={Navigation} title="Navigation Pages">
            <p className="text-xs text-slate-500 mb-3">Toggle which pages appear in the public navigation menu.</p>
            {allPages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No pages found. Create pages in the Pages section.</p>
            ) : (
              <div className="space-y-2">
                {allPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{page.title}</p>
                      <p className="text-xs text-slate-400">
                        /{page.slug === 'home' ? '' : `pages/${page.slug}`}
                        {!page.isPublished && (
                          <span className="ml-2 text-amber-500">(unpublished)</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleMenuPage(page)}
                      disabled={togglingId === page.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                        page.showInMenu ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                      title={page.showInMenu ? 'Remove from menu' : 'Add to menu'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          page.showInMenu ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* â•â•â• Background Style â•â•â• */}
          <Section icon={Palette} title="Background Style">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {BG_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => update({ backgroundStyle: s.id })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    config.backgroundStyle === s.id
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {config.backgroundStyle === 'solid' && (
              <ColorField label="Background Color" value={config.backgroundColor || '#ffffff'} onChange={(v) => update({ backgroundColor: v })} />
            )}
            {config.backgroundStyle === 'gradient' && (
              <div className="grid grid-cols-2 gap-4">
                <ColorField label="Gradient From" value={config.gradientFrom || '#1e293b'} onChange={(v) => update({ gradientFrom: v })} />
                <ColorField label="Gradient To" value={config.gradientTo || '#334155'} onChange={(v) => update({ gradientTo: v })} />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Bottom Border</label>
              <div className="flex gap-2">
                {BORDER_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ borderStyle: s.id })}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      config.borderStyle === s.id
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.sticky !== false}
                  onChange={(e) => update({ sticky: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Sticky header (stays on top when scrolling)</span>
              </label>
            </div>
          </Section>

          {/* â•â•â• Menu Items Color â•â•â• */}
          <Section icon={Type} title="Menu Items Style">
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Text Color" value={config.menuItemColor || '#475569'} onChange={(v) => update({ menuItemColor: v })} />
              <ColorField label="Hover Color" value={config.menuItemHoverColor || '#1e293b'} onChange={(v) => update({ menuItemHoverColor: v })} />
            </div>
          </Section>

          {/* â•â•â• Logo â•â•â• */}
          <Section icon={ImageIcon} title="Logo">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Logo Text (shown when no image)</label>
                <input
                  type="text"
                  value={config.logoText || ''}
                  onChange={(e) => update({ logoText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="HR ERP"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Logo Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.logoUrl || ''}
                    onChange={(e) => update({ logoUrl: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="https://example.com/logo.png or upload below"
                  />
                  <label className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 cursor-pointer transition-colors">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url } = await cmsService.uploadImage(file);
                          update({ logoUrl: url });
                        } catch (err) {
                          console.error('Upload failed:', err);
                        }
                      }}
                    />
                  </label>
                </div>
                {config.logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={config.logoUrl} alt="Logo preview" className="h-10 w-auto rounded border border-slate-200" />
                    <button onClick={() => update({ logoUrl: '' })} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Logo Position</label>
                <div className="flex gap-2">
                  {(['left', 'center'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => update({ logoPosition: pos })}
                      className={`px-4 py-1.5 rounded-lg text-sm border capitalize transition-colors ${
                        config.logoPosition === pos
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* â•â•â• Social Media Icons â•â•â• */}
          <Section icon={Share2} title="Social Media Icons">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={config.showSocialIcons || false}
                onChange={(e) => update({ showSocialIcons: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Show social media icons in header</span>
            </label>

            {config.showSocialIcons && (
              <div className="space-y-3">
                {(config.socialLinks || []).map((link, idx) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
                  const Icon = platform?.icon || Share2;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                      <select
                        value={link.platform}
                        onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[140px]"
                      >
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                      <button onClick={() => removeSocialLink(idx)} className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  );
                })}
                {(config.socialLinks || []).length < SOCIAL_PLATFORMS.length && (
                  <button
                    onClick={addSocialLink}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Social Link
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* â•â•â• Sign In Button â•â•â• */}
          <Section icon={LogIn} title="Sign In Button">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={config.showSignInButton !== false}
                onChange={(e) => update({ showSignInButton: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Show sign-in button in header</span>
            </label>

            {config.showSignInButton !== false && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={config.signInButtonText || ''}
                      onChange={(e) => update({ signInButtonText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Sign In"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Button Link</label>
                    <input
                      type="text"
                      value={config.signInButtonUrl || ''}
                      onChange={(e) => update({ signInButtonUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="/login"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Button Color" value={config.signInButtonColor || '#2563eb'} onChange={(v) => update({ signInButtonColor: v })} />
                  <ColorField label="Button Text Color" value={config.signInButtonTextColor || '#ffffff'} onChange={(v) => update({ signInButtonTextColor: v })} />
                </div>
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Reusable Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <Icon className="h-5 w-5 text-slate-500" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border border-slate-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
