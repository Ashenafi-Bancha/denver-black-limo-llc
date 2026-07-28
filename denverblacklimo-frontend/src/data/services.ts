export type SubService = {
  title: string
  description: string
  image: string
  icon: string
}

export type Service = {
  slug: string
  number: number
  title: string
  shortDescription: string
  heroImage: string
  intro: string
  trustIcons: { label: string; icon: string }[]
  subServices: SubService[]
}

const img = {
  airport:
    'https://images.unsplash.com/photo-1617469748971-a8b3473de016?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  aviation:
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  corporate:
    'https://images.unsplash.com/photo-1614026480421-a855205734b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  hourly:
    'https://images.unsplash.com/photo-1599493343694-83a479294734?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  mountain:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  wedding:
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  concert:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  bachelor:
    'https://images.unsplash.com/photo-1530103862676-de8c92517b2f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  city:
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  brewery:
    'https://images.unsplash.com/photo-1510812431400-574770395818?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  group:
    'https://images.unsplash.com/photo-1599493343694-83a479294734?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  chauffeur:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  meet:
    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  hotel:
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  flight:
    'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  route:
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
  sports:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
}

export const services: Service[] = [
  {
    slug: 'airport-transportation',
    number: 1,
    title: 'Airport Transportation',
    shortDescription:
      'Luxury ground transfers to and from Denver International Airport with flight tracking and meet & greet.',
    heroImage: img.airport,
    intro:
      'Arrive or depart in comfort with professional chauffeurs, real-time flight monitoring, luggage assistance, and seamless curbside or meet-and-greet service at Denver International Airport and regional airports.',
    trustIcons: [
      { label: 'Flight Tracking', icon: 'plane' },
      { label: 'Luggage Assistance', icon: 'luggage' },
      { label: '24/7 Availability', icon: 'clock' },
      { label: 'Luxury Vehicles', icon: 'car' },
    ],
    subServices: [
      {
        title: 'Denver International Airport',
        description: 'Premium transport to and from DIA with punctual, stress-free arrivals.',
        image: img.airport,
        icon: 'plane',
      },
      {
        title: 'Meet & Greet',
        description: 'Personalized welcome inside the terminal with professional signage.',
        image: img.meet,
        icon: 'user-check',
      },
      {
        title: 'Hotel Transfers',
        description: 'Direct service between the airport and Denver-area hotels and resorts.',
        image: img.hotel,
        icon: 'building',
      },
      {
        title: 'Flight Tracking',
        description: 'We monitor your flight so pickup times adjust automatically.',
        image: img.flight,
        icon: 'radar',
      },
      {
        title: 'Private Airport Pickups',
        description: 'Specialized pickups for private aviation and FBO clients.',
        image: img.aviation,
        icon: 'shield',
      },
    ],
  },
  {
    slug: 'private-aviation-fbo',
    number: 2,
    title: 'Private Aviation / FBO Transportation',
    shortDescription:
      'Discreet tarmac-side service for private jet travelers, executives, and VIP arrivals.',
    heroImage: img.aviation,
    intro:
      'Premium transportation for private aviation clients arriving or departing through FBO terminals. Our chauffeurs coordinate directly with your flight crew for seamless tarmac transfers.',
    trustIcons: [
      { label: 'Private Jet', icon: 'plane' },
      { label: 'VIP Service', icon: 'crown' },
      { label: 'Discreet Chauffeurs', icon: 'eye-off' },
      { label: 'Luxury SUV', icon: 'car' },
    ],
    subServices: [
      {
        title: 'Signature Aviation',
        description: 'Dedicated FBO transfers at Signature Aviation locations.',
        image: img.aviation,
        icon: 'plane',
      },
      {
        title: 'Atlantic Aviation',
        description: 'Professional coordination with Atlantic Aviation FBO teams.',
        image: img.aviation,
        icon: 'plane',
      },
      {
        title: 'JSX',
        description: 'Seamless transportation to and from JSX private terminals.',
        image: img.aviation,
        icon: 'plane',
      },
      {
        title: 'NetJets',
        description: 'Premium transfers for NetJets passengers and flight crews.',
        image: img.aviation,
        icon: 'briefcase',
      },
      {
        title: 'Flexjet',
        description: 'Luxury transportation for Flexjet clients and fractional owners.',
        image: img.aviation,
        icon: 'briefcase',
      },
      {
        title: 'Private Jet Transfers',
        description: 'Door-to-tarmac luxury SUV service for any private terminal.',
        image: img.aviation,
        icon: 'shield',
      },
    ],
  },
  {
    slug: 'executive-corporate',
    number: 3,
    title: 'Executive & Corporate Transportation',
    shortDescription:
      'Professional chauffeured service for meetings, roadshows, conferences, and VIP guests.',
    heroImage: img.corporate,
    intro:
      'Impress clients and keep executives on schedule with immaculate vehicles, corporate billing options, and chauffeurs trained in discretion and professionalism.',
    trustIcons: [
      { label: 'Executive Travel', icon: 'briefcase' },
      { label: 'On-Time Service', icon: 'clock' },
      { label: 'Professional Chauffeurs', icon: 'user' },
      { label: 'Corporate Accounts', icon: 'building' },
    ],
    subServices: [
      {
        title: 'Corporate Travel',
        description: 'Daily executive transport across Denver and the Front Range.',
        image: img.corporate,
        icon: 'briefcase',
      },
      {
        title: 'Roadshows',
        description: 'Multi-stop itineraries for investor and sales roadshows.',
        image: img.corporate,
        icon: 'route',
      },
      {
        title: 'Meetings & Conferences',
        description: 'Reliable arrivals for board meetings and convention centers.',
        image: img.meet,
        icon: 'users',
      },
      {
        title: 'Executive Transfers',
        description: 'Point-to-point luxury for C-suite and VIP travelers.',
        image: img.chauffeur,
        icon: 'crown',
      },
      {
        title: 'Corporate Accounts',
        description: 'Streamlined billing and dedicated account management.',
        image: img.corporate,
        icon: 'file-text',
      },
    ],
  },
  {
    slug: 'hourly-chauffeur',
    number: 4,
    title: 'Hourly Chauffeur Service',
    shortDescription:
      'Flexible hourly service with a dedicated chauffeur for meetings, dining, and events.',
    heroImage: img.hourly,
    intro:
      'Keep a professional chauffeur on standby for multiple stops, shopping, dining, nightlife, or a full day of appointments — all in complete comfort.',
    trustIcons: [
      { label: 'Dedicated Chauffeur', icon: 'user' },
      { label: 'Flexible Schedule', icon: 'calendar' },
      { label: 'Multiple Stops', icon: 'route' },
      { label: 'Luxury Comfort', icon: 'crown' },
    ],
    subServices: [
      {
        title: 'Business Hours',
        description: 'Half-day and full-day chauffeur blocks for professionals.',
        image: img.corporate,
        icon: 'briefcase',
      },
      {
        title: 'Evening & Night Out',
        description: 'Safe, stylish transportation for dinners and entertainment.',
        image: img.hourly,
        icon: 'moon',
      },
      {
        title: 'Shopping & Errands',
        description: 'Stress-free day trips with wait-time included.',
        image: img.city,
        icon: 'shopping-bag',
      },
      {
        title: 'Custom Itineraries',
        description: 'Build your route — we adapt to your schedule.',
        image: img.route,
        icon: 'route',
      },
      {
        title: 'As-Directed Service',
        description: 'Change plans on the fly with your dedicated driver.',
        image: img.chauffeur,
        icon: 'navigation',
      },
    ],
  },
  {
    slug: 'mountain-resort',
    number: 5,
    title: 'Mountain Resort Transportation',
    shortDescription:
      'All-season luxury transfers to Vail, Aspen, Breckenridge, and Colorado ski destinations.',
    heroImage: img.mountain,
    intro:
      'Experienced mountain drivers, all-wheel-drive luxury SUVs, and careful routing for snow, events, and resort drop-offs year-round.',
    trustIcons: [
      { label: 'Mountain Experts', icon: 'mountain' },
      { label: 'All-Season Fleet', icon: 'car' },
      { label: 'Safe & Reliable', icon: 'shield' },
      { label: '24/7 Service', icon: 'clock' },
    ],
    subServices: [
      {
        title: 'Vail & Beaver Creek',
        description: 'Direct resort transfers from Denver and DIA.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Aspen & Snowmass',
        description: 'Long-distance luxury with comfort stops as needed.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Breckenridge & Keystone',
        description: 'Popular Summit County routes handled by local experts.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Winter Ski Transfers',
        description: 'Gear-friendly SUVs and experienced winter drivers.',
        image: img.mountain,
        icon: 'snowflake',
      },
      {
        title: 'Summer Mountain Escapes',
        description: 'Scenic resort travel for hiking, golf, and events.',
        image: img.mountain,
        icon: 'sun',
      },
    ],
  },
  {
    slug: 'wedding-transportation',
    number: 6,
    title: 'Wedding Transportation',
    shortDescription:
      'Elegant arrivals for couples, wedding parties, and guest shuttles.',
    heroImage: img.wedding,
    intro:
      'From bridal party limousines to coordinated guest shuttles, we deliver picture-perfect timing and white-glove service on your most important day.',
    trustIcons: [
      { label: 'Bridal Packages', icon: 'heart' },
      { label: 'Guest Shuttles', icon: 'users' },
      { label: 'Red Carpet Service', icon: 'crown' },
      { label: 'Timeline Coordination', icon: 'calendar' },
    ],
    subServices: [
      {
        title: 'Bridal Party',
        description: 'Luxury transport for the couple and wedding party.',
        image: img.wedding,
        icon: 'heart',
      },
      {
        title: 'Guest Shuttles',
        description: 'Coordinated loops between hotels and venues.',
        image: img.group,
        icon: 'bus',
      },
      {
        title: 'Ceremony to Reception',
        description: 'Seamless transitions with your planner’s timeline.',
        image: img.wedding,
        icon: 'route',
      },
      {
        title: 'Getaway Car',
        description: 'A memorable departure in a black luxury vehicle.',
        image: img.chauffeur,
        icon: 'sparkles',
      },
      {
        title: 'Rehearsal Dinners',
        description: 'Evening transport for rehearsal events and welcome parties.',
        image: img.wedding,
        icon: 'wine',
      },
    ],
  },
  {
    slug: 'concert-red-rocks',
    number: 7,
    title: 'Concert & Red Rocks Transportation',
    shortDescription:
      'Skip parking stress with private rides to Red Rocks and major Denver venues.',
    heroImage: img.concert,
    intro:
      'Arrive relaxed for shows at Red Rocks Amphitheatre, Ball Arena, and top Denver concert venues — with pickup when the encore ends.',
    trustIcons: [
      { label: 'Red Rocks Experts', icon: 'music' },
      { label: 'Post-Show Pickup', icon: 'clock' },
      { label: 'Group Friendly', icon: 'users' },
      { label: 'Night Service', icon: 'moon' },
    ],
    subServices: [
      {
        title: 'Red Rocks Amphitheatre',
        description: 'Dedicated concert routes with venue-aware timing.',
        image: img.concert,
        icon: 'music',
      },
      {
        title: 'Ball Arena & Downtown',
        description: 'Door-to-door service for arena and club events.',
        image: img.concert,
        icon: 'building',
      },
      {
        title: 'Group Concert Rides',
        description: 'SUVs and sprinters for friends and VIP groups.',
        image: img.group,
        icon: 'users',
      },
      {
        title: 'Festival Transportation',
        description: 'Multi-day festival shuttles and nightly returns.',
        image: img.concert,
        icon: 'calendar',
      },
      {
        title: 'Private After-Party',
        description: 'Continue the evening with hourly chauffeur service.',
        image: img.hourly,
        icon: 'moon',
      },
    ],
  },
  {
    slug: 'sporting-events',
    number: 8,
    title: 'Sporting Event Transportation',
    shortDescription:
      'Premium rides to Broncos, Nuggets, Avalanche, Rockies games, and more.',
    heroImage: img.sports,
    intro:
      'Avoid parking and rideshare surge pricing. We deliver you to Empower Field, Ball Arena, Coors Field, and regional stadiums in style.',
    trustIcons: [
      { label: 'Stadium Drop-Off', icon: 'map-pin' },
      { label: 'Tailgate Friendly', icon: 'users' },
      { label: 'Post-Game Pickup', icon: 'clock' },
      { label: 'Luxury Fleet', icon: 'car' },
    ],
    subServices: [
      {
        title: 'Broncos & NFL',
        description: 'Game-day luxury to Empower Field at Mile High.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Nuggets & Avalanche',
        description: 'Downtown arena service with easy pickup zones.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Rockies Baseball',
        description: 'Coors Field transfers for clients and corporate groups.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'College Athletics',
        description: 'CU, CSU, and regional college event transportation.',
        image: img.sports,
        icon: 'graduation-cap',
      },
      {
        title: 'Corporate Hospitality',
        description: 'Suite and club-level guest transportation packages.',
        image: img.corporate,
        icon: 'briefcase',
      },
    ],
  },
  {
    slug: 'bachelor-bachelorette',
    number: 9,
    title: 'Bachelor & Bachelorette Transportation',
    shortDescription:
      'Celebrate safely with a dedicated chauffeur for your Denver night out.',
    heroImage: img.bachelor,
    intro:
      'Keep the party moving across breweries, clubs, and scenic stops — with a professional driver so your group travels together safely.',
    trustIcons: [
      { label: 'Party Ready Fleet', icon: 'music' },
      { label: 'Multiple Stops', icon: 'route' },
      { label: 'Safe Celebrations', icon: 'shield' },
      { label: 'Custom Routes', icon: 'navigation' },
    ],
    subServices: [
      {
        title: 'Denver Nightlife',
        description: 'LoDo and RiNo bar crawls with wait-time included.',
        image: img.hourly,
        icon: 'moon',
      },
      {
        title: 'Brewery Tours',
        description: 'Hop between taprooms without designated drivers.',
        image: img.brewery,
        icon: 'beer',
      },
      {
        title: 'Scenic Photo Stops',
        description: 'Mountain or skyline stops for memorable photos.',
        image: img.city,
        icon: 'camera',
      },
      {
        title: 'Sprinter Groups',
        description: 'Room for larger parties in executive sprinters.',
        image: img.group,
        icon: 'users',
      },
      {
        title: 'Weekend Packages',
        description: 'Multi-day celebration itineraries across Colorado.',
        image: img.bachelor,
        icon: 'calendar',
      },
    ],
  },
  {
    slug: 'private-city-tours',
    number: 10,
    title: 'Private City Tours',
    shortDescription:
      'Curated Denver and Front Range sightseeing with a private chauffeur guide.',
    heroImage: img.city,
    intro:
      'Explore Denver’s neighborhoods, landmarks, and hidden gems at your pace — ideal for visitors, VIP guests, and special occasions.',
    trustIcons: [
      { label: 'Local Expertise', icon: 'map-pin' },
      { label: 'Custom Routes', icon: 'route' },
      { label: 'Flexible Stops', icon: 'navigation' },
      { label: 'Luxury Comfort', icon: 'crown' },
    ],
    subServices: [
      {
        title: 'Denver Highlights',
        description: 'Capitol, Larimer Square, museums, and skyline views.',
        image: img.city,
        icon: 'building',
      },
      {
        title: 'Mountain Day Trips',
        description: 'Scenic drives to Lookout Mountain and Golden.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Historic Tours',
        description: 'Story-rich routes through Denver’s heritage districts.',
        image: img.city,
        icon: 'landmark',
      },
      {
        title: 'VIP Guest Tours',
        description: 'Discreet sightseeing for executives and dignitaries.',
        image: img.chauffeur,
        icon: 'crown',
      },
      {
        title: 'Photography Stops',
        description: 'Timed stops at the best Colorado photo locations.',
        image: img.city,
        icon: 'camera',
      },
    ],
  },
  {
    slug: 'brewery-winery-whiskey',
    number: 11,
    title: 'Brewery, Winery & Whiskey Tours',
    shortDescription:
      'Responsible luxury touring across Colorado’s craft beverage scene.',
    heroImage: img.brewery,
    intro:
      'Sample Front Range breweries, mountain wineries, and distillery trails with a dedicated chauffeur — no parking, no worries.',
    trustIcons: [
      { label: 'Craft Beverage Routes', icon: 'wine' },
      { label: 'Safe Transport', icon: 'shield' },
      { label: 'Group Options', icon: 'users' },
      { label: 'Full-Day Tours', icon: 'calendar' },
    ],
    subServices: [
      {
        title: 'Denver Breweries',
        description: 'RiNo, LoHi, and Aurora brewery circuits.',
        image: img.brewery,
        icon: 'beer',
      },
      {
        title: 'Front Range Wineries',
        description: 'Palisade and Western Slope wine country (multi-day available).',
        image: img.brewery,
        icon: 'wine',
      },
      {
        title: 'Whiskey & Distillery',
        description: 'Curated stops at Colorado distilleries and tasting rooms.',
        image: img.brewery,
        icon: 'glass-water',
      },
      {
        title: 'Corporate Outings',
        description: 'Team-building tours with executive sprinters.',
        image: img.group,
        icon: 'briefcase',
      },
      {
        title: 'Private Tastings',
        description: 'Custom itineraries for celebrations and anniversaries.',
        image: img.brewery,
        icon: 'heart',
      },
    ],
  },
  {
    slug: 'group-transportation',
    number: 12,
    title: 'Group Transportation',
    shortDescription:
      'Coordinated luxury shuttles for corporate events, conventions, and large parties.',
    heroImage: img.group,
    intro:
      'From airport meet-and-greet waves to convention shuttles, we scale professional chauffeured service for groups of any size.',
    trustIcons: [
      { label: 'Fleet Coordination', icon: 'bus' },
      { label: 'Event Logistics', icon: 'calendar' },
      { label: 'Multiple Vehicles', icon: 'car' },
      { label: 'Dedicated Support', icon: 'headphones' },
    ],
    subServices: [
      {
        title: 'Convention Shuttles',
        description: 'Hotel-to-venue loops for trade shows and conferences.',
        image: img.group,
        icon: 'building',
      },
      {
        title: 'Airport Group Meet',
        description: 'Multiple-vehicle DIA pickups for delegations.',
        image: img.airport,
        icon: 'plane',
      },
      {
        title: 'Corporate Offsites',
        description: 'Team transport to retreats and mountain properties.',
        image: img.corporate,
        icon: 'briefcase',
      },
      {
        title: 'Wedding Guest Shuttles',
        description: 'Synchronized guest movement between venues.',
        image: img.wedding,
        icon: 'heart',
      },
      {
        title: 'Special Event Fleets',
        description: 'Multi-SUV deployments for galas and VIP arrivals.',
        image: img.group,
        icon: 'crown',
      },
    ],
  },
]

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug)
}

/**
 * Deterministic filename slug for a sub-service title. Maps to
 * /images/services/<service-slug>/<sub-service-slug>.jpeg
 */
export function subServiceSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
