export type ServiceAreaOffer = {
  title: string
  description: string
  image: string
  icon: string
}

export type ServiceArea = {
  slug: string
  number: number
  title: string
  subtitle: string
  heroImage: string
  intro: string
  coverageAreas: string[]
  mapImage: string
  offers: ServiceAreaOffer[]
}

// Stock fallbacks (used only until the client's /images/service-areas/area-banner-<N>.jpeg loads).
const S = {
  denverDay: 'https://images.unsplash.com/photo-1619857806624-56a3c45ebc31?w=1200&q=80',
  denverNight: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
  suburb: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
  boulder: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&q=80',
  mountain: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  resort: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80',
  ski: 'https://images.unsplash.com/photo-1551524164-6cf77f7e1e44?w=1200&q=80',
  springs: 'https://images.unsplash.com/photo-1501594907352-04cda98fdaf0?w=1200&q=80',
  airport: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
}

// Offer-card stock images (600w) — proven photo IDs that load reliably.
const O = {
  business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
  airport: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  events: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
  wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
  university: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80',
  mountain: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  outdoor: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
  ski: 'https://images.unsplash.com/photo-1551524164-6cf77f7e1e44?w=600&q=80',
  chauffeur: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  jet: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
  concert: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
}

export const serviceAreas: ServiceArea[] = [
  {
    slug: 'denver-metro',
    number: 1,
    title: 'Denver Metro',
    subtitle: 'Premium Transportation Across the Heart of Denver',
    heroImage: S.denverDay,
    intro:
      'Denver Metro is the vibrant center of business, culture, entertainment, and luxury living. Denver Black Limo LLC provides reliable, professional, and comfortable transportation throughout the entire Metro area — day or night, 24/7.',
    coverageAreas: [
      'Downtown Denver',
      'LoDo (Lower Downtown)',
      'RiNo (River North)',
      'Cherry Creek',
      'Capitol Hill',
      'Highlands',
      'Washington Park',
      'Denver Tech Center (DTC)',
      'City Park',
    ],
    mapImage: S.denverDay,
    offers: [
      { title: 'Business Travel', description: 'Executive transport for meetings and offices across the metro.', image: O.business, icon: 'briefcase' },
      { title: 'Airport Transfers', description: 'Flight-tracked rides to DIA and area airports.', image: O.airport, icon: 'plane' },
      { title: 'Hotels', description: 'Door-to-door service to downtown and luxury hotels.', image: O.hotel, icon: 'building' },
      { title: 'Dining', description: 'Effortless evenings out at Denver’s finest restaurants.', image: O.events, icon: 'utensils' },
      { title: 'Events', description: 'Concerts, games, and nightlife without parking stress.', image: O.concert, icon: 'music' },
      { title: 'Shopping', description: 'Cherry Creek and premier shopping destinations.', image: O.city, icon: 'shopping-bag' },
    ],
  },
  {
    slug: 'south-denver-metro',
    number: 2,
    title: 'South Denver Metro',
    subtitle: 'Premium Transportation Across South Denver',
    heroImage: S.suburb,
    intro:
      'South Denver Metro is home to Colorado’s premier business districts, luxury communities, golf clubs, executive offices, and upscale neighborhoods. Denver Black Limo LLC provides first-class chauffeured transportation throughout the region with professional service, luxury vehicles, and dependable 24/7 availability.',
    coverageAreas: [
      'Highlands Ranch',
      'Lone Tree',
      'Castle Pines',
      'Castle Rock',
      'Parker',
      'Greenwood Village',
      'Centennial',
      'Englewood',
      'Littleton',
    ],
    mapImage: S.suburb,
    offers: [
      { title: 'Executive Travel', description: 'Business meetings, corporate offices, and executive transportation.', image: O.business, icon: 'briefcase' },
      { title: 'Corporate Offices', description: 'Professional transportation to DTC, Meridian, Inverness, and business parks.', image: O.office, icon: 'building' },
      { title: 'Weddings', description: 'Luxury transportation for weddings, country clubs, and private venues.', image: O.wedding, icon: 'heart' },
      { title: 'Golf Clubs', description: 'Transportation to premier golf clubs and private memberships.', image: O.outdoor, icon: 'flag' },
      { title: 'Luxury Communities', description: 'Private transportation throughout Colorado’s most prestigious neighborhoods.', image: O.city, icon: 'home' },
      { title: 'Fine Dining & Shopping', description: 'Cherry Creek South, Park Meadows, upscale restaurants, and shopping destinations.', image: O.hotel, icon: 'shopping-bag' },
    ],
  },
  {
    slug: 'north-denver-metro',
    number: 3,
    title: 'North Denver Metro',
    subtitle: 'Premium Transportation Throughout North Denver',
    heroImage: S.suburb,
    intro:
      'North Denver Metro is a thriving community of residential neighborhoods, business centers, and growing cities. Denver Black Limo LLC provides safe, reliable, and professional transportation for residents, families, and businesses throughout the North Metro area, 24 hours a day, 7 days a week.',
    coverageAreas: [
      'Westminster',
      'Broomfield',
      'Thornton',
      'Northglenn',
      'Commerce City',
      'Brighton',
      'Erie',
      'Lafayette',
      'Louisville',
    ],
    mapImage: S.suburb,
    offers: [
      { title: 'Residential Transportation', description: 'Safe, comfortable rides for daily commutes, appointments, school, and special occasions.', image: O.city, icon: 'home' },
      { title: 'Airport Service', description: 'On-time airport transfers to DIA and surrounding airports with flight tracking & meet-and-greet service.', image: O.airport, icon: 'plane' },
      { title: 'Corporate Travel', description: 'Professional transportation for businesses, meetings, conferences, and corporate events.', image: O.business, icon: 'briefcase' },
      { title: 'Family Transportation', description: 'Reliable transportation for families, school activities, sports events, and group travel.', image: O.chauffeur, icon: 'users' },
    ],
  },
  {
    slug: 'boulder-northern-colorado',
    number: 4,
    title: 'Boulder & Northern Colorado',
    subtitle: 'Premium Transportation Across Boulder and Northern Colorado',
    heroImage: S.boulder,
    intro:
      'From the vibrant cities of Boulder and Fort Collins to the scenic mountain towns and growing communities across Northern Colorado, Denver Black Limo LLC offers luxury transportation with comfort, reliability, and professional service. Wherever you’re headed, we get you there in style.',
    coverageAreas: [
      'Boulder',
      'Longmont',
      'Fort Collins',
      'Loveland',
      'Greeley',
      'Estes Park',
      'Superior',
    ],
    mapImage: S.boulder,
    offers: [
      { title: 'University Travel', description: 'Reliable transportation for students, faculty, visitors, and university events.', image: O.university, icon: 'graduation-cap' },
      { title: 'Business', description: 'Executive transportation for business meetings, corporate offices, and conferences.', image: O.business, icon: 'briefcase' },
      { title: 'Tourism', description: 'Explore Northern Colorado’s best destinations with comfortable, luxury travel.', image: O.mountain, icon: 'camera' },
      { title: 'Outdoor Adventures', description: 'Trips to national parks, hiking trails, ski resorts, and outdoor adventures made easy.', image: O.outdoor, icon: 'mountain' },
    ],
  },
  {
    slug: 'foothills-mountain-gateway',
    number: 5,
    title: 'Foothills & Mountain Gateway',
    subtitle: 'Premium Transportation Across Golden and the Foothills Corridor',
    heroImage: S.mountain,
    intro:
      'The Foothills & Mountain Gateway offers some of Colorado’s most breathtaking scenery and outdoor experiences. Denver Black Limo LLC provides luxury transportation to charming mountain towns, scenic destinations, and world-famous attractions with comfort and reliability. Relax and enjoy the ride — we handle the journey.',
    coverageAreas: ['Golden', 'Morrison', 'Evergreen', 'Genesee', 'Conifer', 'Idaho Springs'],
    mapImage: S.mountain,
    offers: [
      { title: 'Red Rocks', description: 'Luxury transportation to Red Rocks Amphitheatre for unforgettable events.', image: O.concert, icon: 'music' },
      { title: 'Scenic Drives', description: 'Enjoy Colorado’s most beautiful drives in comfort and style.', image: O.city, icon: 'car' },
      { title: 'Hiking', description: 'We take you to the best trailheads and outdoor adventures.', image: O.outdoor, icon: 'trees' },
      { title: 'Private Tours', description: 'Custom private tours to historic towns, scenic spots, and hidden gems.', image: O.mountain, icon: 'camera' },
    ],
  },
  {
    slug: 'colorado-mountain-resorts',
    number: 6,
    title: 'Colorado Mountain Resorts',
    subtitle: 'Premium Transportation to Colorado’s Top Mountain Destinations',
    heroImage: S.ski,
    intro:
      'From world-class ski resorts to luxury mountain retreats, Denver Black Limo LLC provides comfortable, reliable, and stylish transportation to Colorado’s most iconic mountain destinations. Enjoy every mile of the journey while we handle the road.',
    coverageAreas: [
      'Aspen',
      'Snowmass',
      'Vail',
      'Beaver Creek',
      'Breckenridge',
      'Keystone',
      'Copper Mountain',
      'Winter Park',
      'Steamboat Springs',
      'Telluride',
      'Crested Butte',
    ],
    mapImage: S.resort,
    offers: [
      { title: 'Ski Resorts', description: 'Direct transportation to Colorado’s best ski resorts with professional chauffeurs and luxury vehicles.', image: O.ski, icon: 'mountain' },
      { title: 'Luxury Hotels', description: 'Door-to-door service to the finest hotels, lodges, and mountain retreats.', image: O.hotel, icon: 'building' },
      { title: 'Vacation Transportation', description: 'Relax and enjoy the ride while we take care of your mountain vacation transportation.', image: O.mountain, icon: 'luggage' },
      { title: 'Winter Travel', description: 'Safe, reliable, and comfortable travel in all winter conditions, 24/7 availability.', image: O.ski, icon: 'snowflake' },
    ],
  },
  {
    slug: 'colorado-springs-southern',
    number: 7,
    title: 'Colorado Springs & Southern Colorado',
    subtitle: 'Premium Transportation Across Southern Colorado',
    heroImage: S.springs,
    intro:
      'From the beauty of Colorado Springs to the historic charm of Pueblo and Trinidad, Denver Black Limo LLC delivers exceptional transportation throughout Southern Colorado with comfort, professionalism, and reliability. We’re here for business, leisure, and everything in between.',
    coverageAreas: [
      'Colorado Springs',
      'Monument',
      'Manitou Springs',
      'Fountain',
      'Pueblo',
      'Cañon City',
      'Trinidad',
    ],
    mapImage: S.springs,
    offers: [
      { title: 'Business', description: 'Reliable corporate transportation for meetings, conferences, executive travel, and business events across Southern Colorado.', image: O.business, icon: 'briefcase' },
      { title: 'Tourism', description: 'Explore top attractions, national parks, historic sites, and local destinations in comfort and style.', image: O.mountain, icon: 'camera' },
      { title: 'Military', description: 'Proudly serving military personnel and families to bases, ceremonies, graduations, and special events with professionalism.', image: O.city, icon: 'star' },
      { title: 'Weddings', description: 'Luxury transportation for weddings, receptions, and guest shuttles at beautiful venues throughout Southern Colorado.', image: O.wedding, icon: 'heart' },
    ],
  },
  {
    slug: 'airports-private-aviation',
    number: 8,
    title: 'Airports & Private Aviation',
    subtitle: 'Premium Airport & Private Aviation Transportation Across Colorado',
    heroImage: S.airport,
    intro:
      'Denver Black Limo LLC provides seamless, luxury transportation to and from Colorado’s top airports, private aviation terminals, and FBOs. From commercial flights to private jets, our professional chauffeurs ensure a smooth, on-time, and discreet experience every time.',
    coverageAreas: [
      'Denver International Airport (DEN)',
      'Centennial Airport (APA)',
      'Rocky Mountain Metropolitan Airport (BJC)',
      'Colorado Springs Airport (COS)',
      'Eagle County Airport (EGE)',
      'Aspen Airport (ASE)',
      'Signature Aviation',
      'Atlantic Aviation',
    ],
    mapImage: S.airport,
    offers: [
      { title: 'Meet & Greet', description: 'Personalized meet & greet service at arrivals with luggage assistance and professional hospitality.', image: O.airport, icon: 'user-check' },
      { title: 'Flight Tracking', description: 'Real-time flight monitoring ensures we’re always on time, every time — no matter the delay.', image: O.airport, icon: 'radar' },
      { title: 'Private Jets', description: 'Specialized transportation for private jet travelers and VIPs to any destination in Colorado.', image: O.jet, icon: 'plane' },
      { title: 'Executive Travel', description: 'Executive-level transportation for business leaders, corporate teams, and private clients.', image: O.business, icon: 'briefcase' },
    ],
  },
  {
    slug: 'entertainment-sports-hotels',
    number: 9,
    title: 'Entertainment, Sports & Luxury Hotels',
    subtitle: 'Premium Transportation to Denver’s Top Venues, Events & Luxury Accommodations',
    heroImage: S.denverNight,
    intro:
      'From world-class arenas and iconic venues to luxury hotels and VIP events, Denver Black Limo LLC delivers first-class transportation with professionalism, discretion, and reliability. Arrive in style. Every time.',
    coverageAreas: [
      'Ball Arena',
      'Empower Field',
      'Coors Field',
      'Red Rocks Amphitheatre',
      'Denver Performing Arts Complex',
      'Convention Center',
      'Four Seasons',
      'Ritz-Carlton',
      'The Crawford',
      'Halcyon',
    ],
    mapImage: S.denverNight,
    offers: [
      { title: 'Concerts', description: 'Transportation to concerts, shows, and live performances at top venues across Denver.', image: O.concert, icon: 'music' },
      { title: 'Sporting Events', description: 'Game day transportation to Broncos, Nuggets, Avalanche, Rockies, and more.', image: O.concert, icon: 'trophy' },
      { title: 'VIP Events', description: 'Red carpet events, galas, private parties, and exclusive VIP experiences.', image: O.events, icon: 'star' },
      { title: 'Hotel Transfers', description: 'Luxury transportation to and from Denver’s finest hotels with meet & greet service.', image: O.hotel, icon: 'building' },
    ],
  },
  {
    slug: 'long-distance-interstate',
    number: 10,
    title: 'Long-Distance & Interstate Travel',
    subtitle: 'Luxury Chauffeured Transportation Beyond Colorado',
    heroImage: S.mountain,
    intro:
      'Whether you’re traveling for business, family, or leisure, Denver Black Limo LLC provides premium long-distance transportation throughout Colorado and neighboring states. Sit back, relax, and enjoy a first-class travel experience while we handle every mile.',
    coverageAreas: [
      'Wyoming',
      'Cheyenne',
      'Laramie',
      'New Mexico',
      'Santa Fe',
      'Taos',
      'Utah (Upon Request)',
      'Kansas (Upon Request)',
    ],
    mapImage: S.mountain,
    offers: [
      { title: 'Private Chauffeur', description: 'Luxury point-to-point transportation with a dedicated professional chauffeur.', image: O.chauffeur, icon: 'user-check' },
      { title: 'Business Travel', description: 'Reliable executive transportation for meetings, conferences, and corporate travel.', image: O.business, icon: 'briefcase' },
      { title: 'Family Trips', description: 'Comfortable long-distance transportation for vacations and family travel.', image: O.chauffeur, icon: 'users' },
      { title: 'Long-Distance Luxury', description: 'Premium interstate travel with spacious luxury vehicles, personalized service, and door-to-door convenience.', image: O.city, icon: 'route' },
    ],
  },
]

export function getServiceAreaBySlug(slug: string): ServiceArea | undefined {
  return serviceAreas.find((a) => a.slug === slug)
}

export const homeCoverageList = [
  'Denver Metro Area',
  'South Denver Metro',
  'Boulder & Northern Colorado',
  'Colorado Springs',
  'Mountain Resorts',
  'Vail & Aspen',
  'Airports & Private Aviation',
  'Entertainment & Sports',
  'Long-Distance Travel',
  'Foothills & Mountain Gateway',
]
