import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Default hero settings if the API is down. Mirrors DEFAULT_HERO in the CMS
// schema — only the tagline and the photos are content; the wordmark is fixed.
const defaultHeroSettings = {
  subheadline: "Luxury Chauffeured Transportation",
  images: [
    "/images/hero/hero-1.jpeg",
    "/images/hero/hero-2.jpeg",
    "/images/hero/hero-3.jpeg",
    "/images/hero/hero-4.jpeg",
    "/images/hero/hero-5.jpeg",
    "/images/hero/hero-6.jpeg",
    "/images/hero/hero-7.jpeg",
    "/images/hero/hero-8.jpeg"
  ]
};

export type HeroSettings = typeof defaultHeroSettings;

// The settings map is an open bag of CMS-editable keys. `home_hero` is always present.
type SettingsMap = Record<string, unknown> & { home_hero: HeroSettings };

interface SiteSettingsContextType {
  settings: SettingsMap;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  /** Read a CMS key, falling back to a default when the admin hasn't set it. */
  get: <T>(key: string, fallback: T) => T;
}

const initialSettings: SettingsMap = { home_hero: defaultHeroSettings };

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: initialSettings,
  isLoading: true,
  refreshSettings: async () => {},
  get: (_key, fallback) => fallback,
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        // Keep all fetched keys; ensure home_hero always has its defaults merged in.
        setSettings({ ...data, home_hero: { ...defaultHeroSettings, ...(data.home_hero || {}) } });
      }
    } catch (err) {
      console.error("Failed to fetch site settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const get = useCallback(
    <T,>(key: string, fallback: T): T => {
      const value = settings[key];
      return value === undefined || value === null ? fallback : (value as T);
    },
    [settings]
  );

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings, get }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
