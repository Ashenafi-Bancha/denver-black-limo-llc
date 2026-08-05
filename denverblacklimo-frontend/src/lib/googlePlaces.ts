/**
 * Google Places address autocomplete.
 *
 * Activates only when `VITE_GOOGLE_MAPS_API_KEY` is set at build time. Without a
 * key every field keeps working as a normal text input, so the booking form is
 * never blocked by a missing key.
 */
import { useEffect, useRef } from 'react'

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

let loader: Promise<boolean> | null = null

/** True when a Google Maps key is configured at build time. */
export function hasGoogleKey(): boolean {
  return Boolean(KEY)
}

/** Loads the Maps JS API once; resolves false when unavailable. */
export function loadGooglePlaces(): Promise<boolean> {
  if (!KEY || typeof window === 'undefined') return Promise.resolve(false)
  if (loader) return loader

  loader = new Promise<boolean>((resolve) => {
    const w = window as unknown as { google?: { maps?: { places?: unknown } } }
    if (w.google?.maps?.places) return resolve(true)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async`
    script.async = true
    script.onload = () => resolve(Boolean(w.google?.maps?.places))
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
  return loader
}

/**
 * Attaches Places autocomplete to an input. Returns the ref to spread onto it.
 * `onSelect` receives the chosen formatted address.
 */
export function useAddressAutocomplete(onSelect: (address: string) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const handler = useRef(onSelect)
  handler.current = onSelect

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let widget: any = null

    loadGooglePlaces().then((ready) => {
      if (!ready || cancelled || !ref.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      widget = new g.maps.places.Autocomplete(ref.current, {
        fields: ['formatted_address', 'name'],
        componentRestrictions: { country: 'us' },
      })
      widget.addListener('place_changed', () => {
        const place = widget.getPlace()
        const text = place?.formatted_address || place?.name
        if (text) handler.current(text)
      })
    })

    return () => {
      cancelled = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      if (widget && g?.maps?.event) g.maps.event.clearInstanceListeners(widget)
    }
  }, [])

  return ref
}
