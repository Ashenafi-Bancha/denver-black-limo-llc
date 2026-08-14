import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, Phone } from 'lucide-react'
import { PlaceInput } from './PlaceInput'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { defaultFleet } from '../content/defaults'
import type { FleetVehicle } from '../data/fleet'
import type { Place } from '../lib/geocode'
import { OPTION_CLASS, OPTION_PLACEHOLDER_CLASS } from '../lib/formStyles'
import { PHONE, PHONE_HREF } from '../constants'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const SERVICES = [
  { id: 'airport', label: 'Airport transfer' },
  { id: 'point-to-point', label: 'Point to point' },
  { id: 'mountain', label: 'Mountain or resort' },
  { id: 'hourly', label: 'By the hour' },
] as const

type ServiceId = (typeof SERVICES)[number]['id']

interface QuoteLine {
  label: string
  amount: number
  kind: string
  detail: string | null
}

interface Quote {
  quotable: boolean
  reason?: string
  message?: string
  currency?: string
  total?: number
  lines?: QuoteLine[]
  meta?: { method: string; tripMiles: number; deadheadMiles: number; vehicle: string }
}

const FIELD =
  'w-full rounded-lg border border-white/15 bg-brand-surface px-4 py-3 text-white placeholder-white/35 ' +
  'outline-none transition focus:border-brand-gold focus:ring-1 focus:ring-brand-gold'

const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-brand-gold-light'

export function PriceEstimator() {
  const { get } = useSiteSettings()
  const fleet = get<FleetVehicle[]>('fleet', defaultFleet)

  const [service, setService] = useState<ServiceId>('airport')
  const [vehicleId, setVehicleId] = useState(fleet[0]?.id ?? '')
  const [pickupText, setPickupText] = useState('')
  const [dropoffText, setDropoffText] = useState('')
  const [pickup, setPickup] = useState<Place | null>(null)
  const [dropoff, setDropoff] = useState<Place | null>(null)
  const [hours, setHours] = useState(3)
  const [extraStops, setExtraStops] = useState(0)
  const [childSeats, setChildSeats] = useState(0)
  // Weekend hourly rates and the late-night surcharge depend on WHEN the trip
  // is, so pricing "now" would misquote anyone planning ahead — which is
  // nearly everyone booking a limo.
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pickupTime, setPickupTime] = useState('12:00')

  const [quote, setQuote] = useState<Quote | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const hourly = service === 'hourly'

  /**
   * Any change to the trip invalidates the price already on screen. Leaving a
   * stale figure visible while the inputs say something else is how a customer
   * ends up quoting a number back that the site never meant.
   */
  useEffect(() => {
    setQuote(null)
    setFailed(false)
  }, [service, vehicleId, pickup, dropoff, hours, extraStops, childSeats, pickupDate, pickupTime])

  const ready = hourly
    ? Boolean(vehicleId && hours > 0)
    : Boolean(vehicleId && pickup && dropoff)

  const needsPickFromList =
    !hourly &&
    ((pickupText.trim().length > 2 && !pickup) || (dropoffText.trim().length > 2 && !dropoff))

  async function getPrice() {
    if (!ready || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const res = await fetch(`${API_URL}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: service,
          vehicleId,
          pickup: pickup ? { lat: pickup.lat, lng: pickup.lng, label: pickup.label } : null,
          dropoff: dropoff ? { lat: dropoff.lat, lng: dropoff.lng, label: dropoff.label } : null,
          pickupDate,
          pickupTime,
          hours: hourly ? hours : undefined,
          extras: { extraStops, childSeats },
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setQuote((await res.json()) as Quote)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // The booking form thinks in service slugs, not estimator ids. Everything the
  // visitor already typed rides along so they never enter the trip twice.
  const BOOKING_SLUG: Record<ServiceId, string> = {
    airport: 'airport-transportation',
    'point-to-point': 'executive-corporate',
    mountain: 'mountain-resort',
    hourly: 'hourly-chauffeur',
  }

  const bookHref =
    `/book?service=${BOOKING_SLUG[service]}` +
    (pickup ? `&pickup=${encodeURIComponent(pickup.label)}` : '') +
    (dropoff ? `&dropoff=${encodeURIComponent(dropoff.label)}` : '') +
    (pickupDate ? `&date=${encodeURIComponent(pickupDate)}` : '') +
    (pickupTime ? `&time=${encodeURIComponent(pickupTime)}` : '') +
    (hourly ? `&hours=${hours}` : '')

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-brand-gold/25 bg-brand-charcoal p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="est-service">What do you need?</label>
            <select
              id="est-service"
              value={service}
              onChange={(e) => setService(e.target.value as ServiceId)}
              className={FIELD}
            >
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id} className={OPTION_CLASS}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="est-date">Pick-up date</label>
            <input
              id="est-date"
              type="date"
              value={pickupDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPickupDate(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="est-time">Pick-up time</label>
            <input
              id="est-time"
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className={FIELD}
            />
          </div>

          {!hourly && (
            <>
              <div>
                <label className={LABEL} htmlFor="est-pickup">Pick-up</label>
                <PlaceInput
                  value={pickupText}
                  onChange={setPickupText}
                  onSelectPlace={setPickup}
                  placeholder="Airport, hotel or address"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="est-dropoff">Drop-off</label>
                <PlaceInput
                  value={dropoffText}
                  onChange={setDropoffText}
                  onSelectPlace={setDropoff}
                  placeholder="Where are you going?"
                  className={FIELD}
                />
              </div>
            </>
          )}

          {hourly && (
            <div>
              <label className={LABEL} htmlFor="est-hours">How many hours?</label>
              <input
                id="est-hours"
                type="number"
                min={1}
                max={24}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className={FIELD}
              />
            </div>
          )}

          <div className={hourly ? '' : 'sm:col-span-2'}>
            <label className={LABEL} htmlFor="est-vehicle">Vehicle</label>
            <select
              id="est-vehicle"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={FIELD}
            >
              <option value="" className={OPTION_PLACEHOLDER_CLASS}>Choose a vehicle</option>
              {fleet.map((v) => (
                <option key={v.id} value={v.id} className={OPTION_CLASS}>
                  {v.name} · {v.passengers} passengers
                </option>
              ))}
            </select>
          </div>

          {!hourly && (
            <>
              <div>
                <label className={LABEL} htmlFor="est-stops">Extra stops</label>
                <input id="est-stops" type="number" min={0} max={6} value={extraStops}
                  onChange={(e) => setExtraStops(Number(e.target.value))} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="est-seats">Child seats</label>
                <input id="est-seats" type="number" min={0} max={4} value={childSeats}
                  onChange={(e) => setChildSeats(Number(e.target.value))} className={FIELD} />
              </div>
            </>
          )}
        </div>

        {needsPickFromList && (
          <p className="mt-4 text-sm text-brand-gold-light/90">
            Choose an address from the suggestions so we can measure the route.
          </p>
        )}

        <button
          type="button"
          onClick={getPrice}
          disabled={!ready || busy}
          className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] text-brand-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> WORKING IT OUT</>) : 'SEE MY PRICE'}
        </button>
      </div>

      {(quote || failed) && (
        <div className="mt-5 rounded-2xl border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
          {failed || (quote && !quote.quotable) ? (
            <>
              <h3 className="font-display text-2xl text-white">We will price this one for you</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {quote?.message ??
                  'We could not work that out automatically. Send us the details and we will come straight back with a price.'}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/quote" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] text-brand-black transition hover:brightness-110">
                  REQUEST A QUOTE <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={PHONE_HREF} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-brand-gold/50 px-8 text-[13px] font-bold tracking-[0.18em] text-brand-gold-light transition hover:bg-brand-gold/10">
                  <Phone className="h-4 w-4" /> {PHONE}
                </a>
              </div>
            </>
          ) : quote?.quotable ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-gold-light">Estimated price</p>
              <p className="mt-2 font-display text-5xl font-semibold text-white">
                {quote.currency}{quote.total}
              </p>
              {quote.meta && (
                <p className="mt-1 text-sm text-white/50">
                  {quote.meta.vehicle}
                  {quote.meta.tripMiles ? ` · ${quote.meta.tripMiles} miles` : ''}
                </p>
              )}

              <ul className="mt-6 space-y-2 border-t border-white/10 pt-5">
                {quote.lines?.map((l, i) => (
                  <li key={`${l.label}-${i}`} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className={l.kind === 'adjustment' ? 'text-brand-gold-light' : 'text-white/70'}>
                      {l.label}
                      {l.detail && <span className="block text-xs text-white/35">{l.detail}</span>}
                    </span>
                    <span className={`shrink-0 tabular-nums ${l.amount < 0 ? 'text-brand-gold-light' : 'text-white/85'}`}>
                      {l.amount < 0 ? '−' : ''}{quote.currency}{Math.abs(l.amount).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-xs leading-relaxed text-white/45">
                This is an estimate. Gratuity is not included and is always your choice. We confirm
                every reservation with a written quote before your trip begins.
              </p>

              <Link to={bookHref} className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] text-brand-black transition hover:brightness-110 sm:w-auto">
                BOOK THIS TRIP <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
