'use client';

import { useState, useEffect } from 'react';
import LandingPage from '@/components/landing';
import PublicHeader from '@/components/cms/public-header';
import PagePreview from '@/components/cms/page-preview';
import { cmsService, CmsPage, MenuItem, MenuConfig } from '@/lib/services/cms.service';

export default function HomePage() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuConfig, setMenuConfig] = useState<MenuConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cmsService.getMenu().then(setMenu).catch(() => {});
    cmsService.getPublicMenuConfig().then(setMenuConfig).catch(() => {});
  }, []);

  useEffect(() => {
    cmsService
      .getPageBySlug('home')
      .then((page) => {
        if (page.isPublished) setCmsPage(page);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!cmsPage) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader menu={menu} config={menuConfig} />
      <main className="flex-1">
        <PagePreview blocks={cmsPage.blocks || []} pageSlug="home" />
      </main>
    </div>
  );
}

