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
    // Always fetch branding from database — no local cache
    organizationService.getBranding()
      .then((data) => {
        if (data.appName) setAppName(data.appName);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl || '');
      })
      .catch(() => {
        // silently fail — keep defaults
      });
  }, []);

  const updateBranding = async (data: Branding) => {
    await organizationService.updateBranding(data);
    setAppName(data.appName);
    setLogoUrl(data.logoUrl || '');
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
