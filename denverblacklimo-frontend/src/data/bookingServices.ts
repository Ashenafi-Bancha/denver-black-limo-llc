import { SERVICE_TYPES } from '../constants'

/**
 * Each transportation service renders a tailored set of Trip-Details fields.
 * `layout` selects which field module the booking form shows; the rest of the
 * form (customer info, passengers, special requests, summary) is shared.
 */
export type ServiceLayout =
  | 'airport' // arrival/departure, airline search, flight #, auto meet & greet
  | 'fbo' // FBO terminal, flight type, aircraft, tail #, auto meet & greet
  | 'pointToPoint' // simple pickup → dropoff (executive, group)
  | 'hourly' // as-directed: date, start time, duration, service area, multi-stop
  | 'mountain' // pickup type (airport/hotel/residence) + resort dropoff + return
  | 'wedding' // multi-stop wedding-day itinerary timeline
  | 'event' // concert / sporting: venue + event date/time + post-event return
  | 'nightlife' // bachelor/bachelorette: hourly as-directed itinerary

export interface ServiceConfig {
  /** Matches an entry in SERVICE_TYPES exactly. */
  name: string
  /** Matches the service slug — used for /images/services/<slug>.jpeg. */
  slug: string
  /** Position in the numbered dropdown (1-based). */
  number: number
  layout: ServiceLayout
  /** Default vehicle category name (from VEHICLE_CATEGORIES). */
  defaultVehicle: string
  /** Summary-sidebar fallback image when no vehicle image applies. */
  summaryImage: string
  /** Whether a "Company Name" field appears in Customer Information. */
  showCompany?: boolean
}

const IMG = {
  airport:
    'https://images.unsplash.com/photo-1617469748971-a8b3473de016?auto=format&fit=crop&w=1200&q=80',
  aviation:
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80',
  corporate:
    'https://images.unsplash.com/photo-1614026480421-a855205734b4?auto=format&fit=crop&w=1200&q=80',
  hourly:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
  mountain:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  wedding:
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80',
  concert:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  bachelor:
    'https://images.unsplash.com/photo-1530103862676-de8c92517b2f?auto=format&fit=crop&w=1200&q=80',
  city:
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
  brewery:
    'https://images.unsplash.com/photo-1510812431400-574770395818?auto=format&fit=crop&w=1200&q=80',
  group:
    'https://images.unsplash.com/photo-1599493343694-83a479294734?auto=format&fit=crop&w=1200&q=80',
}

export const SERVICE_CONFIGS: ServiceConfig[] = [
  { name: SERVICE_TYPES[0], slug: 'airport-transportation', number: 1, layout: 'airport', defaultVehicle: 'Cadillac Escalade ESV', summaryImage: IMG.airport },
  { name: SERVICE_TYPES[1], slug: 'private-aviation-fbo', number: 2, layout: 'fbo', defaultVehicle: 'Cadillac Escalade ESV', summaryImage: IMG.aviation },
  { name: SERVICE_TYPES[2], slug: 'executive-corporate', number: 3, layout: 'pointToPoint', defaultVehicle: 'Cadillac Escalade ESV', summaryImage: IMG.corporate, showCompany: true },
  { name: SERVICE_TYPES[3], slug: 'hourly-chauffeur', number: 4, layout: 'hourly', defaultVehicle: 'Luxury SUV', summaryImage: IMG.hourly, showCompany: true },
  { name: SERVICE_TYPES[4], slug: 'mountain-resort', number: 5, layout: 'mountain', defaultVehicle: 'Luxury SUV', summaryImage: IMG.mountain },
  { name: SERVICE_TYPES[5], slug: 'wedding-transportation', number: 6, layout: 'wedding', defaultVehicle: 'Sprinter Van', summaryImage: IMG.wedding },
  { name: SERVICE_TYPES[6], slug: 'concert-red-rocks', number: 7, layout: 'event', defaultVehicle: 'Luxury SUV', summaryImage: IMG.concert },
  { name: SERVICE_TYPES[7], slug: 'sporting-events', number: 8, layout: 'event', defaultVehicle: 'Luxury SUV', summaryImage: IMG.concert },
  { name: SERVICE_TYPES[8], slug: 'bachelor-bachelorette', number: 9, layout: 'nightlife', defaultVehicle: 'Party Bus', summaryImage: IMG.bachelor },
  { name: SERVICE_TYPES[9], slug: 'private-city-tours', number: 10, layout: 'hourly', defaultVehicle: 'Luxury SUV', summaryImage: IMG.city },
  { name: SERVICE_TYPES[10], slug: 'brewery-winery-whiskey', number: 11, layout: 'hourly', defaultVehicle: 'Sprinter Van', summaryImage: IMG.brewery },
  { name: SERVICE_TYPES[11], slug: 'group-transportation', number: 12, layout: 'pointToPoint', defaultVehicle: 'Sprinter Van', summaryImage: IMG.group, showCompany: true },
]

export function getServiceConfig(name: string): ServiceConfig {
  return SERVICE_CONFIGS.find((s) => s.name === name) ?? SERVICE_CONFIGS[0]
}

/** For the numbered dropdown labels, e.g. "1. Airport Transportation". */
export function numberedServiceLabel(cfg: ServiceConfig): string {
  return `${cfg.number}. ${cfg.name}`
}

/** Which event-venue list to use for the `event` layout. */
export function isSportingService(name: string): boolean {
  return name === SERVICE_TYPES[7]
}
