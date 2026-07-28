/**
 * Declarative CMS schema. Each content group maps to one `site_settings` key
 * and describes the fields an admin can edit. The generic CmsManager renders
 * editors from these specs — no bespoke UI per content type.
 */
import {
  DEFAULT_BUSINESS,
  DEFAULT_ABOUT,
  DEFAULT_HOME,
  defaultServices,
  defaultFleet,
  defaultServiceAreas,
  defaultReviews,
} from '../content/defaults'

export const DEFAULT_HERO = {
  headline: "Denver's Premier",
  subheadline: 'Luxury Chauffeured Transportation',
  description:
    "Luxury chauffeured transportation across Colorado — from DIA and boardrooms to Vail and beyond. Immaculate vehicles, professional chauffeurs, available around the clock.",
  images: [
    '/images/hero/hero-1.jpeg',
    '/images/hero/hero-2.jpeg',
    '/images/hero/hero-3.jpeg',
    '/images/hero/hero-4.jpeg',
    '/images/hero/hero-5.jpeg',
    '/images/hero/hero-6.jpeg',
    '/images/hero/hero-7.jpeg',
    '/images/hero/hero-8.jpeg',
  ],
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'image'
  | 'stringList'
  | 'imageList'
  | 'objectList'

export interface FieldSpec {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  /** For objectList: the schema of each item. */
  itemFields?: FieldSpec[]
  /** For objectList: which item field to use as the row title. */
  itemTitleKey?: string
  full?: boolean // span full width in the grid
}

export interface ContentGroup {
  key: string
  title: string
  description: string
  icon: string // lucide icon name handled in the manager
  kind: 'singleton' | 'collection'
  fields: FieldSpec[]
  itemTitleKey?: string // collection: which field titles each row
  itemImageKey?: string // collection: which field is the thumbnail
  default: unknown
}

const TRUST_ICON_FIELDS: FieldSpec[] = [
  { key: 'label', label: 'Label', type: 'text' },
  { key: 'icon', label: 'Icon name', type: 'text', placeholder: 'e.g. shield, clock, plane' },
]

const SUBSERVICE_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'icon', label: 'Icon name', type: 'text' },
]

const OFFER_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'icon', label: 'Icon name', type: 'text' },
]

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    key: 'business',
    title: 'Business & Contact Info',
    description: 'Company name, phone, email, address, hours and social links (used site-wide).',
    icon: 'building',
    kind: 'singleton',
    default: DEFAULT_BUSINESS,
    fields: [
      { key: 'companyName', label: 'Company Name', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'address', label: 'Service Area / Address', type: 'text', full: true },
      { key: 'hours', label: 'Service Hours', type: 'text', full: true },
      { key: 'facebook', label: 'Facebook URL', type: 'text', full: true },
      { key: 'whatsapp', label: 'WhatsApp (number/URL)', type: 'text' },
      { key: 'twitter', label: 'X / Twitter URL', type: 'text' },
      { key: 'founded', label: 'Founded', type: 'text' },
    ],
  },
  {
    key: 'home_hero',
    title: 'Home — Hero Section',
    description: 'The main headline, subheadline, description and rotating background images.',
    icon: 'image',
    kind: 'singleton',
    default: DEFAULT_HERO,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', full: true },
      { key: 'subheadline', label: 'Sub-headline', type: 'text', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'images', label: 'Background Images', type: 'imageList', full: true },
    ],
  },
  {
    key: 'home',
    title: 'Home — Sections & Badges',
    description: 'Section headings, call-to-action copy, trust badges and coverage list.',
    icon: 'layout',
    kind: 'singleton',
    default: DEFAULT_HOME,
    fields: [
      { key: 'servicesHeading', label: 'Services Heading', type: 'text' },
      { key: 'servicesSubheading', label: 'Services Subheading', type: 'text' },
      { key: 'fleetHeading', label: 'Fleet Heading', type: 'text' },
      { key: 'fleetSubheading', label: 'Fleet Subheading', type: 'text' },
      { key: 'reviewsHeading', label: 'Reviews Heading', type: 'text' },
      { key: 'reviewsSubheading', label: 'Reviews Subheading', type: 'text' },
      { key: 'ctaHeading', label: 'CTA Heading', type: 'text' },
      { key: 'ctaSubheading', label: 'CTA Subheading', type: 'text' },
      { key: 'trustBadges', label: 'Trust Badges', type: 'objectList', itemFields: TRUST_ICON_FIELDS, itemTitleKey: 'label', full: true },
      { key: 'coverageList', label: 'Coverage List', type: 'stringList', full: true },
    ],
  },
  {
    key: 'about',
    title: 'About Page',
    description: 'The About page top image, plus the founder photo, name, title & quote.',
    icon: 'info',
    kind: 'singleton',
    default: DEFAULT_ABOUT,
    fields: [
      { key: 'heroImage', label: 'Top / Hero Image', type: 'image', full: true },
      { key: 'founderImage', label: 'Founder Photo', type: 'image', full: true },
      { key: 'founderName', label: 'Founder Name', type: 'text' },
      { key: 'founderTitle', label: 'Founder Title', type: 'text' },
      { key: 'founderQuote', label: 'Founder Quote', type: 'textarea', full: true },
    ],
  },
  {
    key: 'services',
    title: 'Services',
    description: 'The transportation service categories, descriptions and sub-services.',
    icon: 'briefcase',
    kind: 'collection',
    itemTitleKey: 'title',
    itemImageKey: 'heroImage',
    default: defaultServices,
    fields: [
      { key: 'number', label: 'Order #', type: 'number' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'slug', label: 'Slug (URL)', type: 'text' },
      { key: 'shortDescription', label: 'Short Description', type: 'textarea', full: true },
      { key: 'heroImage', label: 'Hero Image', type: 'image', full: true },
      { key: 'intro', label: 'Intro', type: 'textarea', full: true },
      { key: 'trustIcons', label: 'Trust Icons', type: 'objectList', itemFields: TRUST_ICON_FIELDS, itemTitleKey: 'label', full: true },
      { key: 'subServices', label: 'Sub-Services', type: 'objectList', itemFields: SUBSERVICE_FIELDS, itemTitleKey: 'title', full: true },
    ],
  },
  {
    key: 'fleet',
    title: 'Fleet',
    description: 'Vehicles shown on the Fleet page — names, capacity, descriptions and photos.',
    icon: 'car',
    kind: 'collection',
    itemTitleKey: 'name',
    itemImageKey: 'image',
    default: defaultFleet,
    fields: [
      { key: 'id', label: 'ID (slug)', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'image', label: 'Image', type: 'image', full: true },
    ],
  },
  {
    key: 'service_areas',
    title: 'Service Areas',
    description: 'Geographic regions served, coverage lists, and area offers.',
    icon: 'map',
    kind: 'collection',
    itemTitleKey: 'title',
    itemImageKey: 'heroImage',
    default: defaultServiceAreas,
    fields: [
      { key: 'number', label: 'Order #', type: 'number' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'slug', label: 'Slug (URL)', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text', full: true },
      { key: 'heroImage', label: 'Hero Image', type: 'image', full: true },
      { key: 'intro', label: 'Intro', type: 'textarea', full: true },
      { key: 'coverageAreas', label: 'Coverage Areas', type: 'stringList', full: true },
      { key: 'mapImage', label: 'Map Image', type: 'image', full: true },
      { key: 'offers', label: 'Offers', type: 'objectList', itemFields: OFFER_FIELDS, itemTitleKey: 'title', full: true },
    ],
  },
  {
    key: 'reviews',
    title: 'Customer Reviews',
    description: 'Testimonials shown across the site.',
    icon: 'star',
    kind: 'collection',
    itemTitleKey: 'name',
    itemImageKey: 'avatar',
    default: defaultReviews,
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'quote', label: 'Quote', type: 'textarea', full: true },
      { key: 'avatar', label: 'Avatar Image', type: 'image', full: true },
    ],
  },
]

/** Build a blank item object from a set of field specs. */
export function blankFromFields(fields: FieldSpec[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.type === 'number') obj[f.key] = 0
    else if (f.type === 'stringList' || f.type === 'imageList' || f.type === 'objectList') obj[f.key] = []
    else obj[f.key] = ''
  }
  return obj
}
