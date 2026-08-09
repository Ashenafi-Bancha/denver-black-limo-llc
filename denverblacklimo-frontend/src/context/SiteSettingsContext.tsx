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

/**
 * Fields that address a record rather than describe it. A stray space typed
 * into one of these in the admin is invisible on screen but breaks every URL
 * built from it — a saved `"denver-metro "` stops /service-areas/denver-metro
 * resolving at all. Admin input is normalised once here, at the boundary,
 * rather than defensively at each of the dozen places that compare a slug.
 */
const IDENTIFIER_FIELDS = ['slug', 'id'];

function normalizeIdentifiers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeIdentifiers);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const field of IDENTIFIER_FIELDS) {
      if (typeof out[field] === 'string') out[field] = (out[field] as string).trim();
    }
    for (const [k, v] of Object.entries(out)) {
      if (v && typeof v === 'object') out[k] = normalizeIdentifiers(v);
    }
    return out;
  }
  return value;
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = normalizeIdentifiers(await res.json()) as SettingsMap;
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
