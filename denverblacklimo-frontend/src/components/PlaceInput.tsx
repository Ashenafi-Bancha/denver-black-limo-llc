import { useEffect, useRef, useState } from 'react'
import { hasGoogleKey, useAddressAutocomplete } from '../lib/googlePlaces'
import { searchAddresses } from '../lib/geocode'

/**
 * Address input with suggestions.
 *
 * - With `VITE_GOOGLE_MAPS_API_KEY` set → Google Places (its own dropdown).
 * - Without a key → free OpenStreetMap lookup with the dropdown below.
 * Typing always works either way, so the form is never blocked.
 */
export function PlaceInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const usingGoogle = hasGoogleKey()
  const googleRef = useAddressAutocomplete(onChange)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  // Set right after a pick so the resulting value change doesn't re-open the list.
  const justPicked = useRef(false)

  // ── Free lookup (only when Google isn't configured) ──
  useEffect(() => {
    if (usingGoogle) return
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const q = value.trim()
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(async () => {
      const list = await searchAddresses(q, controller.signal)
      if (controller.signal.aborted) return
      setSuggestions(list)
      setActive(-1)
      setOpen(list.length > 0)
      setLoading(false)
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      setLoading(false)
    }
  }, [value, usingGoogle])

  // Close the list when clicking elsewhere.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const pick = (address: string) => {
    justPicked.current = true
    onChange(address)
    setOpen(false)
    setSuggestions([])
    setActive(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        ref={googleRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        style={{ ['--gold' as string]: '#c9a227' }}
      />

      {loading && !open && value.trim().length >= 3 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-gray-400">
          …
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={`${s}-${i}`}>
              <button
                type="button"
                // Keep focus in the input so blur doesn't close the list first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                  i === active ? 'bg-[#fdf6e3] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
