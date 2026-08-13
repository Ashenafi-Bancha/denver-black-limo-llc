/**
 * Free address lookup (no API key, no billing account).
 *
 * Uses Photon, Komoot's OpenStreetMap geocoder, which is built for
 * search-as-you-type. Results are biased toward Denver and limited to the US.
 *
 * Photon returns coordinates alongside each result. The booking form only ever
 * needed the text, but the price estimator has to measure a route, so
 * `searchPlaces` keeps the coordinates and `searchAddresses` stays as the
 * labels-only view for callers that do not care.
 */

const ENDPOINT = 'https://photon.komoot.io/api/'
// Bias results toward the Denver metro area.
const BIAS = { lat: 39.7392, lon: -104.9903 }

interface PhotonProps {
  name?: string
  housenumber?: string
  street?: string
  city?: string
  state?: string
  postcode?: string
  countrycode?: string
}

/** Turns a Photon result into a single human-readable address line. */
function formatAddress(p: PhotonProps): string {
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ')
  const parts: string[] = []

  // Landmarks/businesses lead with their name (e.g. "Red Rocks Amphitheatre"), but
  // skip it when it only repeats the street or the city — Photon returns
  // name="Vail" with city="Vail" for resort towns, which read as "Vail, Vail, Colorado".
  if (p.name && p.name !== p.street && p.name !== p.city) parts.push(p.name)
  if (streetLine && streetLine !== p.name) parts.push(streetLine)

  const cityState = [p.city, p.state].filter(Boolean).join(', ')
  const tail = [cityState, p.postcode].filter(Boolean).join(' ').trim()
  if (tail) parts.push(tail)

  return parts.join(', ')
}

/** An address the user picked, with the coordinates needed to measure a route. */
export interface Place {
  label: string
  lat: number
  lng: number
}

/** Up to 6 US suggestions, with coordinates. Never throws. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=8&lang=en&lat=${BIAS.lat}&lon=${BIAS.lon}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as {
      features?: { properties: PhotonProps; geometry?: { coordinates?: [number, number] } }[]
    }

    const seen = new Set<string>()
    const out: Place[] = []
    for (const feature of data.features ?? []) {
      const p = feature.properties
      if (p.countrycode && p.countrycode !== 'US') continue
      const label = formatAddress(p)
      if (!label || seen.has(label)) continue

      // GeoJSON orders coordinates [longitude, latitude], the reverse of how
      // they are written everywhere else in this codebase.
      const coords = feature.geometry?.coordinates
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue

      seen.add(label)
      out.push({ label, lng: coords[0], lat: coords[1] })
      if (out.length === 6) break
    }
    return out
  } catch {
    // Aborted or offline: fall back to plain typing.
    return []
  }
}

/** Labels only, for callers that do not need coordinates. */
export async function searchAddresses(query: string, signal?: AbortSignal): Promise<string[]> {
  return (await searchPlaces(query, signal)).map((p) => p.label)
}
