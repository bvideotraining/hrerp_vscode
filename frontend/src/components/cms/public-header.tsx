'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MenuItem, MenuConfig } from '@/lib/services/cms.service';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Share2,
  Menu,
  X,
} from 'lucide-react';

const SOCIAL_ICONS: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
};

interface Props {
  menu: MenuItem[];
  config: MenuConfig;
}

export default function PublicHeader({ menu, config }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const c = {
    backgroundColor: config.backgroundColor || '#ffffff',
    backgroundStyle: config.backgroundStyle || 'solid',
    gradientFrom: config.gradientFrom || '#1e293b',
    gradientTo: config.gradientTo || '#334155',
    menuItemColor: config.menuItemColor || '#475569',
    menuItemHoverColor: config.menuItemHoverColor || '#1e293b',
    logoUrl: config.logoUrl || '',
    logoText: config.logoText || 'HR ERP',
    logoPosition: config.logoPosition || 'left',
    socialLinks: config.socialLinks || [],
    showSocialIcons: config.showSocialIcons || false,
    showSignInButton: config.showSignInButton !== false,
    signInButtonText: config.signInButtonText || 'Sign In',
    signInButtonUrl: config.signInButtonUrl || '/login',
    signInButtonColor: config.signInButtonColor || '#2563eb',
    signInButtonTextColor: config.signInButtonTextColor || '#ffffff',
    borderStyle: config.borderStyle || 'solid',
    sticky: config.sticky !== false,
  };

  const headerStyle: React.CSSProperties = {};
  if (c.backgroundStyle === 'solid') {
    headerStyle.backgroundColor = c.backgroundColor;
  } else if (c.backgroundStyle === 'gradient') {
    headerStyle.background = `linear-gradient(to right, ${c.gradientFrom}, ${c.gradientTo})`;
  } else if (c.backgroundStyle === 'transparent') {
    headerStyle.backgroundColor = 'transparent';
  } else if (c.backgroundStyle === 'blur') {
    headerStyle.backgroundColor = 'rgba(255,255,255,0.7)';
    headerStyle.backdropFilter = 'blur(12px)';
  }

  if (c.borderStyle === 'solid') {
    headerStyle.borderBottom = '1px solid #e2e8f0';
  } else if (c.borderStyle === 'shadow') {
    headerStyle.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
  }

  return (
    <header className={`${c.sticky ? 'sticky top-0' : ''} z-50 w-full`} style={headerStyle}>
      <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between relative">
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-2 ${c.logoPosition === 'center' ? 'absolute left-1/2 -translate-x-1/2' : ''}`}
        >
          {c.logoUrl ? (
            <Image src={c.logoUrl} alt={c.logoText} width={120} height={40} className="h-10 w-auto" />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <span className="text-lg font-bold text-white">{c.logoText.substring(0, 2).toUpperCase()}</span>
              </div>
              <span className="text-lg font-bold" style={{ color: c.menuItemColor }}>
                {c.logoText}
              </span>
            </>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {menu.map((item) => (
            <Link
              key={item.id}
              href={item.slug === 'home' ? '/' : `/pages/${item.slug}`}
              className="text-sm transition-colors"
              style={{ color: c.menuItemColor }}
              onMouseEnter={(e) => (e.currentTarget.style.color = c.menuItemHoverColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = c.menuItemColor)}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-4">
          {c.showSocialIcons && c.socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {c.socialLinks.map((s, i) => {
                const Icon = SOCIAL_ICONS[s.platform] || Share2;
                return s.url ? (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70">
                    <Icon className="h-4 w-4" style={{ color: c.menuItemColor }} />
                  </a>
                ) : (
                  <Icon key={i} className="h-4 w-4" style={{ color: c.menuItemColor }} />
                );
              })}
            </div>
          )}
          {c.showSignInButton && (
            <Link
              href={c.signInButtonUrl}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: c.signInButtonColor, color: c.signInButtonTextColor }}
            >
              {c.signInButtonText}
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-black/5"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" style={{ color: c.menuItemColor }} />
          ) : (
            <Menu className="h-5 w-5" style={{ color: c.menuItemColor }} />
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-slate-200/50 px-4 py-4 space-y-3"
          style={{ backgroundColor: headerStyle.backgroundColor || '#ffffff' }}
        >
          {menu.map((item) => (
            <Link
              key={item.id}
              href={item.slug === 'home' ? '/' : `/pages/${item.slug}`}
              className="block text-sm py-2"
              style={{ color: c.menuItemColor }}
              onClick={() => setMobileOpen(false)}
            >
              {item.title}
            </Link>
          ))}
          {c.showSocialIcons && c.socialLinks.length > 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200/50">
              {c.socialLinks.map((s, i) => {
                const Icon = SOCIAL_ICONS[s.platform] || Share2;
                return s.url ? (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
                    <Icon className="h-5 w-5" style={{ color: c.menuItemColor }} />
                  </a>
                ) : (
                  <Icon key={i} className="h-5 w-5" style={{ color: c.menuItemColor }} />
                );
              })}
            </div>
          )}
          {c.showSignInButton && (
            <Link
              href={c.signInButtonUrl}
              className="block text-center px-5 py-2.5 rounded-lg text-sm font-medium mt-2"
              style={{ backgroundColor: c.signInButtonColor, color: c.signInButtonTextColor }}
              onClick={() => setMobileOpen(false)}
            >
              {c.signInButtonText}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
