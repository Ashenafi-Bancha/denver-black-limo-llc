/**
 * Declarative CMS schema. Each content group maps to one `site_settings` key
 * and describes the fields an admin can edit. The generic CmsManager renders
 * editors from these specs — no bespoke UI per content type.
 */
import {
  DEFAULT_BUSINESS,
  DEFAULT_ABOUT,
  DEFAULT_HOME,
  DEFAULT_PAGE_BANNERS,
  DEFAULT_FAQS,
  defaultServices,
  defaultFleet,
  defaultServiceAreas,
  defaultReviews,
  defaultReviewPlatforms,
  defaultPricing,
  defaultPosts,
} from '../content/defaults'

/**
 * The homepage hero is the brand lockup the client signed off on: logo, the
 * DENVER / BLACK LIMO, LLC wordmark, then this tagline. Only the tagline and
 * the rotating photos are content — the wordmark is the identity, so it is not
 * editable. Headline and description fields used to live here and drove
 * nothing; they were removed rather than left lying about what they did.
 */
export const DEFAULT_HERO = {
  subheadline: 'Luxury Chauffeured Transportation',
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

/**
 * Price estimator rates.
 *
 * Stored under keys beginning `pricing_`, which the public settings endpoint
 * refuses to serve. These values include what each job costs to run, and
 * publishing that would hand a competitor the business's margins.
 */
export const DEFAULT_PRICING_RATES = {marketAdjustment: 0.9, milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100, roundTo: 5, garageAddress: "1361 Court Pl, Denver, CO 80202", garageLat: "39.7439", garageLng: "-104.9925", extraStop: "20", childSeat: "25", extraLuggage: "10", pet: "25", meetAndGreet: "", airportAccessFee: "", lateNightFrom: "00:00", lateNightTo: "05:00", lateNightAmount: "30", taxPercent: "", maxAutoQuoteMiles: 250, maxServiceMiles: 500, minimumNoticeHours: "6"}

export const DEFAULT_PRICING_VEHICLES = [
  {id: "luxury-sedan", name: "Luxury Sedan", hourlyWeekday: 100, hourlyWeekend: 100, minimumHours: 3, startingFare: "45", perMileBandA: "3.25", perMileBandB: "2.60", perMileBandC: "2.10", minimumFare: "85", costFloor: "75", deadheadPerMile: "1.50", deadheadFreeMiles: "50"},
  {id: "luxury-suv", name: "Luxury SUV", hourlyWeekday: 150, hourlyWeekend: 150, minimumHours: 3, startingFare: "65", perMileBandA: "4.25", perMileBandB: "3.40", perMileBandC: "2.75", minimumFare: "120", costFloor: "100", deadheadPerMile: "1.85", deadheadFreeMiles: "50"},
  {id: "executive-suv", name: "Executive SUV", hourlyWeekday: 125, hourlyWeekend: 125, minimumHours: 3, startingFare: "55", perMileBandA: "3.85", perMileBandB: "3.10", perMileBandC: "2.50", minimumFare: "105", costFloor: "90", deadheadPerMile: "1.75", deadheadFreeMiles: "50"},
  {id: "luxury-van", name: "Luxury Van", hourlyWeekday: 250, hourlyWeekend: 250, minimumHours: 3, startingFare: "95", perMileBandA: "6.00", perMileBandB: "4.75", perMileBandC: "3.75", minimumFare: "475", costFloor: "250", deadheadPerMile: "2.50", deadheadFreeMiles: "50"},
  {id: "mini-coach", name: "Mini Coach", hourlyWeekday: 275, hourlyWeekend: 275, minimumHours: 4, startingFare: "120", perMileBandA: "7.00", perMileBandB: "5.50", perMileBandC: "4.25", minimumFare: "695", costFloor: "350", deadheadPerMile: "3.00", deadheadFreeMiles: "50"},
  {id: "limo-bus", name: "Limo Bus", hourlyWeekday: 325, hourlyWeekend: 325, minimumHours: 4, startingFare: "150", perMileBandA: "8.25", perMileBandB: "6.50", perMileBandC: "5.00", minimumFare: "995", costFloor: "500", deadheadPerMile: "3.50", deadheadFreeMiles: "50"},
  {id: "motor-coach", name: "Motor Coach", hourlyWeekday: 425, hourlyWeekend: 425, minimumHours: 4, startingFare: "195", perMileBandA: "10.50", perMileBandB: "8.25", perMileBandC: "6.50", minimumFare: "1395", costFloor: "700", deadheadPerMile: "4.50", deadheadFreeMiles: "50"},
]

export const DEFAULT_PRICING_ZONES = [
  {group: "airport", label: "Denver Airport to Downtown Denver", fromZone: "DIA", toZone: "Downtown Denver", priceLuxurySedan: "95", priceLuxurySUV: "125", priceExecutiveSUV: "115", priceLuxuryVan: "475", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Denver Tech Center", fromZone: "DIA", toZone: "Denver Tech Center", priceLuxurySedan: "105", priceLuxurySUV: "135", priceExecutiveSUV: "125", priceLuxuryVan: "495", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Aurora", fromZone: "DIA", toZone: "Aurora", priceLuxurySedan: "85", priceLuxurySUV: "115", priceExecutiveSUV: "105", priceLuxuryVan: "450", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Boulder", fromZone: "DIA", toZone: "Boulder", priceLuxurySedan: "135", priceLuxurySUV: "170", priceExecutiveSUV: "155", priceLuxuryVan: "675", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Littleton", fromZone: "DIA", toZone: "Littleton", priceLuxurySedan: "120", priceLuxurySUV: "150", priceExecutiveSUV: "140", priceLuxuryVan: "550", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Highlands Ranch", fromZone: "DIA", toZone: "Highlands Ranch", priceLuxurySedan: "120", priceLuxurySUV: "150", priceExecutiveSUV: "140", priceLuxuryVan: "550", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Lakewood", fromZone: "DIA", toZone: "Lakewood", priceLuxurySedan: "115", priceLuxurySUV: "145", priceExecutiveSUV: "135", priceLuxuryVan: "525", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Golden", fromZone: "DIA", toZone: "Golden", priceLuxurySedan: "120", priceLuxurySUV: "150", priceExecutiveSUV: "140", priceLuxuryVan: "540", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Westminster", fromZone: "DIA", toZone: "Westminster", priceLuxurySedan: "110", priceLuxurySUV: "140", priceExecutiveSUV: "130", priceLuxuryVan: "510", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Broomfield", fromZone: "DIA", toZone: "Broomfield", priceLuxurySedan: "115", priceLuxurySUV: "145", priceExecutiveSUV: "135", priceLuxuryVan: "520", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Thornton", fromZone: "DIA", toZone: "Thornton", priceLuxurySedan: "100", priceLuxurySUV: "130", priceExecutiveSUV: "120", priceLuxuryVan: "480", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Castle Rock", fromZone: "DIA", toZone: "Castle Rock", priceLuxurySedan: "145", priceLuxurySUV: "180", priceExecutiveSUV: "165", priceLuxuryVan: "650", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Colorado Springs", fromZone: "DIA", toZone: "Colorado Springs", priceLuxurySedan: "255", priceLuxurySUV: "325", priceExecutiveSUV: "295", priceLuxuryVan: "895", oneWayOnly: ""},
  {group: "airport", label: "Denver Airport to Fort Collins", fromZone: "DIA", toZone: "Fort Collins", priceLuxurySedan: "245", priceLuxurySUV: "315", priceExecutiveSUV: "285", priceLuxuryVan: "875", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Vail", fromZone: "Denver", toZone: "Vail", priceLuxurySedan: "475", priceLuxurySUV: "625", priceExecutiveSUV: "565", priceLuxuryVan: "950", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Beaver Creek", fromZone: "Denver", toZone: "Beaver Creek", priceLuxurySedan: "495", priceLuxurySUV: "645", priceExecutiveSUV: "585", priceLuxuryVan: "975", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Breckenridge", fromZone: "Denver", toZone: "Breckenridge", priceLuxurySedan: "440", priceLuxurySUV: "585", priceExecutiveSUV: "525", priceLuxuryVan: "895", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Keystone", fromZone: "Denver", toZone: "Keystone", priceLuxurySedan: "430", priceLuxurySUV: "575", priceExecutiveSUV: "515", priceLuxuryVan: "875", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Copper Mountain", fromZone: "Denver", toZone: "Copper Mountain", priceLuxurySedan: "415", priceLuxurySUV: "555", priceExecutiveSUV: "495", priceLuxuryVan: "850", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Winter Park", fromZone: "Denver", toZone: "Winter Park", priceLuxurySedan: "400", priceLuxurySUV: "550", priceExecutiveSUV: "495", priceLuxuryVan: "825", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Arapahoe Basin", fromZone: "Denver", toZone: "Arapahoe Basin", priceLuxurySedan: "425", priceLuxurySUV: "570", priceExecutiveSUV: "510", priceLuxuryVan: "865", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Loveland Ski Area", fromZone: "Denver", toZone: "Loveland Ski Area", priceLuxurySedan: "395", priceLuxurySUV: "530", priceExecutiveSUV: "475", priceLuxuryVan: "795", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Aspen", fromZone: "Denver", toZone: "Aspen", priceLuxurySedan: "945", priceLuxurySUV: "1275", priceExecutiveSUV: "1150", priceLuxuryVan: "1750", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Snowmass", fromZone: "Denver", toZone: "Snowmass", priceLuxurySedan: "995", priceLuxurySUV: "1325", priceExecutiveSUV: "1200", priceLuxuryVan: "1800", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Steamboat Springs", fromZone: "Denver", toZone: "Steamboat Springs", priceLuxurySedan: "QUOTE", priceLuxurySUV: "1195", priceExecutiveSUV: "1095", priceLuxuryVan: "1650", oneWayOnly: ""},
  {group: "mountain", label: "Denver to Estes Park", fromZone: "Denver", toZone: "Estes Park", priceLuxurySedan: "325", priceLuxurySUV: "425", priceExecutiveSUV: "385", priceLuxuryVan: "625", oneWayOnly: ""},
]
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
    description:
      'The tagline under the logo and the rotating background photos. The DENVER / BLACK LIMO, LLC wordmark is part of the brand mark and is not editable here.',
    icon: 'image',
    kind: 'singleton',
    default: DEFAULT_HERO,
    fields: [
      { key: 'subheadline', label: 'Tagline (under the logo)', type: 'text', full: true },
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
    key: 'page_banners',
    title: 'Page Banners',
    description:
      'The photo and heading across the top of the Services, Fleet and Service Areas pages.',
    icon: 'image',
    kind: 'singleton',
    default: DEFAULT_PAGE_BANNERS,
    fields: [
      { key: 'servicesImage', label: 'Services — Banner Photo', type: 'image', full: true },
      { key: 'servicesEyebrow', label: 'Services — Small Label Above Title', type: 'text' },
      { key: 'servicesTitle', label: 'Services — Title', type: 'text' },
      { key: 'servicesSubtitle', label: 'Services — Subtitle', type: 'textarea', full: true },
      { key: 'fleetImage', label: 'Fleet — Banner Photo', type: 'image', full: true },
      { key: 'fleetEyebrow', label: 'Fleet — Small Label Above Title', type: 'text' },
      { key: 'fleetTitle', label: 'Fleet — Title (white line)', type: 'text' },
      { key: 'fleetTitleAccent', label: 'Fleet — Title (gold line)', type: 'text' },
      { key: 'fleetIntro', label: 'Fleet — Intro Paragraphs (blank line between each)', type: 'textarea', full: true },
      { key: 'serviceAreasImage', label: 'Service Areas — Banner Photo', type: 'image', full: true },
      { key: 'serviceAreasEyebrow', label: 'Service Areas — Small Label Above Title', type: 'text' },
      { key: 'serviceAreasTitle', label: 'Service Areas — Title', type: 'text' },
      { key: 'serviceAreasSubtitle', label: 'Service Areas — Subtitle', type: 'textarea', full: true },
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
      { key: 'ratesFeesNote', label: 'Small Note Under Each Homepage Price', type: 'text', placeholder: 'e.g. plus fees & gratuity', full: true },
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
    key: 'pricing_rates',
    title: 'Estimator — Global Settings',
    description:
      'The levers that apply to every quote: how far the mileage bands reach, your garage, extras, fees and the limits past which the site stops quoting. Only you can see these.',
    icon: 'file-text',
    kind: 'singleton',
    default: DEFAULT_PRICING_RATES,
    fields: [
      { key: 'marketAdjustment', label: 'Price Adjustment (1 = normal, 0.9 = 10% cheaper)', type: 'number', full: true },
      { key: 'garageAddress', label: 'Garage Address (empty miles are measured from here)', type: 'text', full: true },
      { key: 'garageLat', label: 'Garage Latitude', type: 'text', placeholder: 'e.g. 39.7392' },
      { key: 'garageLng', label: 'Garage Longitude', type: 'text', placeholder: 'e.g. -104.9903' },
      { key: 'milesIncluded', label: 'Miles Included In Starting Fare', type: 'number' },
      { key: 'bandAEndsAt', label: 'Band A Ends At Mile', type: 'number' },
      { key: 'bandBEndsAt', label: 'Band B Ends At Mile', type: 'number' },
      { key: 'roundTo', label: 'Round Prices To Nearest', type: 'number' },
      { key: 'extraStop', label: 'Each Extra Stop', type: 'text' },
      { key: 'childSeat', label: 'Child Seat', type: 'text' },
      { key: 'extraLuggage', label: 'Extra Luggage', type: 'text' },
      { key: 'pet', label: 'Pet', type: 'text' },
      { key: 'meetAndGreet', label: 'Meet And Greet', type: 'text' },
      { key: 'airportAccessFee', label: 'Airport Access Fee', type: 'text' },
      { key: 'lateNightFrom', label: 'Late Night From', type: 'text', placeholder: '00:00' },
      { key: 'lateNightTo', label: 'Late Night To', type: 'text', placeholder: '05:00' },
      { key: 'lateNightAmount', label: 'Late Night Charge', type: 'text' },
      { key: 'taxPercent', label: 'Tax Percent (blank = none)', type: 'text' },
      { key: 'maxAutoQuoteMiles', label: 'Stop Quoting Beyond (miles)', type: 'number' },
      { key: 'maxServiceMiles', label: 'Will Not Travel Beyond (miles)', type: 'number' },
      { key: 'minimumNoticeHours', label: 'Least Notice For An Instant Price (hours)', type: 'text' },
    ],
  },
  {
    key: 'pricing_vehicles',
    title: 'Estimator — Vehicle Rates',
    description:
      'What each vehicle costs. The cost floor is what the job costs you to run: no discount is ever allowed below it. Only you can see these.',
    icon: 'car',
    kind: 'collection',
    itemTitleKey: 'name',
    default: DEFAULT_PRICING_VEHICLES,
    fields: [
      { key: 'id', label: 'Vehicle ID (must match the Fleet entry)', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'hourlyWeekday', label: 'Hourly Rate, Weekday', type: 'text' },
      { key: 'hourlyWeekend', label: 'Hourly Rate, Weekend', type: 'text' },
      { key: 'minimumHours', label: 'Minimum Hours', type: 'text' },
      { key: 'startingFare', label: 'Starting Fare', type: 'text' },
      { key: 'perMileBandA', label: 'Per Mile, Band A', type: 'text' },
      { key: 'perMileBandB', label: 'Per Mile, Band B', type: 'text' },
      { key: 'perMileBandC', label: 'Per Mile, Band C', type: 'text' },
      { key: 'minimumFare', label: 'Minimum Fare', type: 'text' },
      { key: 'costFloor', label: 'Cost Floor (never quote below this)', type: 'text' },
      { key: 'deadheadPerMile', label: 'Empty Miles, Per Mile', type: 'text' },
      { key: 'deadheadFreeMiles', label: 'Empty Miles Included Free', type: 'text' },
    ],
  },
  {
    key: 'pricing_zones',
    title: 'Estimator — Fixed Route Prices',
    description:
      'Set prices for the routes you quote most, such as the airport and the resorts. These beat the per-mile calculation. Type QUOTE in any box you would rather price by phone. Only you can see these.',
    icon: 'map',
    kind: 'collection',
    itemTitleKey: 'label',
    default: DEFAULT_PRICING_ZONES,
    fields: [
      { key: 'label', label: 'Shown To The Customer', type: 'text', full: true },
      { key: 'group', label: 'Type (airport or mountain)', type: 'text' },
      { key: 'fromZone', label: 'From', type: 'text' },
      { key: 'toZone', label: 'To', type: 'text' },
      { key: 'priceLuxurySedan', label: 'Luxury Sedan', type: 'text' },
      { key: 'priceLuxurySUV', label: 'Luxury SUV', type: 'text' },
      { key: 'priceExecutiveSUV', label: 'Executive SUV', type: 'text' },
      { key: 'priceLuxuryVan', label: 'Luxury Van', type: 'text' },
      { key: 'oneWayOnly', label: 'One Way Only? (yes = do not use in reverse)', type: 'text', full: true },
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
