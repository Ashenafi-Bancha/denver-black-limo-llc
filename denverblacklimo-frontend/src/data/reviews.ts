export type Review = {
  name: string
  quote: string
  avatar: string
  /** 1–5; defaults to 5 when omitted */
  rating?: number
  /** Where the review came from, e.g. "Google" */
  source?: string
  /** Which service it relates to, e.g. "Airport Transportation" */
  service?: string
}

export const reviews: Review[] = [
  {
    name: 'Josh M.',
    quote:
      'Flawless airport pickup at DIA. The chauffeur tracked our flight, helped with luggage, and the Escalade was immaculate. This is how luxury transportation should feel.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    rating: 5,
    source: 'Google',
    service: 'Airport Transportation',
  },
  {
    name: 'Sarah T.',
    quote:
      'We used Denver Black Limo for our wedding party and corporate guests. Professional, on time, and discreet. The gold-standard service matched our event perfectly.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
    rating: 5,
    source: 'Google',
    service: 'Wedding Transportation',
  },
  {
    name: 'Michael R.',
    quote:
      'Hourly chauffeur for a full day of meetings across Denver and Boulder — flexible, courteous, and always ahead of schedule. Already set up a corporate account.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face',
    rating: 5,
    source: 'Google',
    service: 'Executive & Corporate',
  },
]

/**
 * Where customers can read and leave reviews. Entries with a blank `url` are
 * hidden automatically, so the admin can add profiles as they are created.
 */
export type ReviewPlatform = {
  name: string
  url: string
  blurb: string
  icon: string
}

/** Google Business Profile "write a review" link — used by the CTA and the platform card. */
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CTb7bGnryiUrEAE/review'

export const reviewPlatforms: ReviewPlatform[] = [
  { name: 'Google', url: 'https://g.page/r/CTb7bGnryiUrEAE/review', blurb: 'Read and leave a Google review', icon: 'star' },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61592643747921',
    blurb: 'Follow us and see recommendations',
    icon: 'users',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/denverblacklimo.llc',
    blurb: 'Photos from recent rides and events',
    icon: 'camera',
  },
  { name: 'Yelp', url: '', blurb: 'Reviews from Denver travelers', icon: 'star' },
  { name: 'The Knot', url: '', blurb: 'Wedding transportation reviews', icon: 'heart' },
  { name: 'WeddingWire', url: '', blurb: 'Trusted by couples across Colorado', icon: 'heart' },
]
