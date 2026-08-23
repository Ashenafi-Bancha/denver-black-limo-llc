import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2, PlaneLanding, PlaneTakeoff } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * Checks a flight against the airline's published schedule while the
 * customer is still filling in the booking form, and hands the result back so
 * the form can fill the arrival time itself.
 *
 * Quietly does nothing until there is a plausible flight number and a date,
 * waits for typing to pause, and cancels a lookup the moment the inputs
 * change - the provider's monthly quota is small, and most of it would
 * otherwise go on half-typed numbers.
 */

export interface FlightInfo {
  number: string
  airline: string
  from: { city: string; iata: string }
  to: { city: string; iata: string }
  /** Local time at the airport the customer meets us at, "HH:MM". */
  denverTime: string
  denverDate: string
  kind: 'arrival' | 'departure' | 'none'
  servesDenver: boolean
  /** One line for the reservation receipt and the office. */
  summary: string
}

type Status =
  | { state: 'idle' }
  | { state: 'checking'; flight: string }
  | { state: 'found'; info: FlightInfo }
  | { state: 'not_found'; flight: string }
  | { state: 'unavailable' }

interface LookupResult {
  found: boolean
  reason?: string
  number?: string
  airline?: { name: string; iata: string }
  departure?: { iata: string; city: string; date: string; time: string }
  arrival?: { iata: string; city: string; date: string; time: string }
  servesDenver?: boolean
  kind?: 'arrival' | 'departure' | 'none'
}

/** "14:05" -> "2:05 PM" */
export function clock12(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return hhmm
  const h = Number(m[1])
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

/** "2026-08-25" -> "Tue, Aug 25" */
function shortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * The customer may type "26" next to a selected airline, or "UA26", or
 * "UA 0026". Resolve to "UA26", or null when it is not yet a flight number.
 */
export function composeFlight(airlineCode: string | undefined, typed: string): string | null {
  const raw = typed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!raw) return null
  // An IATA airline code is two characters with at least one letter (UA, 9W,
  // B6), so "2672" is a bare flight number, not airline "26" flight "72".
  const hasCode = /^(?:[A-Z][A-Z0-9]|[0-9][A-Z])\d/.test(raw)
  const withCode = hasCode ? raw : airlineCode ? `${airlineCode.toUpperCase()}${raw}` : ''
  const m = withCode.match(/^((?:[A-Z][A-Z0-9]|[0-9][A-Z]))0*(\d{1,4}[A-Z]?)$/)
  return m ? `${m[1]}${m[2]}` : null
}

function toInfo(r: LookupResult, direction: 'Arrival' | 'Departure'): FlightInfo {
  const dep = r.departure || { iata: '', city: '', date: '', time: '' }
  const arr = r.arrival || { iata: '', city: '', date: '', time: '' }
  const kind = r.kind || 'none'
  const denverSide = kind === 'departure' ? dep : arr
  const route = `${dep.city} (${dep.iata}) → ${arr.city} (${arr.iata})`
  const when =
    kind === 'departure'
      ? `departs DEN ${clock12(dep.time)}`
      : kind === 'arrival'
        ? `arrives DEN ${clock12(arr.time)}`
        : direction === 'Arrival'
          ? `arrives ${arr.iata} ${clock12(arr.time)}`
          : `departs ${dep.iata} ${clock12(dep.time)}`
  return {
    number: r.number || '',
    airline: r.airline?.name || '',
    from: { city: dep.city, iata: dep.iata },
    to: { city: arr.city, iata: arr.iata },
    denverTime: denverSide.time,
    denverDate: denverSide.date,
    kind,
    servesDenver: Boolean(r.servesDenver),
    summary: `${r.number} · ${r.airline?.name || ''} · ${route} · ${when} on ${shortDate(denverSide.date)} · verified against the airline schedule`,
  }
}

export function FlightCheck({
  airlineCode,
  flightNumber,
  date,
  direction,
  onResult,
}: {
  airlineCode?: string
  flightNumber: string
  date: string
  direction: 'Arrival' | 'Departure'
  /** Called with the verified flight, or null whenever the inputs change or nothing is found. */
  onResult: (info: FlightInfo | null) => void
}) {
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const flight = composeFlight(airlineCode, flightNumber)
  const ready = Boolean(flight && /^\d{4}-\d{2}-\d{2}$/.test(date))

  useEffect(() => {
    // Every change invalidates whatever was verified before.
    onResultRef.current(null)
    if (!ready || !flight) {
      setStatus({ state: 'idle' })
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setStatus({ state: 'checking', flight })
      try {
        const url = `${API_URL}/flights/lookup?flight=${encodeURIComponent(flight)}&date=${date}&direction=${direction.toLowerCase()}`
        const res = await fetch(url, { signal: controller.signal })
        const data = (await res.json()) as LookupResult
        if (controller.signal.aborted) return
        if (data.found) {
          const info = toInfo(data, direction)
          setStatus({ state: 'found', info })
          onResultRef.current(info)
        } else if (data.reason === 'not_found') {
          setStatus({ state: 'not_found', flight })
        } else {
          setStatus({ state: 'unavailable' })
        }
      } catch {
        if (!controller.signal.aborted) setStatus({ state: 'unavailable' })
      }
    }, 700)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [flight, date, direction, ready])

  if (status.state === 'idle') return null

  const Icon = direction === 'Arrival' ? PlaneLanding : PlaneTakeoff

  if (status.state === 'checking') {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking {status.flight} with the airline schedule…
      </p>
    )
  }

  if (status.state === 'found') {
    const { info } = status
    const good = info.servesDenver
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border p-4 ${good ? 'border-[#bbf7d0] bg-[#f0fdf4]' : 'border-amber-200 bg-amber-50'}`}
      >
        <p className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${good ? 'text-[#166534]' : 'text-amber-800'}`}>
          {good ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {good ? 'Flight verified' : 'Please check this flight'}
        </p>
        <p className={`mt-1 flex items-start gap-2 text-sm font-semibold ${good ? 'text-[#166534]' : 'text-amber-900'}`}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {info.number} · {info.airline} · {info.from.city} ({info.from.iata}) → {info.to.city} ({info.to.iata})
            {good && info.denverTime ? (
              <>
                {' '}· {info.kind === 'departure' ? 'departs' : 'arrives'} Denver{' '}
                <b>{clock12(info.denverTime)}</b> on {shortDate(info.denverDate)}
              </>
            ) : null}
          </span>
        </p>
        <p className={`mt-1 text-xs ${good ? 'text-[#15803d]' : 'text-amber-800'}`}>
          {good
            ? info.kind === 'arrival'
              ? 'We filled in your arrival time from the airline schedule. Your chauffeur will track this flight on the day.'
              : 'Tell us what time you would like to be picked up; we recommend arriving at DEN at least two hours before a domestic departure.'
            : `This flight does not ${direction === 'Arrival' ? 'arrive in' : 'depart from'} Denver on that date. Please double-check the number and date; we will confirm it with you either way.`}
        </p>
      </motion.div>
    )
  }

  if (status.state === 'not_found') {
    return (
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Flight not found
        </p>
        <p className="mt-1 text-sm text-amber-900">
          We could not find <b>{status.flight}</b> on {shortDate(date)} in the airline schedule. Please double-check the
          number and date. You can still send the request; we will confirm the flight with you.
        </p>
      </motion.div>
    )
  }

  return (
    <p className="text-xs text-gray-500">We will verify your flight details with you when we confirm the reservation.</p>
  )
}
