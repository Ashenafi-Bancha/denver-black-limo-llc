/**
 * Declarative CMS schema. Each content group maps to one `site_settings` key
 * and describes the fields an admin can edit. The generic CmsManager renders
 * editors from these specs — no bespoke UI per content type.
 */
import {
  DEFAULT_BUSINESS,
  DEFAULT_ABOUT,
  DEFAULT_HOME,
  DEFAULT_FAQS,
  defaultServices,
  defaultFleet,
  defaultServiceAreas,
  defaultReviews,
  defaultReviewPlatforms,
  defaultPricing,
  defaultPosts,
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

const PRICING_ITEM_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'text', label: 'Description', type: 'textarea' },
  { key: 'icon', label: 'Icon name', type: 'text', placeholder: 'e.g. clock, shield, plane' },
]

const RATE_FIELDS: FieldSpec[] = [
  { key: 'vehicle', label: 'Vehicle', type: 'text' },
  { key: 'capacity', label: 'Capacity', type: 'text' },
  { key: 'hourlyRate', label: 'Hourly Rate (number only)', type: 'text', placeholder: 'e.g. 125 — blank shows "Request Quote"' },
  { key: 'minimumHours', label: 'Minimum', type: 'text', placeholder: 'e.g. 2 hours' },
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
      { key: 'instagram', label: 'Instagram URL', type: 'text', full: true },
      { key: 'whatsapp', label: 'WhatsApp (number/URL)', type: 'text' },
      { key: 'twitter', label: 'X / Twitter URL', type: 'text' },
      { key: 'founded', label: 'Founded', type: 'text' },
      { key: 'tawkId', label: 'Tawk.to Live Chat ID', type: 'text', placeholder: 'propertyId/widgetId — e.g. 688a1b2c3d4e5f/1j0abcdef', full: true },
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
      { key: 'number', label: 'Order #', type: 'number' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'passengers', label: 'Passengers', type: 'text', placeholder: 'e.g. 6 or Up to 28' },
      { key: 'luggage', label: 'Luggage', type: 'text', placeholder: 'e.g. 6, Varies' },
      { key: 'bestFor', label: 'Best For (comma-separated)', type: 'text', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'image', label: 'Image', type: 'image', full: true },
    ],
  },
  {
    key: 'pricing',
    title: 'Pricing Page',
    description: 'Rates, what is included, and booking policies shown on the Pricing page.',
    icon: 'file-text',
    kind: 'singleton',
    default: defaultPricing,
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text', full: true },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', full: true },
      { key: 'intro', label: 'Intro Paragraph', type: 'textarea', full: true },
      { key: 'currency', label: 'Currency Symbol', type: 'text' },
      { key: 'ratesTitle', label: 'Rates Section Title', type: 'text' },
      { key: 'ratesNote', label: 'Rates Note', type: 'textarea', full: true },
      { key: 'rates', label: 'Vehicle Rates', type: 'objectList', itemFields: RATE_FIELDS, itemTitleKey: 'vehicle', full: true },
      { key: 'includedTitle', label: 'Included Section Title', type: 'text' },
      { key: 'included', label: 'Always Included', type: 'objectList', itemFields: PRICING_ITEM_FIELDS, itemTitleKey: 'title', full: true },
      { key: 'models', label: 'How Pricing Works', type: 'objectList', itemFields: PRICING_ITEM_FIELDS, itemTitleKey: 'title', full: true },
      { key: 'policiesTitle', label: 'Policies Section Title', type: 'text' },
      { key: 'policies', label: 'Booking Policies', type: 'objectList', itemFields: PRICING_ITEM_FIELDS, itemTitleKey: 'title', full: true },
      { key: 'disclaimer', label: 'Disclaimer', type: 'textarea', full: true },
    ],
  },
  {
    key: 'review_platforms',
    title: 'Review Platforms',
    description: 'Links shown on the Reviews page. Leave a URL blank to hide that platform.',
    icon: 'star',
    kind: 'collection',
    itemTitleKey: 'name',
    default: defaultReviewPlatforms,
    fields: [
      { key: 'name', label: 'Platform Name', type: 'text' },
      { key: 'url', label: 'Profile URL', type: 'text', full: true },
      { key: 'blurb', label: 'Short Description', type: 'text', full: true },
      { key: 'icon', label: 'Icon name', type: 'text', placeholder: 'e.g. star, users, heart' },
    ],
  },
  {
    key: 'posts',
    title: 'Blog Posts',
    description: 'Articles on the Travel Blog. Use "## " for headings and "- " for bullet points.',
    icon: 'file-text',
    kind: 'collection',
    itemTitleKey: 'title',
    itemImageKey: 'image',
    default: defaultPosts,
    fields: [
      { key: 'title', label: 'Title', type: 'text', full: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text' },
      { key: 'tag', label: 'Category', type: 'text' },
      { key: 'date', label: 'Date', type: 'text' },
      { key: 'readMinutes', label: 'Read Time (minutes)', type: 'number' },
      { key: 'image', label: 'Cover Image', type: 'image', full: true },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea', full: true },
      { key: 'content', label: 'Article Content', type: 'textarea', full: true },
    ],
  },
  {
    key: 'faqs',
    title: 'FAQs',
    description: 'Frequently asked questions shown on the Contact page.',
    icon: 'info',
    kind: 'collection',
    itemTitleKey: 'question',
    default: DEFAULT_FAQS,
    fields: [
      { key: 'question', label: 'Question', type: 'text', full: true },
      { key: 'answer', label: 'Answer', type: 'textarea', full: true },
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
