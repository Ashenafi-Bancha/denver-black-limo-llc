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
      'Arrive or depart without watching the clock. We track your flight in real time and adjust pickup automatically when it is early or delayed, so your chauffeur is already waiting. Choose curbside or a meet-and-greet inside the terminal with luggage assistance, at Denver International and every regional airport we serve.',
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
      'Private aviation runs on its own schedule, so we work to your tail number rather than a timetable. Your chauffeur coordinates directly with your flight crew and FBO, then meets you planeside at Signature, Atlantic, jetCenter or Centennial. Bags move straight from aircraft to vehicle with no terminal and no waiting.',
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
      'Keep executives on schedule and clients impressed. Immaculate sedans and SUVs, chauffeurs trained in discretion, and quiet interiors you can take a call from between meetings. We handle multi-stop roadshows, client pickups and conference travel, with corporate billing and a named account contact for your assistant.',
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
      'Book a chauffeur and vehicle for a block of hours and use them however the day unfolds. Ideal for back-to-back meetings, shopping, dinner and a show, or a full day of appointments with luggage and bags left safely on board. Your driver waits at every stop, so you never wait for a ride or hunt for parking.',
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
      'I-70 in a storm is no place to learn. Our chauffeurs drive the mountain corridor year-round and know the passes, chain laws and the timing that keeps you ahead of ski traffic. All-wheel-drive luxury SUVs with winter tyres, ski and board racks, and door-to-door service to Vail, Aspen, Breckenridge, Keystone and beyond.',
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
      'Timing matters more than anything on a wedding day. We build a minute-by-minute plan around your ceremony and reception, then run it quietly in the background so nobody is left waiting. Bridal party limousines, guest shuttles between hotel and venue, and a decorated getaway car for the couple.',
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
      'Skip the canyon parking queue and the surge pricing. We drop you at the Red Rocks gate and are waiting in the same spot when the encore ends, no walk back up the hill in the dark. The same service covers Ball Arena, Mission Ballroom, Fiddler’s Green and every major Denver venue.',
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
      'Luxury transportation to Denver’s major sporting events with convenient pickup, professional chauffeurs, and stress-free travel.',
    heroImage: img.sports,
    intro:
      'Get to the game without the parking lot. We run to Empower Field for Broncos games, Ball Arena for Nuggets and Avalanche, Coors Field for the Rockies and DICK’S Sporting Goods Park for the Rapids. Tailgate parties, group vehicles for the whole section, and a chauffeur waiting outside the gate at the final whistle.',
    trustIcons: [
      { label: 'Game Day Travel', icon: 'ticket' },
      { label: 'Group Service', icon: 'users' },
      { label: 'Safe Pickup', icon: 'shield' },
      { label: 'On-Time Arrival', icon: 'clock' },
    ],
    subServices: [
      {
        title: 'Broncos',
        description: 'Ride in comfort to Empower Field and cheer on the Broncos.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Nuggets',
        description: 'Hassle-free transportation to Nuggets games at Ball Arena.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Avalanche',
        description: 'Arrive in style for Avalanche games at Ball Arena.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Rockies',
        description: 'Convenient rides to Coors Field for every Rockies game.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Rapids',
        description: 'Professional transportation to Rapids matches at DICK’S Sporting Goods Park.',
        image: img.sports,
        icon: 'trophy',
      },
      {
        title: 'Ball Arena',
        description: 'Your ride to concerts and sporting events at Ball Arena.',
        image: img.concert,
        icon: 'building',
      },
      {
        title: 'Empower Field',
        description: 'Stress-free travel to major events at Empower Field.',
        image: img.sports,
        icon: 'building',
      },
      {
        title: 'Coors Field',
        description: 'On-time arrivals for games, events, and special occasions.',
        image: img.sports,
        icon: 'building',
      },
    ],
  },
  {
    slug: 'bachelor-bachelorette',
    number: 9,
    title: 'Bachelor & Bachelorette Transportation',
    shortDescription:
      'Premium transportation for bachelor and bachelorette parties, nightlife, dinner, clubs, and celebration events.',
    heroImage: img.bachelor,
    intro:
      'Keep the whole group together and nobody stuck as designated driver. One chauffeur, one vehicle, every stop of the night — dinner, clubs, the brewery crawl, the late-night food run — running to a plan you set in advance. Party buses, limousines and Sprinters sized to your party, from a dozen friends to thirty.',
    trustIcons: [
      { label: 'Night Out', icon: 'sparkles' },
      { label: 'Group Travel', icon: 'users' },
      { label: 'Safe Ride', icon: 'shield' },
      { label: 'Luxury Experience', icon: 'gem' },
    ],
    subServices: [
      {
        title: 'Bachelor Parties',
        description: 'Epic bachelor party rides to bars, clubs, events, and unforgettable experiences.',
        image: img.bachelor,
        icon: 'party-popper',
      },
      {
        title: 'Bachelorette Parties',
        description: 'Celebrate in style with safe, comfortable, and luxurious transportation for the bride tribe.',
        image: img.bachelor,
        icon: 'crown',
      },
      {
        title: 'Night Out',
        description: 'Enjoy a night out with friends without worrying about driving, parking, or schedules.',
        image: img.hourly,
        icon: 'sparkles',
      },
      {
        title: 'Club Transportation',
        description: 'Door-to-door service to Denver’s hottest clubs and nightlife destinations.',
        image: img.concert,
        icon: 'martini',
      },
      {
        title: 'Dinner Transfers',
        description: 'Elegant transportation to and from restaurants and special celebration dinners.',
        image: img.city,
        icon: 'utensils',
      },
    ],
  },
  {
    slug: 'private-city-tours',
    number: 10,
    title: 'Private City Tours',
    shortDescription:
      'Explore Denver and Colorado in comfort with private chauffeured city tours designed around your schedule and interests.',
    heroImage: img.city,
    intro:
      'See Colorado from the back seat with someone else navigating. Private tours built around what you actually want to see, at your own pace, with as many stops and photo breaks as you like. Downtown landmarks and LoDo, Golden and Boulder, Garden of the Gods, or a full day in Rocky Mountain National Park.',
    trustIcons: [
      { label: 'Private Tour', icon: 'car' },
      { label: 'Custom Route', icon: 'route' },
      { label: 'Local Experience', icon: 'mountain' },
      { label: 'Comfortable Ride', icon: 'armchair' },
    ],
    subServices: [
      {
        title: 'Denver City Tours',
        description: 'Discover Denver’s top attractions, neighborhoods, landmarks, and hidden gems in comfort and style.',
        image: img.city,
        icon: 'building',
      },
      {
        title: 'Scenic Tours',
        description: 'Breathtaking drives through Colorado’s most scenic routes and iconic landscapes.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Golden',
        description: 'Visit the historic town of Golden, explore local shops, breweries, and Colorado history.',
        image: img.city,
        icon: 'pickaxe',
      },
      {
        title: 'Boulder',
        description: 'Enjoy a relaxing trip to Boulder for shopping, dining, university tours, and beautiful scenery.',
        image: img.mountain,
        icon: 'tree-pine',
      },
      {
        title: 'Garden of the Gods',
        description: 'Experience stunning red rock formations and panoramic views just outside Colorado Springs.',
        image: img.mountain,
        icon: 'mountain',
      },
      {
        title: 'Rocky Mountain National Park',
        description: 'Private tours to RMNP with breathtaking views, wildlife, and unforgettable adventures.',
        image: img.mountain,
        icon: 'trees',
      },
    ],
  },
  {
    slug: 'brewery-winery-whiskey',
    number: 11,
    title: 'Brewery, Winery & Whiskey Tours',
    shortDescription:
      'Enjoy Denver’s brewery, winery, and whiskey experiences with a private chauffeur so your group can relax and enjoy the day safely.',
    heroImage: img.brewery,
    intro:
      'Colorado’s best taprooms, wineries and distilleries are worth enjoying properly, which means nobody driving. We plan the route, handle the reservations timing and wait at every stop, from the RiNo brewery district to the wineries of Palisade and Denver’s craft distilleries. Custom stops welcome, no rush at any of them.',
    trustIcons: [
      { label: 'Private Chauffeur', icon: 'user-check' },
      { label: 'Safe Return', icon: 'shield' },
      { label: 'Custom Stops', icon: 'route' },
      { label: 'Group Experience', icon: 'users' },
    ],
    subServices: [
      {
        title: 'Brewery Tours',
        description: 'Visit Denver’s best breweries and taprooms. Taste local craft beer and enjoy a fun, worry-free experience.',
        image: img.brewery,
        icon: 'beer',
      },
      {
        title: 'Winery Tours',
        description: 'Explore Colorado’s beautiful wineries with private transportation and stunning views along the way.',
        image: img.brewery,
        icon: 'grape',
      },
      {
        title: 'Whiskey Tours',
        description: 'Experience premium whiskey and bourbon at top distilleries with a comfortable and safe ride for your group.',
        image: img.brewery,
        icon: 'glass-water',
      },
      {
        title: 'Distillery Tours',
        description: 'Tour local distilleries and sample handcrafted spirits with expert guides and exclusive access.',
        image: img.brewery,
        icon: 'flask',
      },
      {
        title: 'Custom Group Tours',
        description: 'Custom routes, multiple stops, and a private chauffeur for birthdays, celebrations, and corporate groups.',
        image: img.group,
        icon: 'users',
      },
    ],
  },
  {
    slug: 'group-transportation',
    number: 12,
    title: 'Group Transportation',
    shortDescription:
      'Comfortable and professional group transportation for corporate teams, families, events, schools, universities, and private groups.',
    heroImage: img.group,
    intro:
      'Moving a whole group is a logistics problem, not just a ride. We size the fleet to your headcount and run staggered arrivals so everyone lands together — executive Sprinters, mini coaches and full-size motor coaches. Corporate offsites, conference shuttles, school and university groups, family reunions and weddings.',
    trustIcons: [
      { label: 'Group Travel', icon: 'users' },
      { label: 'Large Capacity', icon: 'bus' },
      { label: 'Event Shuttle', icon: 'calendar' },
      { label: 'Professional Coordination', icon: 'user-check' },
    ],
    subServices: [
      {
        title: 'Executive Sprinter',
        description: 'Luxury sprinter vans perfect for small groups, executives, and VIP transportation.',
        image: img.group,
        icon: 'armchair',
      },
      {
        title: 'Shuttle Service',
        description: 'Reliable shuttle service for hotels, airports, events, and special occasions.',
        image: img.group,
        icon: 'bus',
      },
      {
        title: 'Mini Coach',
        description: 'Spacious and comfortable transportation for mid-sized groups and team travel.',
        image: img.group,
        icon: 'users',
      },
      {
        title: 'Motor Coach',
        description: 'Full-size motor coaches for large groups, long-distance travel, and major events.',
        image: img.group,
        icon: 'bus',
      },
      {
        title: 'Corporate Groups',
        description: 'Professional transportation solutions for corporate teams, conferences, and roadshows.',
        image: img.corporate,
        icon: 'briefcase',
      },
      {
        title: 'Family Groups',
        description: 'Safe, comfortable, and convenient travel for families, reunions, and private trips.',
        image: img.group,
        icon: 'users',
      },
    ],
  },
  {
    slug: 'vip-special-events',
    number: 13,
    title: 'VIP & Special Event Transportation',
    shortDescription:
      'Discreet, professional transportation for VIP guests, entertainers, executives, luxury events, and special occasions.',
    heroImage: img.aviation,
    intro:
      'Discretion first. We move celebrities, entertainers, executives and government officials on itineraries that stay private, with chauffeurs who have handled high-profile clients and know when not to speak. Immaculate vehicles, secure arrivals away from the main entrance, and coordination with your security team.',
    trustIcons: [
      { label: 'Discreet Service', icon: 'eye-off' },
      { label: 'VIP Experience', icon: 'crown' },
      { label: 'Luxury Vehicles', icon: 'car' },
      { label: 'Professional Chauffeurs', icon: 'user-check' },
    ],
    subServices: [
      {
        title: 'VIP Transportation',
        description:
          'Premium transportation designed for VIPs who expect privacy, comfort, and exceptional service.',
        image: img.chauffeur,
        icon: 'crown',
      },
      {
        title: 'Talent Transportation',
        description:
          'Reliable and discreet rides for artists, musicians, and entertainment crews to and from any event.',
        image: img.concert,
        icon: 'mic',
      },
      {
        title: 'Celebrity Transportation',
        description:
          'Discreet, secure, and first-class transportation for celebrities and high-profile individuals.',
        image: img.wedding,
        icon: 'star',
      },
      {
        title: 'Government Transportation',
        description:
          'Trusted transportation for government officials and authorized personnel with the highest level of professionalism.',
        image: img.corporate,
        icon: 'landmark',
      },
      {
        title: 'Special Events',
        description:
          'Luxury transportation for galas, conferences, private events, and once-in-a-lifetime occasions.',
        image: img.group,
        icon: 'wine',
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
