import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getServiceBySlug } from '../data/services'
import { getServiceAreaBySlug } from '../data/serviceAreas'
import { getPostBySlug } from '../data/posts'
import { DEFAULT_FAQS } from '../content/defaults'

/** Production site origin — used for canonical + Open Graph URLs. */
export const SITE_URL = 'https://denverblacklimo.llc'
const BRAND = 'Denver Black Limo LLC'

type Meta = { title: string; description: string; notFound?: boolean }

/**
 * Static hosting answers every unknown URL with this app and a 200, which
 * search engines read as endless copies of the homepage (soft 404s). Marking
 * the rendered page noindex is the strongest correction the page itself can
 * make; the DO error_document setting turns the status code into a real 404.
 */
const NOT_FOUND: Meta = {
  title: `Page Not Found | ${BRAND}`,
  description: 'The page you are looking for does not exist. Explore our luxury chauffeured transportation services in Denver, Colorado.',
  notFound: true,
}

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
  '/terms': {
    title: `Reservation Terms & Conditions | ${BRAND}`,
    description:
      'Denver Black Limo LLC reservation agreement: payment and deposit schedule, cancellation policy, airport pick-up procedures at DEN, wait time, damage and conduct policies.',
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
  return NOT_FOUND
}

/**
 * Extra structured data for a route, on top of the LimousineService block that
 * sits in index.html on every page.
 *
 * That one block describes the business and is identical everywhere, so it
 * tells a search engine nothing about which page it is looking at. These
 * describe the page itself, and all point back at the business with @id so the
 * two form one graph rather than two unrelated claims.
 */
const BUSINESS_ID = `${SITE_URL}/#business`

type Json = Record<string, unknown>

function breadcrumbs(trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: SITE_URL + step.path,
    })),
  }
}

export function schemaFor(pathname: string): Json[] {
  const path = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const out: Json[] = []
  const home = { name: 'Home', path: '/' }

  if (path.startsWith('/services/')) {
    const svc = getServiceBySlug(path.split('/')[2])
    if (svc) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: svc.title,
        serviceType: svc.title,
        description: svc.shortDescription,
        url: SITE_URL + path,
        provider: { '@id': BUSINESS_ID },
        areaServed: { '@type': 'State', name: 'Colorado' },
      })
      out.push(breadcrumbs([home, { name: 'Services', path: '/services' }, { name: svc.title, path }]))
    }
  } else if (path.startsWith('/service-areas/')) {
    const area = getServiceAreaBySlug(path.split('/')[2])
    if (area) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `Luxury Car Service in ${area.title}`,
        description: area.subtitle,
        url: SITE_URL + path,
        provider: { '@id': BUSINESS_ID },
        // The whole point of these pages: which places we actually cover.
        areaServed: [
          { '@type': 'Place', name: area.title },
          ...area.coverageAreas.slice(0, 12).map((c) => ({ '@type': 'Place', name: c })),
        ],
      })
      out.push(breadcrumbs([home, { name: 'Service Areas', path: '/service-areas' }, { name: area.title, path }]))
    }
  } else if (path.startsWith('/blog/')) {
    const post = getPostBySlug(path.split('/')[2])
    if (post) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        url: SITE_URL + path,
        author: { '@id': BUSINESS_ID },
        publisher: { '@id': BUSINESS_ID },
      })
      out.push(breadcrumbs([home, { name: 'Travel Blog', path: '/blog' }, { name: post.title, path }]))
    }
  } else if (path === '/contact') {
    // Google restricted FAQ rich results to a narrow set of sites, so this is
    // unlikely to add dropdowns under the listing. It is still the clearest way
    // to state a question and its answer, which is what answer engines read.
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: DEFAULT_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
    out.push(breadcrumbs([home, { name: 'Contact', path: '/contact' }]))
  } else if (path !== '/' && ROUTES[path]) {
    const name = ROUTES[path].title.split('|')[0].split('—')[0].trim()
    out.push(breadcrumbs([home, { name, path }]))
  }

  return out
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
    const { title, description, notFound } = metaFor(pathname)
    const url = SITE_URL + (pathname === '/' ? '' : pathname)
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    // A missing page must not present itself as an indexable copy of the
    // homepage: noindex it and drop the canonical, which would otherwise
    // vouch for a URL that does not exist.
    upsertMeta('name', 'robots', notFound ? 'noindex, follow' : 'index, follow, max-image-preview:large')
    if (notFound) {
      document.head.querySelector('link[rel="canonical"]')?.remove()
    } else {
      upsertLink('canonical', url)
    }
  }, [pathname])
  return null
}
