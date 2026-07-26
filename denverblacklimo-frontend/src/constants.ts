export const PHONE = '(720) 499-6744'
export const PHONE_HREF = 'tel:+17204996744'
export const EMAIL = 'denverblacklimo@yahoo.com'
export const EMAIL_HREF = 'mailto:denverblacklimo@yahoo.com'
export const FACEBOOK_URL = 'https://web.facebook.com/p/Denver-Black-Limo-LLC-100087707941139/?_rdc=1&_rdr#'
export const ADDRESS = 'Denver, Colorado — serving the Front Range & beyond'
export const FOUNDED = 'September 2019'

export const FOUNDER = {
  name: 'Bereket Bedane',
  title: 'President & Founder',
  image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
  quote:
    'At Denver Black Limo, we believe luxury is defined by professionalism, reliability, and genuine hospitality. Every ride reflects our commitment to excellence.',
} as const

/**
 * The 12 transportation service categories offered by Denver Black Limo.
 * Order matters — these are numbered 1–12 in the booking dropdown.
 * (A 13th category will be added by the client later.)
 */
export const SERVICE_TYPES = [
  'Airport Transportation',
  'Private Aviation / FBO Transportation',
  'Executive & Corporate Transportation',
  'Hourly Chauffeur Service',
  'Mountain Resort Transportation',
  'Wedding Transportation',
  'Concert & Red Rocks Transportation',
  'Sporting Event Transportation',
  'Bachelor & Bachelorette Transportation',
  'Private City Tours',
  'Brewery, Winery & Whiskey Tours',
  'Group Transportation',
] as const

// ─────────────────────────────────────────────
// VEHICLE CATEGORIES (used in the booking summary sidebar)
// ─────────────────────────────────────────────

export interface VehicleCategory {
  name: string
  capacity: string
  image: string
}

// Reuse image IDs already proven to load elsewhere in the app to avoid broken previews.
const V_SEDAN =
  'https://images.unsplash.com/photo-1614026480421-a855205734b4?auto=format&fit=crop&w=1000&q=80'
const V_SUV =
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1000&q=80'
const V_VAN =
  'https://images.unsplash.com/photo-1599493343694-83a479294734?auto=format&fit=crop&w=1000&q=80'
const V_LIMO =
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=80'
const V_PARTY =
  'https://images.unsplash.com/photo-1530103862676-de8c92517b2f?auto=format&fit=crop&w=1000&q=80'

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  { name: 'Luxury Sedan', capacity: 'Up to 3 Passengers, 3 Luggage', image: V_SEDAN },
  { name: 'Executive SUV', capacity: 'Up to 6 Passengers, 6 Luggage', image: V_SUV },
  { name: 'Cadillac Escalade ESV', capacity: 'Up to 6 Passengers, 6 Luggage', image: V_SUV },
  { name: 'Luxury SUV', capacity: 'Up to 6 Passengers, 6 Luggage', image: V_SUV },
  { name: 'Sprinter Van', capacity: 'Up to 14 Passengers, 10 Luggage', image: V_VAN },
  { name: 'Stretch Limousine', capacity: 'Up to 10 Passengers', image: V_LIMO },
  { name: 'Party Bus', capacity: 'Up to 20 Passengers, No Luggage', image: V_PARTY },
]

export const VEHICLE_PREFERENCES = VEHICLE_CATEGORIES.map((v) => v.name)

export function getVehicleCategory(name: string | undefined): VehicleCategory | undefined {
  if (!name) return undefined
  return VEHICLE_CATEGORIES.find((v) => v.name === name)
}

// ─────────────────────────────────────────────
// DENVER INTERNATIONAL AIRPORT (DEN) — AIRLINES
// ─────────────────────────────────────────────

export type Terminal = 'East' | 'West'

export interface Airline {
  code: string
  name: string
  /** Internal terminal side (East/West). Never shown to customers directly. */
  terminal: Terminal
  logo: string
}

/**
 * Meet & Greet instruction data, keyed by the internal terminal side.
 * The system picks this automatically from the selected airline — the
 * customer never chooses a terminal manually.
 */
export const MEET_GREET: Record<Terminal, { terminal: string; instructions: string }> = {
  West: {
    terminal: 'West Terminal',
    instructions: 'We will meet you at West Terminal – Level 5, Island 2, Door 508.',
  },
  East: {
    terminal: 'East Terminal',
    instructions: 'We will meet you at East Terminal – Level 5, Island 2, Door 509.',
  },
}

/** Free airline-logo CDN by IATA code (with a code-badge fallback in the UI). */
function airlineLogo(code: string): string {
  return `https://pics.avs.io/120/120/${code}.png`
}

interface RawAirline {
  code: string
  name: string
  terminal: Terminal
}

/**
 * Comprehensive list of airlines operating at Denver International Airport (DEN).
 * Terminal side (East/West) is a best-effort default for the Meet & Greet logic
 * and can be adjusted per the client's official terminal-assignment sheet.
 */
const RAW_DEN_AIRLINES: RawAirline[] = [
  // ── Domestic (predominantly East side) ──
  { code: 'AA', name: 'American Airlines', terminal: 'East' },
  { code: 'DL', name: 'Delta Air Lines', terminal: 'East' },
  { code: 'WN', name: 'Southwest Airlines', terminal: 'East' },
  { code: 'F9', name: 'Frontier Airlines', terminal: 'East' },
  { code: 'B6', name: 'JetBlue Airways', terminal: 'East' },
  { code: 'NK', name: 'Spirit Airlines', terminal: 'East' },
  { code: 'G4', name: 'Allegiant Air', terminal: 'East' },
  { code: 'HA', name: 'Hawaiian Airlines', terminal: 'East' },
  { code: '9K', name: 'Cape Air', terminal: 'East' },
  { code: 'MW', name: 'Denver Air Connection', terminal: 'East' },
  { code: '4B', name: 'Boutique Air', terminal: 'East' },
  { code: 'Y4', name: 'Volaris', terminal: 'East' },
  { code: 'VB', name: 'Viva Aerobus', terminal: 'East' },
  // ── United hub + international / Star Alliance (predominantly West side) ──
  { code: 'UA', name: 'United Airlines', terminal: 'West' },
  { code: 'AS', name: 'Alaska Airlines', terminal: 'West' },
  { code: 'SY', name: 'Sun Country Airlines', terminal: 'West' },
  { code: 'AC', name: 'Air Canada', terminal: 'West' },
  { code: 'WS', name: 'WestJet', terminal: 'West' },
  { code: 'AM', name: 'Aeroméxico', terminal: 'West' },
  { code: 'BA', name: 'British Airways', terminal: 'West' },
  { code: 'LH', name: 'Lufthansa', terminal: 'West' },
  { code: 'AF', name: 'Air France', terminal: 'West' },
  { code: 'CM', name: 'Copa Airlines', terminal: 'West' },
  { code: 'TK', name: 'Turkish Airlines', terminal: 'West' },
  { code: 'FI', name: 'Icelandair', terminal: 'West' },
  { code: 'WK', name: 'Edelweiss Air', terminal: 'West' },
  { code: 'Z0', name: 'Norse Atlantic Airways', terminal: 'West' },
]

export const DEN_AIRLINES: Airline[] = RAW_DEN_AIRLINES.map((a) => ({
  ...a,
  logo: airlineLogo(a.code),
})).sort((a, b) => a.name.localeCompare(b.name))

// ─────────────────────────────────────────────
// PRIVATE AVIATION / FBO TERMINALS (DEN & APA)
// ─────────────────────────────────────────────

export interface FBO {
  name: string
  address: string
}

export const FBO_TERMINALS: FBO[] = [
  { name: 'Signature Aviation – DEN', address: '8900 Peña Blvd, Denver, CO 80249' },
  { name: 'Atlantic Aviation – APA', address: '7800 S Peoria St, Englewood, CO 80112' },
  { name: 'Signature Aviation – APA (Centennial)', address: '7600 S Peoria St, Englewood, CO 80112' },
  { name: 'jetCenter at Centennial (APA)', address: '12034 E Control Tower Rd, Englewood, CO 80112' },
  { name: 'Denver jetCenter (APA)', address: '7625 S Peoria St, Englewood, CO 80112' },
  { name: 'Rocky Mountain Metropolitan (BJC)', address: '11755 Airport Way, Broomfield, CO 80021' },
  { name: 'Other / Private Terminal', address: '' },
]

export const AIRCRAFT_TYPES = [
  'Light Jet',
  'Midsize Jet',
  'Super Midsize Jet',
  'Heavy Jet',
  'Turboprop',
  'Ultra Long Range Jet',
  'Other / Not Sure',
] as const

// ─────────────────────────────────────────────
// EVENT VENUES (Concert & Sporting)
// ─────────────────────────────────────────────

export const CONCERT_VENUES = [
  'Red Rocks Amphitheatre',
  'Ball Arena',
  'Mission Ballroom',
  'Fiddler’s Green Amphitheatre',
  'Bellco Theatre',
  'Ogden Theatre',
  'The Fillmore Auditorium',
  'Denver Coliseum',
  'Other Venue',
] as const

export const SPORTING_VENUES = [
  'Empower Field at Mile High (Broncos)',
  'Ball Arena (Nuggets / Avalanche)',
  'Coors Field (Rockies)',
  'DICK’S Sporting Goods Park (Rapids)',
  'CU Boulder – Folsom Field',
  'CSU – Canvas Stadium',
  'Other Venue',
] as const

// ─────────────────────────────────────────────
// MOUNTAIN RESORT DESTINATIONS & SERVICE AREAS
// ─────────────────────────────────────────────

export const MOUNTAIN_RESORTS = [
  'Vail',
  'Beaver Creek',
  'Aspen / Snowmass',
  'Breckenridge',
  'Keystone',
  'Copper Mountain',
  'Winter Park',
  'Steamboat Springs',
  'Telluride',
  'Other Resort',
] as const

export const SERVICE_AREAS = [
  'Denver Metro Area (Within 30 miles)',
  'Boulder County',
  'Colorado Springs Area',
  'Fort Collins / Northern Colorado',
  'Mountain Corridor (I-70)',
  'Other / Custom',
] as const

export const HOURLY_DURATIONS = [
  '2 Hours',
  '3 Hours',
  '4 Hours',
  '5 Hours',
  '6 Hours',
  '7 Hours',
  '8 Hours',
  '9 Hours',
  '10 Hours',
  '12 Hours (Full Day)',
] as const
