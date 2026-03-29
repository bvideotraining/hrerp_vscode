'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { settingsService, type SystemConfig } from '@/lib/services/settings.service';
import { useAuth } from '@/context/auth-context';

interface SettingsContextType {
  currency: string;          // e.g. 'EGP'
  currencySymbol: string;    // e.g. 'EGP' or '$'
  config: SystemConfig | null;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_CONFIG: SystemConfig = {
  defaultCurrency: 'EGP',
  workingDaysPerWeek: 5,
  weeklyHolidays: ['friday', 'saturday'],
  officialVacations: [],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  EGP: 'EGP',
  SAR: 'SAR',
  AED: 'AED',
  QAR: 'QAR',
  KWD: 'KWD',
  BHD: 'BHD',
  OMR: 'OMR',
  JOD: 'JOD',
  LBP: 'LBP',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

const SettingsContext = createContext<SettingsContextType>({
  currency: 'EGP',
  currencySymbol: 'EGP',
  config: null,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const refreshSettings = useCallback(async () => {
    try {
      const cfg = await settingsService.getConfig();
      setConfig(cfg);
    } catch {
      // keep current state on error
    }
  }, []);

  // Re-fetch settings whenever authentication state resolves with a logged-in user,
  // so currency and other config always reflect what was saved in the settings module.
  useEffect(() => {
    if (!authLoading && user) {
      refreshSettings();
    }
  }, [user, authLoading, refreshSettings]);

  const currency = config?.defaultCurrency ?? DEFAULT_CONFIG.defaultCurrency;
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <SettingsContext.Provider value={{ currency, currencySymbol, config, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
