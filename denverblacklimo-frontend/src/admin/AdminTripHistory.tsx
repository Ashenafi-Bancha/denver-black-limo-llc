import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, Loader2, MapPin, Timer } from 'lucide-react'

/**
 * What the chauffeur did on a trip, and when.
 *
 * This is the evidence behind a wait-time charge, a no-show, or a claim that
 * nobody came. The driver app records each press; this is where the office
 * reads it back.
 *
 * It is careful about one thing in particular. The agreement bills wait time
 * "after the scheduled pick-up time in 15-minute increments", and for airport
 * work the clock starts 30 minutes after gate arrival — an hour for
 * international. Gate arrival is not something this system knows, and the
 * scheduled pick-up is stored as local wall-clock text while the events are
 * absolute timestamps. Subtracting one from the other would silently be hours
 * out for anyone viewing from another timezone.
 *
 * So it reports only what it can stand behind: the gap between two recorded
 * events, which share a clock. The office applies the policy to that.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface TripEvent {
  status: string
  driver_name: string | null
  occurred_at: string
  recorded_at: string
  lat: string | number | null
  lng: string | number | null
  note: string | null
}

const LABELS: Record<string, string> = {
  en_route: 'On the way',
  arrived: 'Arrived at pick-up',
  on_board: 'Passenger on board',
  dropped_off: 'Dropped off',
  no_show: 'No-show',
}

const TONES: Record<string, string> = {
  en_route: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  arrived: 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold',
  on_board: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  dropped_off: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  no_show: 'border-red-500/40 bg-red-500/10 text-red-300',
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtFull = (iso: string) => new Date(iso).toLocaleString()

/** Minutes, rounded up to the 15-minute increments the agreement bills in. */
function increments(minutes: number) {
  return Math.ceil(minutes / 15)
}

export function AdminTripHistory({
  bookingId,
  token,
  serviceType,
}: {
  bookingId: string
  token: string | null
  serviceType?: string | null
}) {
  const [events, setEvents] = useState<TripEvent[] | null>(null)
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/events`, { headers })
      if (!res.ok) throw new Error()
      setEvents(await res.json())
    } catch {
      setError('Could not load the trip history.')
    }
  }, [bookingId, headers])

  useEffect(() => {
    load()
  }, [load])

  // Both ends come from the same clock, so this subtraction is safe. Anything
  // involving the scheduled pick-up deliberately is not.
  const wait = useMemo(() => {
    if (!events?.length) return null
    const arrived = events.find((e) => e.status === 'arrived')
    if (!arrived) return null
    const ended = events.find(
      (e) => e.status === 'on_board' || e.status === 'dropped_off' || e.status === 'no_show'
    )
    if (!ended) return null
    const minutes = Math.round(
      (new Date(ended.occurred_at).getTime() - new Date(arrived.occurred_at).getTime()) / 60000
    )
    if (minutes < 1) return null
    return { minutes, from: arrived.occurred_at, to: ended.occurred_at, endedWith: ended.status }
  }, [events])

  const hourly = /hourly|tour/i.test(serviceType || '')
  const airport = /airport|aviation|fbo/i.test(serviceType || '')

  if (error) return <p className="text-sm text-white/40">{error}</p>
  if (!events) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trip history&hellip;
      </p>
    )
  }
  if (!events.length) {
    return (
      <p className="rounded border border-white/10 bg-brand-surface p-4 text-sm text-white/40">
        Nothing recorded yet. Times appear here as the chauffeur works through the trip in the driver
        app.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* The money line, when there is one. */}
      {wait && (
        <div className="rounded border border-brand-gold/30 bg-brand-gold/5 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-gold-light">
            <Timer className="h-4 w-4" />
            The chauffeur waited {wait.minutes} min
            <span className="font-normal text-white/50">
              ({fmtTime(wait.from)} &rarr; {fmtTime(wait.to)})
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">
            {hourly ? (
              <>Hourly work bills from the scheduled pick-up time, so wait time does not apply.</>
            ) : (
              <>
                That is <b className="text-white/70">{increments(wait.minutes)} &times; 15-minute</b>{' '}
                increment{increments(wait.minutes) === 1 ? '' : 's'} at the vehicle&rsquo;s hourly rate
                &mdash; but the agreement bills from the <b className="text-white/70">scheduled
                pick-up time</b>, not from when the car arrived
                {airport ? (
                  <>
                    , and for airport pick-ups the clock starts{' '}
                    <b className="text-white/70">30 minutes after gate arrival</b> (an hour for
                    international)
                  </>
                ) : null}
                . Check it against the schedule before charging.
              </>
            )}
          </p>
        </div>
      )}

      <ol className="space-y-0">
        {events.map((e, i) => {
          // Pressed offline and synced later. Worth showing, because it is the
          // first thing anyone disputing a timestamp will ask about. Five
          // minutes rather than two: a shorter gap is a slow request retrying,
          // and calling that "no signal" would overstate the evidence.
          const lag = Math.round(
            (new Date(e.recorded_at).getTime() - new Date(e.occurred_at).getTime()) / 60000
          )
          const last = i === events.length - 1
          return (
            <li key={`${e.status}-${e.occurred_at}-${i}`} className="flex gap-3">
              {/* The rail: a dot per event, joined by a line except at the end. */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border ${
                    TONES[e.status] || 'border-white/30 bg-white/10'
                  }`}
                />
                {!last && <span className="w-px flex-1 bg-white/10" />}
              </div>

              <div className={`min-w-0 flex-1 ${last ? '' : 'pb-4'}`}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-white">{LABELS[e.status] || e.status}</span>
                  <span
                    className="font-mono text-sm text-brand-gold-light"
                    title={fmtFull(e.occurred_at)}
                  >
                    {fmtTime(e.occurred_at)}
                  </span>
                  {e.driver_name && <span className="text-xs text-white/40">by {e.driver_name}</span>}
                </div>

                {lag >= 5 && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-300/80">
                    <Clock className="h-3 w-3" />
                    Recorded {lag} min later &mdash; pressed with no signal and synced afterwards
                  </p>
                )}

                {e.lat != null && e.lng != null && (
                  <a
                    href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-brand-gold"
                  >
                    <MapPin className="h-3 w-3" />
                    {Number(e.lat).toFixed(4)}, {Number(e.lng).toFixed(4)}
                  </a>
                )}

                {e.note && <p className="mt-0.5 text-xs text-white/50">{e.note}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
