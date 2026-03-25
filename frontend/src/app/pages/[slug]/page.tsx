'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cmsService, CmsPage, MenuItem, MenuConfig } from '@/lib/services/cms.service';
import PagePreview from '@/components/cms/page-preview';
import PublicHeader from '@/components/cms/public-header';

export default function PublicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<CmsPage | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuConfig, setMenuConfig] = useState<MenuConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cmsService.getMenu().then(setMenu).catch(() => {});
    cmsService.getPublicMenuConfig().then(setMenuConfig).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    cmsService
      .getPageBySlug(slug)
      .then((data) => {
        setPage(data);
      })
      .catch((err) => {
        setError(err.message || 'Page not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader menu={menu} config={menuConfig} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
            <p className="text-xl text-slate-600 mb-6">Page not found</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader menu={menu} config={menuConfig} />
      <main className="flex-1">
        <PagePreview blocks={page.blocks || []} pageSlug={slug} />
      </main>
    </div>
  );
}

