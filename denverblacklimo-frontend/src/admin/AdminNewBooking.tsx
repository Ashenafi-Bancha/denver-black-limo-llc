import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Phone, Plus, X } from 'lucide-react'
import { SERVICE_TYPES, VEHICLE_CATEGORIES } from '../constants'
import { BOOKING_STATUSES } from './adminUtils'
import { OPTION_CLASS } from '../lib/formStyles'

/**
 * A booking taken over the phone, entered by the office.
 *
 * Deliberately shorter than the public form: whoever is filling this in has
 * the customer on the line, so it asks for what is needed to run the trip and
 * lets them fill the rest in later. Only the name, phone and pick-up date are
 * required — the rest of a phone call often arrives out of order.
 *
 * Flight fields appear only for airport work, and the confirmation email is
 * opt-in: plenty of callers never give an address, and a trip already agreed
 * on the phone does not always want a receipt firing off.
 */

export interface NewBookingPayload {
  name: string
  phone: string
  email: string
  company: string
  serviceType: string
  tripType: string
  airportDirection: string
  airline: string
  flightNumber: string
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  additionalStops: string
  passengers: string
  luggage: string
  vehiclePreference: string
  specialRequests: string
  status: string
  source: string
  sendConfirmation: boolean
}

const FIELD =
  'w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold'
const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80'

const SOURCES = ['Phone', 'Walk-in', 'Email', 'Repeat client', 'Referral', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

export function NewBookingModal({
  busy,
  error,
  onClose,
  onSave,
}: {
  busy: boolean
  error: string
  onClose: () => void
  onSave: (payload: NewBookingPayload) => void
}) {
  const [f, setF] = useState<NewBookingPayload>({
    name: '', phone: '', email: '', company: '',
    serviceType: SERVICE_TYPES[0], tripType: 'One Way',
    airportDirection: 'Arrival', airline: '', flightNumber: '',
    pickupDate: today(), pickupTime: '', pickupLocation: '', dropoffLocation: '',
    additionalStops: '', passengers: '2', luggage: '2',
    vehiclePreference: VEHICLE_CATEGORIES[0].name, specialRequests: '',
    status: 'Confirmed', source: 'Phone', sendConfirmation: false,
  })
  const set = <K extends keyof NewBookingPayload>(k: K, v: NewBookingPayload[K]) =>
    setF((prev) => ({ ...prev, [k]: v }))

  const isAirport = /airport|aviation|fbo/i.test(f.serviceType)
  const valid = f.name.trim().length > 1 && f.phone.trim().length > 5 && /^\d{4}-\d{2}-\d{2}$/.test(f.pickupDate)
  const emailOk = !f.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg text-brand-gold">
              <Phone className="h-5 w-5" /> New booking
            </h2>
            <p className="mt-0.5 text-xs text-white/50">For a trip taken over the phone or in person.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Customer</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Name *</label>
                <input value={f.name} onChange={(e) => set('name', e.target.value)} className={FIELD} placeholder="Full name" autoFocus />
              </div>
              <div>
                <label className={LABEL}>Phone *</label>
                <input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD} placeholder="(303) 555-0148" />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input value={f.email} onChange={(e) => set('email', e.target.value)} className={FIELD} placeholder="Optional" type="email" />
              </div>
              <div>
                <label className={LABEL}>Company</label>
                <input value={f.company} onChange={(e) => set('company', e.target.value)} className={FIELD} placeholder="Optional" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Trip</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Service</label>
                <select value={f.serviceType} onChange={(e) => set('serviceType', e.target.value)} className={FIELD}>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Trip type</label>
                <select value={f.tripType} onChange={(e) => set('tripType', e.target.value)} className={FIELD}>
                  {['One Way', 'Round Trip', 'Hourly'].map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Pick-up date *</label>
                <input type="date" value={f.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Pick-up time</label>
                <input type="time" value={f.pickupTime} onChange={(e) => set('pickupTime', e.target.value)} className={FIELD} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Pick-up location</label>
                <input value={f.pickupLocation} onChange={(e) => set('pickupLocation', e.target.value)} className={FIELD} placeholder="Address, hotel or airport" />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Drop-off</label>
                <input value={f.dropoffLocation} onChange={(e) => set('dropoffLocation', e.target.value)} className={FIELD} placeholder="Where the trip ends" />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Extra stops</label>
                <input value={f.additionalStops} onChange={(e) => set('additionalStops', e.target.value)} className={FIELD} placeholder="Separate several stops with ||" />
              </div>
            </div>
          </section>

          {isAirport && (
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Flight</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={LABEL}>Direction</label>
                  <select value={f.airportDirection} onChange={(e) => set('airportDirection', e.target.value)} className={FIELD}>
                    {['Arrival', 'Departure'].map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Airline</label>
                  <input value={f.airline} onChange={(e) => set('airline', e.target.value)} className={FIELD} placeholder="United Airlines" />
                </div>
                <div>
                  <label className={LABEL}>Flight number</label>
                  <input value={f.flightNumber} onChange={(e) => set('flightNumber', e.target.value)} className={FIELD} placeholder="UA 26" />
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Vehicle &amp; party</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Vehicle</label>
                <select value={f.vehiclePreference} onChange={(e) => set('vehiclePreference', e.target.value)} className={FIELD}>
                  {VEHICLE_CATEGORIES.map((v) => <option key={v.name} value={v.name} className={OPTION_CLASS}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Passengers</label>
                <input type="number" min="1" value={f.passengers} onChange={(e) => set('passengers', e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Luggage</label>
                <input type="number" min="0" value={f.luggage} onChange={(e) => set('luggage', e.target.value)} className={FIELD} />
              </div>
              <div className="sm:col-span-3">
                <label className={LABEL}>Notes / special requests</label>
                <textarea value={f.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} rows={2} className={`${FIELD} resize-none`} placeholder="Car seats, accessibility, anything the customer mentioned." />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Booking record</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Status</label>
                <select value={f.status} onChange={(e) => set('status', e.target.value)} className={FIELD}>
                  {BOOKING_STATUSES.map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>How it came in</label>
                <select value={f.source} onChange={(e) => set('source', e.target.value)} className={FIELD}>
                  {SOURCES.map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                </select>
                <p className="mt-1.5 text-xs text-white/40">Used by the order counts to separate phone work from the website.</p>
              </div>
            </div>

            <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition ${
              f.sendConfirmation ? 'border-brand-gold/50 bg-brand-gold/5' : 'border-white/10'
            } ${!f.email.trim() ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={f.sendConfirmation}
                disabled={!f.email.trim()}
                onChange={(e) => set('sendConfirmation', e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#c9a227]"
              />
              <span className="text-white/80">
                Email the customer their confirmation and agreement
                <span className="mt-0.5 block text-xs text-white/45">
                  {f.email.trim()
                    ? 'Sends the same receipt a website booking gets, including the link to sign the agreement.'
                    : 'Add an email address above to enable this.'}
                </span>
              </span>
            </label>
          </section>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          {!emailOk && <p className="text-sm font-medium text-amber-400">That email address does not look right.</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => onSave(f)}
              disabled={!valid || !emailOk || busy}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save booking
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
