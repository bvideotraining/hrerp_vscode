'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { cmsService, CmsPage, ContentBlock } from '@/lib/services/cms.service';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  LayoutTemplate,
  CreditCard,
  Type,
  Footprints,
  Settings2,
  FormInput,
} from 'lucide-react';
import HeroBlockEditor from '@/components/cms/hero-block-editor';
import CardsBlockEditor from '@/components/cms/cards-block-editor';
import RichtextBlockEditor from '@/components/cms/richtext-block-editor';
import FooterBlockEditor from '@/components/cms/footer-block-editor';
import FormBlockEditor from '@/components/cms/form-block-editor';
import PagePreview from '@/components/cms/page-preview';
import TemplatePicker from '@/components/cms/template-picker';
import { PageTemplate } from '@/components/cms/page-templates';

export default function CmsEditorPage() {
  return (
    <ProtectedRoute moduleId="cms">
      <DashboardLayout>
        <EditorContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const BLOCK_TYPES = [
  { type: 'hero' as const, label: 'Hero Section', icon: LayoutTemplate, color: 'bg-purple-100 text-purple-700' },
  { type: 'cards' as const, label: 'Cards Section', icon: CreditCard, color: 'bg-blue-100 text-blue-700' },
  { type: 'richtext' as const, label: 'Rich Text', icon: Type, color: 'bg-emerald-100 text-emerald-700' },
  { type: 'footer' as const, label: 'Footer', icon: Footprints, color: 'bg-slate-100 text-slate-700' },
  { type: 'form' as const, label: 'Contact Form', icon: FormInput, color: 'bg-orange-100 text-orange-700' },
];

function generateId() {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultData(type: string) {
  switch (type) {
    case 'hero':
      return {
        template: 'centered',
        title: 'Welcome to Our Website',
        subtitle: 'Build something amazing',
        buttonText: 'Get Started',
        buttonLink: '#',
        backgroundImage: '',
        overlayColor: 'rgba(0,0,0,0.5)',
      };
    case 'cards':
      return {
        heading: 'Our Services',
        columns: 3,
        cards: [
          { icon: 'Star', title: 'Feature One', text: 'Description of this feature' },
          { icon: 'Zap', title: 'Feature Two', text: 'Description of this feature' },
          { icon: 'Shield', title: 'Feature Three', text: 'Description of this feature' },
        ],
      };
    case 'richtext':
      return { html: '<h2>Your Content Here</h2><p>Start editing to add your content...</p>' };
    case 'footer':
      return {
        template: 'simple',
        companyName: 'Company Name',
        description: 'Your company description',
        copyright: `Â© ${new Date().getFullYear()} Company Name. All rights reserved.`,
        links: [
          { label: 'Privacy Policy', url: '#' },
          { label: 'Terms of Service', url: '#' },
        ],
        socialLinks: [],
        columns: [],
      };
    case 'form':
      return {
        formTitle: 'Get in Touch',
        formSubtitle: 'Fill out the form below and we will get back to you shortly.',
        fields: [
          { id: `field_${Date.now()}_1`, type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true, width: 'half' },
          { id: `field_${Date.now()}_2`, type: 'email', label: 'Email Address', placeholder: 'Enter your email', required: true, width: 'half' },
          { id: `field_${Date.now()}_3`, type: 'textarea', label: 'Message', placeholder: 'Type your message here...', required: true, width: 'full' },
        ],
        submitButtonText: 'Send Message',
        submitButtonColor: '#2563eb',
        submitButtonTextColor: '#ffffff',
        successMessage: 'Thank you! Your message has been sent. We will get back to you shortly.',
        redirectUrl: '',
        destination: 'firestore',
        firestoreCollection: 'contact_submissions',
        enableHoneypot: true,
        formWidth: 'medium',
        backgroundColor: '#ffffff',
        padding: 'medium',
      };
    default:
      return {};
  }
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [page, setPage] = useState<Partial<CmsPage>>({
    title: '',
    slug: '',
    description: '',
    isPublished: false,
    showInMenu: true,
    menuOrder: 0,
    blocks: [],
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(!editId);

  useEffect(() => {
    if (editId) {
      cmsService.getPageById(editId).then((data) => {
        setPage(data);
      });
    }
  }, [editId]);

  const handleSlugFromTitle = (title: string) => {
    if (!editId) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setPage((p) => ({ ...p, title, slug }));
    } else {
      setPage((p) => ({ ...p, title }));
    }
  };

  const handleSave = async () => {
    if (!page.title || !page.slug) return;
    setSaving(true);
    try {
      if (editId) {
        await cmsService.updatePage(editId, page);
      } else {
        const created = await cmsService.createPage(page as any);
        router.replace(`/dashboard/cms/editor?id=${created.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      order: (page.blocks?.length || 0),
      data: getDefaultData(type),
    };
    setPage((p) => ({ ...p, blocks: [...(p.blocks || []), newBlock] }));
    setActiveBlockId(newBlock.id);
    setShowAddBlock(false);
  };

  const updateBlock = useCallback((blockId: string, data: any) => {
    setPage((p) => ({
      ...p,
      blocks: (p.blocks || []).map((b) => (b.id === blockId ? { ...b, data } : b)),
    }));
  }, []);

  const removeBlock = (blockId: string) => {
    setPage((p) => ({
      ...p,
      blocks: (p.blocks || []).filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i })),
    }));
    if (activeBlockId === blockId) setActiveBlockId(null);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setPage((p) => {
      const blocks = [...(p.blocks || [])];
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return p;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= blocks.length) return p;
      [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
      return { ...p, blocks: blocks.map((b, i) => ({ ...b, order: i })) };
    });
  };

  const handleSelectTemplate = (template: PageTemplate) => {
    const { title, slug, description, showInMenu, menuOrder, blocks } = template.pageData;
    // Generate fresh IDs for each block
    const freshBlocks = blocks.map((b, i) => ({
      ...b,
      id: generateId(),
      order: i,
    }));
    setPage({
      title,
      slug,
      description,
      isPublished: false,
      showInMenu,
      menuOrder,
      blocks: freshBlocks,
    });
    setShowTemplatePicker(false);
  };

  if (showTemplatePicker) {
    return (
      <TemplatePicker
        onSelect={handleSelectTemplate}
        onBlank={() => setShowTemplatePicker(false)}
        onClose={() => router.push('/dashboard/cms')}
      />
    );
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Preview: {page.title}</span>
          <button
            onClick={() => setShowPreview(false)}
            className="px-4 py-1.5 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100"
          >
            Close Preview
          </button>
        </div>
        <PagePreview blocks={page.blocks || []} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/cms')}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <input
              type="text"
              value={page.title || ''}
              onChange={(e) => handleSlugFromTitle(e.target.value)}
              placeholder="Page Title"
              className="text-lg font-bold text-slate-900 border-none outline-none bg-transparent w-full"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>/</span>
              <input
                type="text"
                value={page.slug || ''}
                onChange={(e) => setPage((p) => ({ ...p, slug: e.target.value }))}
                placeholder="page-slug"
                className="border-none outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !page.title || !page.slug}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={page.description || ''}
                onChange={(e) => setPage((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                placeholder="Page description"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Menu Order</label>
              <input
                type="number"
                value={page.menuOrder || 0}
                onChange={(e) => setPage((p) => ({ ...p, menuOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={page.showInMenu || false}
                  onChange={(e) => setPage((p) => ({ ...p, showInMenu: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Show in Menu</span>
              </label>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={page.isPublished || false}
                  onChange={(e) => setPage((p) => ({ ...p, isPublished: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Published</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Blocks */}
          {(page.blocks || []).map((block, idx) => {
            const blockDef = BLOCK_TYPES.find((bt) => bt.type === block.type);
            const Icon = blockDef?.icon || Type;
            const isActive = activeBlockId === block.id;

            return (
              <div
                key={block.id}
                className={`bg-white rounded-xl border-2 transition-colors ${
                  isActive ? 'border-blue-400 shadow-md' : 'border-slate-200'
                }`}
              >
                {/* Block Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setActiveBlockId(isActive ? null : block.id)}
                >
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${blockDef?.color || 'bg-slate-100'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1">
                    {blockDef?.label || block.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                      disabled={idx === (page.blocks?.length || 0) - 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                      className="p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Block Editor (expanded) */}
                {isActive && (
                  <div className="border-t border-slate-100 p-4">
                    {block.type === 'hero' && (
                      <HeroBlockEditor data={block.data} onChange={(d) => updateBlock(block.id, d)} />
                    )}
                    {block.type === 'cards' && (
                      <CardsBlockEditor data={block.data} onChange={(d) => updateBlock(block.id, d)} />
                    )}
                    {block.type === 'richtext' && (
                      <RichtextBlockEditor data={block.data} onChange={(d) => updateBlock(block.id, d)} />
                    )}
                    {block.type === 'footer' && (
                      <FooterBlockEditor data={block.data} onChange={(d) => updateBlock(block.id, d)} />
                    )}
                    {block.type === 'form' && (
                      <FormBlockEditor data={block.data} onChange={(d) => updateBlock(block.id, d)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Block Button */}
          <div className="relative">
            <button
              onClick={() => setShowAddBlock(!showAddBlock)}
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="h-5 w-5" />
              Add Content Block
            </button>

            {showAddBlock && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-20 w-80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Choose Block Type
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((bt) => {
                    const BIcon = bt.icon;
                    return (
                      <button
                        key={bt.type}
                        onClick={() => addBlock(bt.type)}
                        className="flex items-center gap-2.5 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bt.color}`}>
                          <BIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
