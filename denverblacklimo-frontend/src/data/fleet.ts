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
    description: 'Elevate every journey with refined comfort, quiet luxury, and first-class service.',
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
    description: 'Sophisticated comfort and modern style for business travel and beyond.',
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
    description: 'Spacious luxury, first-class comfort — built for every journey.',
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
    description: 'Spacious, powerful, and built for comfort. The perfect choice for executive travel.',
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
    description: 'Reliable and spacious transportation for groups, events, and airport transfers.',
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
    description: 'Spacious, versatile, and designed for group travel with premium comfort and convenience.',
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
    description: 'Comfortable, spacious, and built for group travel, events, and special occasions.',
    bestFor: 'Conferences, Tours, Airport Groups, Events',
    image: IMAGES.hero2,
  },
  {
    id: 'limo-bus',
    number: 8,
    name: 'Limo Bus',
    type: 'Bus',
    passengers: '28',
    luggage: 'Varies',
    capacity: 'Up to 28 Passengers',
    description: 'Executive transportation for large groups. Spacious, stylish, and built for comfort — perfect for events, celebrations, and special occasions.',
    bestFor: 'Parties, Concerts, Nightlife, Celebrations',
    image: IMAGES.hero2,
  },
  {
    id: 'motor-coach',
    number: 9,
    name: 'Motor Coach',
    type: 'Coach',
    passengers: '55',
    luggage: '48',
    capacity: 'Up to 55 Passengers, 48 Luggage',
    description: 'The ultimate solution for large groups. Plush, spacious, and built for long-distance travel with comfort and style.',
    bestFor: 'Large Groups, Conventions, Tours, Sporting Events',
    image: IMAGES.hero2,
  },
]
