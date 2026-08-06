/**
 * Free address lookup (no API key, no billing account).
 *
 * Uses Photon — Komoot's OpenStreetMap geocoder, which is built for
 * search-as-you-type. Results are biased toward Denver and limited to the US.
 * When a Google Maps key is configured, PlaceInput uses Google instead and this
 * module is never called.
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

/** Returns up to 6 US address suggestions for the query. Never throws. */
export async function searchAddresses(query: string, signal?: AbortSignal): Promise<string[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=8&lang=en&lat=${BIAS.lat}&lon=${BIAS.lon}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as { features?: { properties: PhotonProps }[] }

    const seen = new Set<string>()
    const out: string[] = []
    for (const feature of data.features ?? []) {
      const p = feature.properties
      if (p.countrycode && p.countrycode !== 'US') continue
      const label = formatAddress(p)
      if (!label || seen.has(label)) continue
      seen.add(label)
      out.push(label)
      if (out.length === 6) break
    }
    return out
  } catch {
    // Aborted or offline — fall back to plain typing.
    return []
  }
}
