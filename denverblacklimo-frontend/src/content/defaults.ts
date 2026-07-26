/**
 * Central content defaults for the whole site.
 *
 * Every editable section falls back to these values until an admin overrides
 * them in the CMS (stored in the backend `site_settings` table and merged in
 * by SiteSettingsContext). Public pages read content via `useSiteSettings().get(key, fallback)`.
 */
import { services as defaultServices } from '../data/services'
import { fleet as defaultFleet } from '../data/fleet'
import { reviews as defaultReviews } from '../data/reviews'
import { serviceAreas as defaultServiceAreas, homeCoverageList } from '../data/serviceAreas'
import { FOUNDER } from '../constants'

export { defaultServices, defaultFleet, defaultReviews, defaultServiceAreas }

/** Build a `tel:` href from a display phone number. */
export const telHref = (phone: string) => `tel:+1${phone.replace(/[^\d]/g, '')}`
/** Build a `mailto:` href from an email address. */
export const mailHref = (email: string) => `mailto:${email}`

// ── Business / contact info (used in header, footer, contact page, CTAs) ──
export interface BusinessInfo {
  companyName: string
  tagline: string
  phone: string
  email: string
  address: string
  hours: string
  facebook: string
  whatsapp: string
  twitter: string
  founded: string
}

export const DEFAULT_BUSINESS: BusinessInfo = {
  companyName: 'Denver Black Limo LLC',
  tagline: 'Luxury Chauffeured Transportation',
  phone: '(720) 499-6744',
  email: 'denverblacklimo@yahoo.com',
  address: 'Denver, Colorado — serving the Front Range & beyond',
  hours: 'Available 24 hours a day, 7 days a week',
  facebook: 'https://web.facebook.com/p/Denver-Black-Limo-LLC-100087707941139/?_rdc=1&_rdr#',
  whatsapp: '',
  twitter: '',
  founded: 'September 2019',
}

// ── About page content ──
export interface AboutContent {
  eyebrow: string
  title: string
  intro: string
  story: string[]
  mission: string
  vision: string
  founderName: string
  founderTitle: string
  founderQuote: string
  founderImage: string
}

export const DEFAULT_ABOUT: AboutContent = {
  eyebrow: 'About Us',
  title: 'Denver’s Trusted Name in Luxury Transportation',
  intro:
    'Founded in Denver, Colorado, Denver Black Limo LLC delivers premium chauffeured transportation defined by professionalism, reliability, and genuine hospitality.',
  story: [
    'Since our founding, Denver Black Limo has grown into one of the Front Range’s most trusted luxury transportation providers — serving airport travelers, corporate clients, wedding parties, and mountain resort guests.',
    'Every ride reflects our commitment to punctuality, discretion, and white-glove service, backed by a meticulously maintained fleet and professional chauffeurs.',
  ],
  mission:
    'To provide safe, reliable, and elegant transportation that exceeds expectations on every trip — from the airport curb to the mountain summit.',
  vision:
    'To be Colorado’s premier luxury chauffeured transportation company, known for uncompromising service and genuine care for every client.',
  founderName: FOUNDER.name,
  founderTitle: FOUNDER.title,
  founderQuote: FOUNDER.quote,
  founderImage: FOUNDER.image,
}

// ── Home page copy (section headings, CTA, trust badges) ──
export interface TrustBadge {
  label: string
  icon: string
}

export interface HomeContent {
  servicesHeading: string
  servicesSubheading: string
  fleetHeading: string
  fleetSubheading: string
  reviewsHeading: string
  reviewsSubheading: string
  ctaHeading: string
  ctaSubheading: string
  trustBadges: TrustBadge[]
  coverageList: string[]
}

export const DEFAULT_HOME: HomeContent = {
  servicesHeading: 'Our Services',
  servicesSubheading: 'Premium chauffeured transportation for every occasion.',
  fleetHeading: 'Our Luxury Fleet',
  fleetSubheading: 'Immaculate, professionally maintained vehicles for every group size.',
  reviewsHeading: 'What Our Clients Say',
  reviewsSubheading: 'Trusted by travelers, executives, and event planners across Colorado.',
  ctaHeading: 'Ready to Ride in Luxury?',
  ctaSubheading: 'Reserve your premium chauffeured experience today.',
  trustBadges: [
    { label: 'Licensed & Insured', icon: 'shield' },
    { label: '24/7 Availability', icon: 'clock' },
    { label: 'Professional Chauffeurs', icon: 'user' },
    { label: 'Flight Tracking', icon: 'plane' },
  ],
  coverageList: homeCoverageList,
}

// ── CMS registry: keys the admin can edit ──
export const CMS_KEYS = {
  business: 'business',
  home_hero: 'home_hero',
  home: 'home',
  about: 'about',
  services: 'services',
  fleet: 'fleet',
  serviceAreas: 'service_areas',
  reviews: 'reviews',
} as const
