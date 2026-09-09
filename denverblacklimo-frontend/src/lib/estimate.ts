import { searchPlaces } from './geocode'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * Asking the pricing engine what a trip costs, from the words a booking is
 * written in.
 *
 * Bookings record addresses as text and vehicles by their showroom names, but
 * the engine works in coordinates and fleet ids. This is the one place that
 * translation happens, so the price a customer is shown while booking and the
 * price the office is offered while quoting come from the same request.
 */

export interface EstimateLine {
  label: string
  amount: number
}

export interface EstimateResult {
  quotable: boolean
  reason?: string
  currency?: string
  total?: number
  lines?: EstimateLine[]
}

/** The names the office and the booking form use, mapped onto fleet ids. */
const VEHICLE_IDS: Record<string, string> = {
  'luxury sedan': 'luxury-sedan',
  'standard sedan': 'luxury-sedan',
  'executive sedan': 'luxury-sedan',
  'luxury suv': 'luxury-suv',
  'executive suv': 'executive-suv',
  'cadillac escalade esv': 'executive-suv',
  'sprinter van': 'luxury-van',
  'luxury van': 'luxury-van',
  'mini coach': 'mini-coach',
  'stretch limousine': 'limo-bus',
  'party bus': 'limo-bus',
  'limo bus': 'limo-bus',
  'motor coach': 'motor-coach',
}

export function vehicleIdFor(vehicleName: string): string {
  return VEHICLE_IDS[(vehicleName || '').toLowerCase().trim()] || 'luxury-sedan'
}

/** The engine's service ids, from the free-text service on a booking. */
export function serviceIdFor(serviceType: string): string {
  const s = (serviceType || '').toLowerCase()
  if (s.includes('hourly') || s.includes('tour') || s.includes('brewery') || s.includes('winery')) return 'hourly'
  if (s.includes('mountain') || s.includes('resort')) return 'mountain'
  if (s.includes('airport') || s.includes('aviation') || s.includes('fbo')) return 'airport'
  return 'point-to-point'
}

/**
 * Prices a trip described in plain text. Resolves to null when it cannot be
 * priced for any reason — an address that will not geocode, a rate card that
 * is not ready, a network that is down. Callers show nothing in that case:
 * an estimate is a courtesy, and no page should break for want of one.
 */
export async function estimateTrip(
  {
    serviceType,
    vehicleName,
    pickup,
    dropoff,
    date,
    time,
    hours,
  }: {
    serviceType: string
    vehicleName: string
    pickup: string
    dropoff: string
    date: string
    time?: string
    hours?: number
  },
  signal?: AbortSignal
): Promise<EstimateResult | null> {
  const service = serviceIdFor(serviceType)
  const hourly = service === 'hourly'
  if (!pickup.trim() || (!hourly && !dropoff.trim()) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  try {
    // Hourly work is priced by the clock, so it needs no destination.
    const [from] = await searchPlaces(pickup, signal)
    const to = hourly ? null : (await searchPlaces(dropoff, signal))[0]
    if (!from || (!hourly && !to)) return null

    const res = await fetch(`${API_URL}/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        serviceType: service,
        vehicleId: vehicleIdFor(vehicleName),
        pickup: { lat: from.lat, lng: from.lng, label: from.label },
        dropoff: to ? { lat: to.lat, lng: to.lng, label: to.label } : null,
        pickupDate: date,
        pickupTime: /^\d{2}:\d{2}$/.test(time || '') ? time : '12:00',
        hours: hourly ? hours || 3 : undefined,
        extras: {},
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as EstimateResult
  } catch {
    return null
  }
}
