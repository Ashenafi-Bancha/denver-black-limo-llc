import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getServiceBySlug } from '../data/services'
import { getServiceAreaBySlug } from '../data/serviceAreas'
import { getPostBySlug } from '../data/posts'

/** Production site origin — used for canonical + Open Graph URLs. */
export const SITE_URL = 'https://denverblacklimo.llc'
const BRAND = 'Denver Black Limo LLC'

type Meta = { title: string; description: string }

const ROUTES: Record<string, Meta> = {
  '/': {
    title: `${BRAND} | Luxury Chauffeured Car Service in Denver, CO`,
    description:
      "Denver's premier luxury chauffeured transportation. Airport transfers to DIA, corporate travel, weddings, mountain resort trips, and private aviation. Professional chauffeurs, immaculate black vehicles, available 24/7. Book your ride today.",
  },
  '/services': {
    title: `Luxury Transportation Services | ${BRAND}`,
    description:
      'Explore our Denver luxury transportation services: airport transfers, executive & corporate travel, weddings, mountain resorts, concerts, sporting events, private tours, and group transportation.',
  },
  '/fleet': {
    title: `Our Luxury Fleet — Sedans, SUVs, Sprinters & Limos | ${BRAND}`,
    description:
      'Ride in style with our fleet of black luxury sedans, executive SUVs, Cadillac Escalades, Sprinter vans, stretch limousines, and party buses — maintained to the highest standards.',
  },
  '/service-areas': {
    title: `Service Areas Across Colorado's Front Range | ${BRAND}`,
    description:
      'Luxury chauffeured service across Denver Metro, Boulder, Colorado Springs, Fort Collins, and mountain resorts including Vail, Aspen, and Breckenridge.',
  },
  '/pricing': {
    title: `Pricing & Rates — Transparent Limo Pricing in Denver | ${BRAND}`,
    description:
      'Clear, transparent pricing for Denver luxury transportation. Hourly, point-to-point and airport rates, what is always included, and our booking policies — every quote confirmed before you ride.',
  },
  '/reviews': {
    title: `Client Reviews & Testimonials | ${BRAND}`,
    description:
      'Read reviews from Denver Black Limo clients — airport transfers, corporate travel, weddings and mountain trips across Colorado. Rated five stars for punctuality and professionalism.',
  },
  '/blog': {
    title: `Colorado Travel Guides & Insights | ${BRAND}`,
    description:
      'Practical Denver travel guides from professional chauffeurs — DIA airport pickups, Red Rocks concerts, ski season mountain transfers, and getting around Colorado with ease.',
  },
  '/about': {
    title: `About Denver Black Limo — Colorado's Trusted Chauffeur Service`,
    description:
      "Learn about Denver Black Limo LLC — professional chauffeurs, an immaculate luxury fleet, and 24/7 premium transportation across Colorado's Front Range since 2019.",
  },
  '/contact': {
    title: `Contact Us — Reservations & Quotes 24/7 | ${BRAND}`,
    description:
      'Contact Denver Black Limo LLC for reservations, quotes, and corporate accounts. Call or text (720) 499-6744 — available 24 hours a day, 7 days a week.',
  },
  '/book': {
    title: `Book Your Ride | ${BRAND}`,
    description:
      'Book luxury chauffeured transportation in Denver in under a minute. Airport transfers, weddings, corporate travel, mountain resorts, and special events. Request your personalized quote.',
  },
  '/quote': {
    title: `Request a Quote | ${BRAND}`,
    description:
      'Request a tailored quote for luxury transportation in Denver and across Colorado — airport, corporate, weddings, mountain resorts, and special events.',
  },
}

export function metaFor(pathname: string): Meta {
  const path = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (ROUTES[path]) return ROUTES[path]

  if (path.startsWith('/services/')) {
    const svc = getServiceBySlug(path.split('/')[2])
    if (svc) return { title: `${svc.title} in Denver | ${BRAND}`, description: svc.shortDescription }
  }
  if (path.startsWith('/service-areas/')) {
    const area = getServiceAreaBySlug(path.split('/')[2])
    if (area) return { title: `${area.title} Luxury Car Service | ${BRAND}`, description: area.subtitle }
  }
  if (path.startsWith('/blog/')) {
    const post = getPostBySlug(path.split('/')[2])
    if (post) return { title: `${post.title} | ${BRAND}`, description: post.excerpt }
  }
  return ROUTES['/']
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sets per-route document title, description, canonical, and Open Graph/Twitter
 * tags. Rendered once inside Layout; updates on every navigation.
 */
export function RouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const { title, description } = metaFor(pathname)
    const url = SITE_URL + (pathname === '/' ? '' : pathname)
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertLink('canonical', url)
  }, [pathname])
  return null
}
