'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function getAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `API error ${response.status}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ContentBlock {
  id: string;
  type: 'hero' | 'cards' | 'richtext' | 'footer' | 'form';
  order: number;
  data: any;
}

export interface HeroData {
  template: 'centered' | 'split' | 'gradient' | 'image-bg';
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: string;
  overlayColor?: string;
}

export interface CardItem {
  icon: string;
  title: string;
  text: string;
}

export interface CardsData {
  heading?: string;
  columns: 2 | 3 | 4;
  cards: CardItem[];
}

export interface RichtextData {
  html: string;
}

export interface FooterData {
  template: 'simple' | 'columns' | 'centered';
  companyName: string;
  description?: string;
  links?: { label: string; url: string }[];
  columns?: { title: string; links: { label: string; url: string }[] }[];
  copyright?: string;
  socialLinks?: { platform: string; url: string }[];
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  width?: 'full' | 'half';
}

export interface FormBlockData {
  formTitle?: string;
  formSubtitle?: string;
  fields: FormField[];
  submitButtonText: string;
  submitButtonColor: string;
  submitButtonTextColor: string;
  successMessage: string;
  redirectUrl?: string;
  destination: 'firestore' | 'webhook';
  firestoreCollection?: string;
  webhookUrl?: string;
  enableHoneypot?: boolean;
  formWidth?: 'narrow' | 'medium' | 'wide' | 'full';
  backgroundColor?: string;
  padding?: 'small' | 'medium' | 'large';
}

export interface CmsPage {
  id?: string;
  title: string;
  slug: string;
  description?: string;
  isPublished: boolean;
  showInMenu: boolean;
  menuOrder: number;
  blocks: ContentBlock[];
  createdAt?: any;
  updatedAt?: any;
}

export interface MenuItem {
  id: string;
  title: string;
  slug: string;
  menuOrder: number;
}

export interface MenuConfig {
  backgroundColor?: string;
  backgroundStyle?: string; // 'solid' | 'gradient' | 'transparent' | 'blur'
  gradientFrom?: string;
  gradientTo?: string;
  menuItemColor?: string;
  menuItemHoverColor?: string;
  logoUrl?: string;
  logoText?: string;
  logoPosition?: string; // 'left' | 'center'
  socialLinks?: { platform: string; url: string }[];
  showSocialIcons?: boolean;
  showSignInButton?: boolean;
  signInButtonText?: string;
  signInButtonUrl?: string;
  signInButtonColor?: string;
  signInButtonTextColor?: string;
  borderStyle?: string; // 'none' | 'solid' | 'shadow'
  sticky?: boolean;
}

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CmsService {
  // â”€â”€ Admin endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getPages(): Promise<CmsPage[]> {
    return apiFetch<CmsPage[]>('/api/cms/pages');
  }

  getPageById(id: string): Promise<CmsPage> {
    return apiFetch<CmsPage>(`/api/cms/pages/${id}`);
  }

  createPage(data: Omit<CmsPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<CmsPage> {
    return apiFetch<CmsPage>('/api/cms/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    return apiFetch<CmsPage>(`/api/cms/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deletePage(id: string): Promise<void> {
    return apiFetch<void>(`/api/cms/pages/${id}`, { method: 'DELETE' });
  }

  // â”€â”€ Public endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getPublishedPages(): Promise<CmsPage[]> {
    return apiFetch<CmsPage[]>('/api/cms/public/pages');
  }

  getMenu(): Promise<MenuItem[]> {
    return apiFetch<MenuItem[]>('/api/cms/public/menu');
  }

  getPageBySlug(slug: string): Promise<CmsPage> {
    return apiFetch<CmsPage>(`/api/cms/public/pages/${slug}`);
  }

  getPublicMenuConfig(): Promise<MenuConfig> {
    return apiFetch<MenuConfig>('/api/cms/public/menu-config');
  }

  // â”€â”€ Menu config (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getMenuConfig(): Promise<MenuConfig> {
    return apiFetch<MenuConfig>('/api/cms/menu-config');
  }

  updateMenuConfig(data: MenuConfig): Promise<MenuConfig> {
    return apiFetch<MenuConfig>('/api/cms/menu-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // â”€â”€ Image upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async uploadImage(file: File): Promise<{ url: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/cms/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Upload failed');
    }
    return response.json();
  }

  // â”€â”€ Form submission (public) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  submitForm(payload: {
    pageSlug: string;
    blockId: string;
    firestoreCollection: string;
    fields: Record<string, string | number | boolean>;
  }): Promise<{ id: string; success: boolean }> {
    return apiFetch('/api/cms/public/forms/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const cmsService = new CmsService();
