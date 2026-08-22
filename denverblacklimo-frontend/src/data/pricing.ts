/**
 * Pricing page content.
 *
 * Rates follow the client-approved Arion rate card, matched to our fleet by
 * vehicle class and capacity. Any row left blank renders as "Coming soon", so
 * the page never shows a price the business has not set.
 */

export interface RateRow {
  vehicle: string
  capacity: string
  /** e.g. "125" — leave blank to show "Request Quote" */
  hourlyRate: string
  /** e.g. "2 hours" */
  minimumHours: string
}

export interface PricingItem {
  title: string
  text: string
  icon: string
}

export interface PricingContent {
  eyebrow: string
  title: string
  subtitle: string
  intro: string
  currency: string
  models: PricingItem[]
  includedTitle: string
  included: PricingItem[]
  ratesTitle: string
  ratesNote: string
  /**
   * Shown beside the minimum on each homepage rate card. Those cards are the
   * first price a visitor sees and have none of the Pricing page's surrounding
   * detail, so the caveat has to travel with the number itself.
   */
  ratesFeesNote: string
  rates: RateRow[]
  policiesTitle: string
  policies: PricingItem[]
  disclaimer: string
}

export const defaultPricing: PricingContent = {
  eyebrow: 'Transparent Pricing',
  title: 'Straightforward Rates, No Surprises',
  subtitle:
    'Clear pricing, professional chauffeurs, and every cost explained before you ride.',
  intro:
    'We believe luxury transportation should be simple to understand. Every quote we provide includes your chauffeur, the vehicle, taxes and fees — confirmed in writing before your trip so there are no surprises on the day.',
  currency: '$',

  models: [
    {
      title: 'Hourly / As Directed',
      text: 'A dedicated chauffeur and vehicle for a set number of hours — ideal for events, roadshows, nights out and full-day itineraries with multiple stops.',
      icon: 'clock',
    },
    {
      title: 'Point-to-Point',
      text: 'A fixed price from your pickup address to your destination. Best for straightforward transfers between two locations.',
      icon: 'route',
    },
    {
      title: 'Airport & Private Aviation',
      text: 'Flight-tracked transfers to DIA, Centennial, Eagle County and private FBO terminals, with meet & greet and luggage assistance included.',
      icon: 'plane',
    },
  ],

  includedTitle: 'Always Included',
  included: [
    { title: 'Professional Chauffeur', text: 'Background-checked, courteous, and trained in discretion.', icon: 'user-check' },
    { title: 'Flight Tracking', text: 'We monitor your flight and adjust pickup times automatically.', icon: 'radar' },
    { title: 'Meet & Greet', text: 'Personal welcome inside the terminal with luggage assistance.', icon: 'luggage' },
    { title: 'Licensed & Insured', text: 'Commercially licensed, fully insured, professionally maintained vehicles.', icon: 'shield' },
    { title: 'Taxes & Fees Quoted', text: 'Your quote includes taxes and standard fees — no hidden charges.', icon: 'file-text' },
    { title: '24/7 Availability', text: 'Day or night, weekday or holiday, our team is reachable.', icon: 'clock' },
  ],

  ratesTitle: 'Vehicle Rates',
  ratesNote:
    'Hourly rates below are starting prices. Every hourly trip includes up to 40 miles of travel per hour; longer routes are quoted per mile before you book. Gratuity and taxes are not included. Long-distance, mountain and event travel are quoted individually.',

  ratesFeesNote: 'plus fees & gratuity',

  rates: [
    // Kept in step with the rates set in the admin — these are what a visitor
    // sees before the live content loads, so a stale figure here is a wrong
    // price on screen and in whatever Google indexed.
    { vehicle: 'Luxury Sedan', capacity: '3 passengers · 3 bags', hourlyRate: '100', minimumHours: '3 hours' },
    { vehicle: 'Luxury SUV', capacity: '6 passengers · 6 bags', hourlyRate: '150', minimumHours: '3 hours' },
    { vehicle: 'Executive SUV', capacity: '6 passengers · 6 bags', hourlyRate: '125', minimumHours: '3 hours' },
    { vehicle: 'Luxury Van', capacity: '14 passengers · 14 bags', hourlyRate: '250', minimumHours: '3 hours' },
    { vehicle: 'Mini Coach', capacity: '13 passengers · 14 bags', hourlyRate: '275', minimumHours: '4 hours' },
    { vehicle: 'Limo Bus', capacity: 'Up to 28 passengers', hourlyRate: '325', minimumHours: '4 hours' },
    { vehicle: 'Motor Coach', capacity: 'Up to 55 passengers', hourlyRate: '425', minimumHours: '4 hours' },
  ],

  policiesTitle: 'Our Booking Policies',
  policies: [
    {
      title: 'Quote Before You Ride',
      text: 'Every reservation is confirmed with a written quote. You approve the price before your trip begins.',
      icon: 'file-text',
    },
    {
      title: 'Cancellations & Refunds',
      text: 'Airport transfers need 24 hours notice. Sedans and SUVs on other trips need 72 hours, executive vans and limos 7 days, coaches and charters 14 days. Deposits are non-refundable, and late cancellations or no-shows are charged in full.',
      icon: 'calendar',
    },
    {
      title: 'Payment & Deposits',
      text: 'Airport and FBO pick-ups are paid in full when you book. Other reservations take a 50% deposit, with the balance due by vehicle class. The card on file covers the quoted rate plus any extra time, stops, tolls, parking or damages.',
      icon: 'credit-card',
    },
    {
      title: 'Changes to Your Booking',
      text: 'Plans shift. Call or text us as early as you can and we will move your time, vehicle or route wherever availability allows — there is no charge for a change we can accommodate.',
      icon: 'file-text',
    },
    {
      title: 'Gratuity at Your Discretion',
      text: 'Tips are never automatically added. If your chauffeur takes great care of you, it is entirely your choice.',
      icon: 'heart',
    },
    {
      title: 'Wait Time & Extra Stops',
      text: 'Reasonable airport wait time is included. Additional stops or extended waiting are quoted upfront.',
      icon: 'map-pin',
    },
    {
      title: 'Advance Booking',
      text: 'We recommend booking early for weddings, ski season and major events. Same-day requests are welcome — call us.',
      icon: 'clock',
    },
    {
      title: 'Safety First',
      text: 'Every vehicle is inspected and cleaned before each ride, and driven by an experienced professional chauffeur.',
      icon: 'shield',
    },
    {
      title: '40 Miles Included Per Hour',
      text: 'Hourly bookings include up to 40 miles of travel for each hour reserved. Longer routes are priced per mile and shown to you before you confirm.',
      icon: 'route',
    },
    {
      title: 'No Surge Pricing',
      text: 'Our rates stay the same on holidays, peak weekends and busy ski days. The price you are quoted is the price you pay.',
      icon: 'shield',
    },
  ],

  disclaimer:
    'Rates shown are starting prices for planning purposes and do not constitute a final quote. Final pricing depends on date, duration, distance, vehicle availability and trip requirements, and is confirmed by our team before your reservation.',
}
