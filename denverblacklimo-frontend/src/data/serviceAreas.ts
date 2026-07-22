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

export const serviceAreas: ServiceArea[] = [
  {
    slug: 'denver-metro',
    number: 1,
    title: 'Denver Metro Area',
    subtitle: 'Premium transportation across the Denver metropolitan region',
    heroImage:
      'https://images.unsplash.com/photo-1619857806624-56a3c45ebc31?w=1200&q=80',
    intro:
      'From downtown Denver to the Tech Center, Aurora, Lakewood, and surrounding suburbs — we provide punctual, discreet luxury service across the entire metro.',
    coverageAreas: [
      'Downtown Denver',
      'Cherry Creek',
      'LoDo & RiNo',
      'Denver Tech Center',
      'Aurora & South Metro',
      'Westminster & Arvada',
      'Golden & Lakewood',
    ],
    mapImage:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    offers: [
      {
        title: 'Airport & DIA',
        description: 'Flight-tracked airport transfers and hotel connections.',
        image:
          'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        icon: 'plane',
      },
      {
        title: 'Corporate',
        description: 'Executive travel for meetings across the metro.',
        image:
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
        icon: 'briefcase',
      },
      {
        title: 'Events & Nightlife',
        description: 'Concerts, games, and celebrations without parking stress.',
        image:
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80',
        icon: 'music',
      },
      {
        title: 'Hourly Chauffeur',
        description: 'Flexible as-directed service for busy days.',
        image:
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
        icon: 'clock',
      },
    ],
  },
  {
    slug: 'boulder-northern-colorado',
    number: 4,
    title: 'Boulder & Northern Colorado',
    subtitle: 'Premium transportation across Boulder and Northern Colorado',
    heroImage:
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&q=80',
    intro:
      'Local experts for Boulder, Longmont, Fort Collins, and the northern Front Range — university visits, business campuses, Estes Park gateways, and mountain trailheads.',
    coverageAreas: [
      'Boulder',
      'Longmont',
      'Fort Collins',
      'Loveland',
      'Greeley',
      'Estes Park',
      'Superior & Louisville',
    ],
    mapImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    offers: [
      {
        title: 'University Travel',
        description: 'CU Boulder visits, tours, and family weekends.',
        image:
          'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80',
        icon: 'graduation-cap',
      },
      {
        title: 'Business',
        description: 'Boulder tech corridor and Northern Colorado offices.',
        image:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
        icon: 'briefcase',
      },
      {
        title: 'Tourism',
        description: 'Pearl Street, Flatirons views, and scenic drives.',
        image:
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        icon: 'camera',
      },
      {
        title: 'Outdoor Adventures',
        description: 'Trailhead drop-offs and national park gateways.',
        image:
          'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
        icon: 'mountain',
      },
    ],
  },
  {
    slug: 'colorado-springs-southern',
    number: 2,
    title: 'Colorado Springs & Southern Colorado',
    subtitle: 'Luxury service along the southern Front Range',
    heroImage:
      'https://images.unsplash.com/photo-1501594907352-04cda98fdaf0?w=1200&q=80',
    intro:
      'Connect Denver with Colorado Springs, Monument, Pueblo, and southern destinations — ideal for military, corporate, and leisure travel.',
    coverageAreas: [
      'Colorado Springs',
      'Monument & Castle Rock',
      'Pueblo',
      'Canon City',
      'Air Force Academy area',
      'Manitou Springs',
    ],
    mapImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    offers: [
      {
        title: 'Intercity Travel',
        description: 'Denver ↔ Colorado Springs executive transfers.',
        image:
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
        icon: 'route',
      },
      {
        title: 'Military & Government',
        description: 'Professional service for bases and official travel.',
        image:
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
        icon: 'shield',
      },
      {
        title: 'Pikes Peak Region',
        description: 'Scenic touring and event transportation.',
        image:
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        icon: 'mountain',
      },
      {
        title: 'Corporate',
        description: 'Southern Colorado meetings and conferences.',
        image:
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
        icon: 'briefcase',
      },
    ],
  },
  {
    slug: 'mountain-resorts-airports',
    number: 3,
    title: 'Mountain Resorts & Airports',
    subtitle: 'Year-round luxury to Colorado’s premier mountain destinations',
    heroImage:
      'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80',
    intro:
      'Vail, Aspen, Breckenridge, Keystone, and resort airports — experienced mountain drivers and luxury SUVs built for every season.',
    coverageAreas: [
      'Vail & Beaver Creek',
      'Aspen & Snowmass',
      'Breckenridge & Keystone',
      'Copper Mountain',
      'Eagle County Regional (EGE)',
      'Winter Park & Steamboat',
    ],
    mapImage:
      'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80',
    offers: [
      {
        title: 'Ski Season',
        description: 'Gear-friendly SUVs and winter-ready chauffeurs.',
        image:
          'https://images.unsplash.com/photo-1551524164-6cf77f7e1e44?w=600&q=80',
        icon: 'snowflake',
      },
      {
        title: 'Resort Events',
        description: 'Weddings and conferences at mountain properties.',
        image:
          'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
        icon: 'heart',
      },
      {
        title: 'Airport Connections',
        description: 'EGE and DIA resort routing with comfort stops.',
        image:
          'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        icon: 'plane',
      },
      {
        title: 'Summer Retreats',
        description: 'Golf, hiking, and festival transportation.',
        image:
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        icon: 'sun',
      },
    ],
  },
  {
    slug: 'fort-collins',
    number: 5,
    title: 'Fort Collins',
    subtitle: 'Northern Front Range luxury chauffeured service',
    heroImage:
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&q=80',
    intro:
      'Serving Fort Collins, CSU, Loveland, and northern business corridors with the same premium standards as our Denver fleet.',
    coverageAreas: ['Fort Collins', 'Loveland', 'Windsor', 'CSU campus', 'Old Town Fort Collins'],
    mapImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    offers: [
      {
        title: 'Campus & University',
        description: 'CSU visits, tours, and graduation weekends.',
        image:
          'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80',
        icon: 'graduation-cap',
      },
      {
        title: 'Brewery Circuit',
        description: 'Fort Collins craft brewery tours with a chauffeur.',
        image:
          'https://images.unsplash.com/photo-1510812431400-574770395818?w=600&q=80',
        icon: 'beer',
      },
      {
        title: 'Business Travel',
        description: 'Northern Colorado corporate appointments.',
        image:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
        icon: 'briefcase',
      },
      {
        title: 'Denver Connections',
        description: 'Intercity transfers to DIA and downtown Denver.',
        image:
          'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        icon: 'plane',
      },
    ],
  },
  {
    slug: 'grand-junction',
    number: 6,
    title: 'Grand Junction & Western Slope',
    subtitle: 'Luxury transportation across Colorado’s Western Slope',
    heroImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    intro:
      'Wine country, national parks, and regional airports — coordinated long-distance luxury travel to Grand Junction and western Colorado.',
    coverageAreas: [
      'Grand Junction',
      'Palisade wine country',
      'Fruita & Mesa County',
      'GJ Regional Airport (GJT)',
      'Moab gateway routes',
    ],
    mapImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    offers: [
      {
        title: 'Wine Country',
        description: 'Palisade winery tours with full-day chauffeur service.',
        image:
          'https://images.unsplash.com/photo-1510812431400-574770395818?w=600&q=80',
        icon: 'wine',
      },
      {
        title: 'National Parks',
        description: 'Gateway travel toward Utah and desert parks.',
        image:
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        icon: 'mountain',
      },
      {
        title: 'Regional Airports',
        description: 'GJT connections and cross-state itineraries.',
        image:
          'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        icon: 'plane',
      },
      {
        title: 'Executive Travel',
        description: 'Long-distance comfort for business on the Western Slope.',
        image:
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
        icon: 'briefcase',
      },
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
  'Fort Collins',
  'Grand Junction',
  'Denver International Airport',
  'Private Aviation FBOs',
]
