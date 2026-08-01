import { IMAGES } from '../config/images'

export type FleetVehicle = {
  id: string
  /** Position — also maps to /images/fleet/fleet-<number>.jpeg */
  number: number
  name: string
  type: string
  /** Passenger capacity, e.g. "3" or "Up to 28" */
  passengers: string
  /** Luggage capacity, e.g. "3", "Varies", "Up to 48" */
  luggage: string
  /** Legacy display string kept for CMS back-compat */
  capacity: string
  description: string
  /** Comma-separated "Best for" list shown in details + comparison table */
  bestFor: string
  image: string
}

export const fleet: FleetVehicle[] = [
  {
    id: 'luxury-sedan',
    number: 1,
    name: 'Luxury Sedan',
    type: 'Sedan',
    passengers: '3',
    luggage: '3',
    capacity: 'Up to 3 Passengers, 3 Luggage',
    description: 'Ideal for airport transfers, private travel, and business transportation.',
    bestFor: 'Airport Transfers, Business Travel, Private Rides',
    image: IMAGES.hero2,
  },
  {
    id: 'executive-sedan',
    number: 2,
    name: 'Executive Sedan',
    type: 'Sedan',
    passengers: '3',
    luggage: '3',
    capacity: 'Up to 3 Passengers, 3 Luggage',
    description: 'A professional choice for executives, meetings, and corporate guests.',
    bestFor: 'Executives, Meetings, Corporate Guests',
    image: IMAGES.hero2,
  },
  {
    id: 'luxury-suv',
    number: 3,
    name: 'Luxury SUV',
    type: 'SUV',
    passengers: '6',
    luggage: '6',
    capacity: 'Up to 6 Passengers, 6 Luggage',
    description: 'Spacious transportation for families, airports, VIP service, and mountain travel.',
    bestFor: 'Families, Airports, VIPs, Mountain Travel',
    image: IMAGES.hero2,
  },
  {
    id: 'executive-suv',
    number: 4,
    name: 'Executive SUV',
    type: 'SUV',
    passengers: '6',
    luggage: '6',
    capacity: 'Up to 6 Passengers, 6 Luggage',
    description: 'Premium comfort for executives, corporate groups, and special guests.',
    bestFor: 'Corporate Executives, VIP Service, Special Guests',
    image: IMAGES.hero2,
  },
  {
    id: 'van',
    number: 5,
    name: 'Van',
    type: 'Van',
    passengers: '14',
    luggage: '14',
    capacity: 'Up to 14 Passengers, 14 Luggage',
    description: 'Practical group transportation for airport transfers, events, and private groups.',
    bestFor: 'Group Travel, Airport Transfers, Events',
    image: IMAGES.hero2,
  },
  {
    id: 'luxury-van',
    number: 6,
    name: 'Luxury Van',
    type: 'Van',
    passengers: '14',
    luggage: '14',
    capacity: 'Up to 14 Passengers, 14 Luggage',
    description: 'Upscale transportation for corporate groups, weddings, and long-distance travel.',
    bestFor: 'Corporate Groups, Weddings, Long-Distance Travel',
    image: IMAGES.hero2,
  },
  {
    id: 'mini-coach',
    number: 7,
    name: 'Mini Coach',
    type: 'Coach',
    passengers: '13',
    luggage: '14',
    capacity: 'Up to 13 Passengers, 14 Luggage',
    description: 'Ideal for conferences, tours, airport groups, and special events.',
    bestFor: 'Conferences, Tours, Airport Groups, Events',
    image: IMAGES.hero2,
  },
  {
    id: 'limo-bus',
    number: 8,
    name: 'Limo Bus',
    type: 'Bus',
    passengers: 'Up to 28',
    luggage: 'Varies',
    capacity: 'Up to 28 Passengers',
    description: 'Designed for nightlife, concerts, celebrations, and bachelor or bachelorette parties.',
    bestFor: 'Parties, Concerts, Nightlife, Celebrations',
    image: IMAGES.hero2,
  },
  {
    id: 'motor-coach',
    number: 9,
    name: 'Motor Coach',
    type: 'Coach',
    passengers: 'Up to 55',
    luggage: 'Up to 48',
    capacity: 'Up to 55 Passengers, 48 Luggage',
    description: 'Best for large groups, conventions, tours, sporting events, and major group travel.',
    bestFor: 'Large Groups, Conventions, Tours, Sporting Events',
    image: IMAGES.hero2,
  },
]
