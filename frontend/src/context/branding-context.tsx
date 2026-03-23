'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { organizationService, Branding } from '@/lib/services/organization.service';

interface BrandingContextType {
  appName: string;
  logoUrl: string;
  updateBranding: (data: Branding) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  appName: 'HR ERP',
  logoUrl: '',
  updateBranding: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState('HR ERP');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    // Load from localStorage first for instant display
    try {
      const cached = localStorage.getItem('appBranding');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.appName) setAppName(parsed.appName);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch {
      // ignore parse errors
    }

    // Then fetch fresh from backend
    const token = localStorage.getItem('jwtToken');
    if (token) {
      organizationService.getBranding()
        .then((data) => {
          if (data.appName) setAppName(data.appName);
          if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl || '');
          localStorage.setItem('appBranding', JSON.stringify(data));
        })
        .catch(() => {
          // silently fail — use cached values
        });
    }
  }, []);

  const updateBranding = async (data: Branding) => {
    await organizationService.updateBranding(data);
    setAppName(data.appName);
    setLogoUrl(data.logoUrl || '');
    localStorage.setItem('appBranding', JSON.stringify(data));
  };

  return (
    <BrandingContext.Provider value={{ appName, logoUrl, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
