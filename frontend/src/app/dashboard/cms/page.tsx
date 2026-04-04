'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { cmsService, CmsPage } from '@/lib/services/cms.service';
import {
  Plus,
  FileEdit,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Copy,
  ExternalLink,
  Search,
  Settings2,
  Image as ImageIcon,
} from 'lucide-react';

export default function CMSPage() {
  return (
    <ProtectedRoute moduleId="cms">
      <DashboardLayout>
        <CMSContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function CMSContent() {
  const router = useRouter();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cmsService.getPages();
      setPages(data);
    } catch (err) {
      console.error('Failed to load pages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleDelete = async (id: string) => {
    try {
      await cmsService.deletePage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleTogglePublish = async (page: CmsPage) => {
    try {
      await cmsService.updatePage(page.id!, { isPublished: !page.isPublished });
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, isPublished: !p.isPublished } : p))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleDuplicate = async (page: CmsPage) => {
    try {
      const { id, createdAt, updatedAt, ...rest } = page;
      await cmsService.createPage({
        ...rest,
        title: `${rest.title} (Copy)`,
        slug: `${rest.slug}-copy-${Date.now()}`,
        isPublished: false,
      });
      fetchPages();
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-1">Website CMS</h2>
          <p className="text-slate-600">Create and manage public-facing website pages</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/cms/menu-config')}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
          >
            <Settings2 className="h-5 w-5" />
            Menu Style
          </button>
          <button
            onClick={() => router.push('/dashboard/cms/media-library')}
            className="flex items-center gap-2 px-4 py-2.5 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors font-medium text-orange-700"
          >
            <ImageIcon className="h-5 w-5" />
            Media Library
          </button>
          <button
            onClick={() => router.push('/dashboard/cms/editor')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            New Page
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pages List */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading pages...</div>
      ) : filteredPages.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <Globe className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No pages yet</h3>
          <p className="text-slate-600 mb-6">
            Create your first page to get started with your website.
          </p>
          <button
            onClick={() => router.push('/dashboard/cms/editor')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First Page
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPages.map((page) => (
            <div
              key={page.id}
              className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
            >
              <GripVertical className="h-5 w-5 text-slate-300 flex-shrink-0" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {page.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      page.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {page.isPublished ? 'Published' : 'Draft'}
                  </span>
                  {page.showInMenu && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                      In Menu
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  /{page.slug}
                  {page.description && ` â€” ${page.description}`}
                </p>
              </div>

              {/* Blocks count */}
              <div className="text-xs text-slate-500 flex-shrink-0">
                {page.blocks?.length || 0} blocks
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePublish(page)}
                  title={page.isPublished ? 'Unpublish' : 'Publish'}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {page.isPublished ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-green-600" />
                  )}
                </button>
                <button
                  onClick={() => handleDuplicate(page)}
                  title="Duplicate"
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Copy className="h-4 w-4 text-slate-500" />
                </button>
                {page.isPublished && (
                  <a
                    href={`/pages/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View live"
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  </a>
                )}
                <button
                  onClick={() => router.push(`/dashboard/cms/editor?id=${page.id}`)}
                  title="Edit"
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <FileEdit className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={() => setDeleteId(page.id!)}
                  title="Delete"
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Page?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This action cannot be undone. The page and all its content will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
