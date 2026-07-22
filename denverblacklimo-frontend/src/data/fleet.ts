export type FleetVehicle = {
  id: string
  name: string
  type: string
  capacity: string
  description: string
  image: string
}

export const fleet: FleetVehicle[] = [
  {
    id: 'luxury-sedan',
    name: 'Luxury Sedan',
    type: 'Luxury Sedan',
    capacity: 'Up to 3 passengers',
    description:
      'Premium sedan for airport transfers, corporate travel, and executive point-to-point service. Ideal for business meetings and discreet transportation.',
    image:
      '/images/hero2.jpg',
  },
  {
    id: 'executive-suv',
    name: 'Executive SUV',
    type: 'Executive SUV',
    capacity: 'Up to 6 passengers',
    description:
      'Full-size luxury SUV for corporate groups, airport runs, and business travel. Spacious interior with premium amenities.',
    image:
      '/images/hero2.jpg',
  },
  {
    id: 'escalade-luxury-suv',
    name: 'Cadillac Escalade',
    type: 'Luxury SUV',
    capacity: 'Up to 7 passengers',
    description:
      'The ultimate luxury SUV experience. Perfect for VIP transportation, corporate events, and special occasions requiring maximum comfort and presence.',
    image:
      '/images/hero2.jpg',
  },
  {
    id: 'sprinter-van',
    name: 'Executive Sprinter Van',
    type: 'Sprinter Van',
    capacity: 'Up to 14 passengers',
    description:
      'Spacious executive van with comfortable seating. Ideal for group transportation, corporate teams, airport shuttles, and event logistics.',
    image:
      '/images/hero2.jpg',
  },
  {
    id: 'stretch-limo',
    name: 'Stretch Limousine',
    type: 'Stretch Limousine',
    capacity: 'Up to 10 passengers',
    description:
      'Classic stretch limousine for weddings, proms, bachelor/bachelorette parties, and VIP celebrations. Complete with premium sound system and party lighting.',
    image:
      '/images/hero2.jpg',
  },
  {
    id: 'motorcoach-party-bus',
    name: 'Motorcoach / Party Bus',
    type: 'Motorcoach / Party Bus',
    capacity: 'Up to 25 passengers',
    description:
      'Premium party bus for large group events, weddings, corporate parties, and nightlife tours. Features luxury seating, sound system, and entertainment options.',
    image:
      '/images/hero2.jpg',
  },
]
