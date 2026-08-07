import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  SERVICE_TYPES,
  VEHICLE_CATEGORIES,
  getVehicleCategory,
  DEN_AIRLINES,
  MEET_GREET,
  FBO_TERMINALS,
  AIRCRAFT_TYPES,
  CONCERT_VENUES,
  SPORTING_VENUES,
  MOUNTAIN_RESORTS,
  SERVICE_AREAS,
  HOURLY_DURATIONS,
  PHONE,
  PHONE_HREF,
  type Airline,
} from '../constants'
import { useSearchParams } from 'react-router-dom'
import {
  SERVICE_CONFIGS,
  getServiceConfig,
  numberedServiceLabel,
  isSportingService,
  type ServiceConfig,
  type ServiceLayout,
} from '../data/bookingServices'
import { PlaceInput } from '../components/PlaceInput'
import {
  Check,
  ChevronDown,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  MapPin,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Users,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Info,
  Search,
  Car,
  Calendar,
  Clock,
  Mountain,
  Hotel,
  Home,
  Music,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { fmtDateTime, fmtTime } from '../lib/datetime'

type TripType = 'One Way' | 'Round Trip' | 'Hourly (As Directed)'
type FormErrors = Record<string, string | undefined>

interface ItineraryStop {
  label: string
  location: string
  time: string
}

const GOLD = '#c9a227'
const AIRPORT_LABEL = 'Denver International Airport (DEN)'

/** Today in local YYYY-MM-DD — date pickers can't select earlier than this. */
const todayISO = (() => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
})()

const STEPS = ['Trip Details', 'Your Information', 'Review & Submit']

/** Key for the in-progress booking saved to the browser. */
const DRAFT_KEY = 'dbl-booking-draft'

function clearSavedDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

function readSavedDraft(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt?: number }
    // Ignore drafts older than a day so stale trips don't reappear.
    if (!parsed.savedAt || Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      clearSavedDraft()
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/** Wedding and nightlife bookings open with a pre-labelled multi-stop itinerary. */
function seedItineraryFor(layout?: ServiceLayout): ItineraryStop[] {
  if (layout === 'wedding')
    return [
      { label: 'Pickup (From)', location: '', time: '' },
      { label: 'Wedding Venue', location: '', time: '' },
      { label: 'Return Drop-off', location: '', time: '' },
    ]
  if (layout === 'nightlife')
    return [
      { label: 'Pickup (Start)', location: '', time: '' },
      { label: 'Stop 1', location: '', time: '' },
      { label: 'Return Drop-off', location: '', time: '' },
    ]
  return []
}

/** Trip type a service opens on — hourly services default to hourly, events to round trip. */
function defaultTripFor(layout?: ServiceLayout): TripType {
  if (layout === 'hourly' || layout === 'nightlife') return 'Hourly (As Directed)'
  if (layout === 'wedding' || layout === 'event') return 'Round Trip'
  return 'One Way'
}

export function BookNowPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  /** How many fields failed on the last Continue press — drives the summary banner. */
  const [errorCount, setErrorCount] = useState(0)
  const [step, setStep] = useState(1)
  const [reference, setReference] = useState('')
  /** Hidden field — only bots fill it in. */
  const [honeypot, setHoneypot] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const [searchParams] = useSearchParams()
  /**
   * "Reserve Your Ride Now" on a service page links here as /book?service=<slug>.
   * Resolved once at first render and used to seed the initial state directly —
   * doing it in an effect raced with the draft restore and the draft-persist write.
   */
  const [requestedService] = useState(() => {
    const slug = searchParams.get('service')
    return (slug && SERVICE_CONFIGS.find((c) => c.slug === slug)) || null
  })

  const [form, setForm] = useState({
    // Customer
    name: '',
    phone: '',
    email: '',
    company: '',
    // Passengers & vehicle
    passengers: 2,
    luggage: 2,
    vehicleCategory: requestedService?.defaultVehicle ?? 'Cadillac Escalade ESV',
    // Service & trip
    serviceType: (requestedService?.name ?? SERVICE_TYPES[0]) as string,
    tripType: defaultTripFor(requestedService?.layout),
    // Common route
    pickupDate: '',
    pickupTime: '',
    pickupLocation: '',
    dropoffLocation: '',
    // Airport
    airportDirection: 'Arrival' as 'Arrival' | 'Departure',
    flightNumber: '',
    // FBO
    fboName: FBO_TERMINALS[0].name,
    aircraftType: '',
    tailNumber: '',
    // Hourly / executive
    durationHours: '',
    serviceArea: SERVICE_AREAS[0] as string,
    // Mountain
    pickupType: 'Airport' as 'Airport' | 'Hotel' | 'Residence',
    resort: '',
    estimatedTravelTime: '',
    // Event
    eventVenue: '',
    eventDate: '',
    eventTime: '',
    returnPickupTime: '',
    // Round trip
    returnPickupLocation: '',
    returnDate: '',
    returnTime: '',
    // Free text
    specialRequests: '',
  })

  const config = getServiceConfig(form.serviceType)
  const layout = config.layout

  // Dynamic collections
  const [airline, setAirline] = useState<Airline | null>(null)
  const [stops, setStops] = useState<string[]>([]) // generic additional stops
  const [itinerary, setItinerary] = useState<ItineraryStop[]>(() => seedItineraryFor(requestedService?.layout)) // wedding / nightlife

  const set = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // When the service changes, reset trip type, vehicle default and structured stops.
  const changeService = (name: string) => {
    const cfg = getServiceConfig(name)
    const defaultTrip = defaultTripFor(cfg.layout)
    setForm((prev) => ({
      ...prev,
      serviceType: name,
      tripType: defaultTrip,
      vehicleCategory: cfg.defaultVehicle,
    }))
    setErrors({})
    setItinerary(seedItineraryFor(cfg.layout))
    setStops([])
  }

  // Restore an unfinished booking (e.g. after an accidental refresh).
  useEffect(() => {
    const draft = readSavedDraft()
    if (!draft) return
    // An explicit ?service= means the visitor just asked for a different service —
    // an older draft for something else must not override it.
    const draftService = (draft.form as { serviceType?: string } | undefined)?.serviceType
    if (requestedService && draftService && draftService !== requestedService.name) return
    if (draft.form) setForm((prev) => ({ ...prev, ...(draft.form as object) }))
    if (Array.isArray(draft.stops)) setStops(draft.stops as string[])
    if (Array.isArray(draft.itinerary)) setItinerary(draft.itinerary as ItineraryStop[])
    if (draft.airline) setAirline(draft.airline as Airline)
    if (typeof draft.step === 'number') setStep(draft.step)
    setDraftRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the draft in sync so nothing is lost on refresh or accidental back.
  useEffect(() => {
    if (submitted) return
    // Only once the visitor has actually typed something. Saving an untouched form
    // meant a first-time visitor came back to "We restored the details you started
    // earlier" over a completely empty form.
    // NB: only fields that start empty count. `fboName` is preset to the first FBO in
    // the list, so including it made this always true — every mount then overwrote a
    // good draft with pre-restore state before the restore above had settled.
    const started =
      Boolean(form.name || form.email || form.phone || form.pickupLocation || form.dropoffLocation ||
        form.pickupDate || form.flightNumber || form.eventVenue || airline) ||
      stops.some(Boolean) ||
      itinerary.some((s) => s.location)
    if (!started) return
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, stops, itinerary, airline, step, savedAt: Date.now() })
      )
    } catch {
      /* storage full or blocked — drafts are a convenience, not a requirement */
    }
  }, [form, stops, itinerary, airline, step, submitted])

  // Seed itinerary on first mount if the initial service needs one (it doesn't here,
  // Airport is default) — kept for completeness when defaults change.
  useEffect(() => {
    if ((layout === 'wedding' || layout === 'nightlife') && itinerary.length === 0) {
      changeService(form.serviceType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  /** Pickup less than 3 hours away — we still accept it, but ask them to call. */
  const shortNotice = useMemo(() => {
    if (!form.pickupDate) return false
    const stamp = Date.parse(`${form.pickupDate}T${form.pickupTime || '00:00'}`)
    return !Number.isNaN(stamp) && stamp - Date.now() < 3 * 60 * 60 * 1000
  }, [form.pickupDate, form.pickupTime])

  const showReturn =
    form.tripType === 'Round Trip' &&
    (layout === 'airport' || layout === 'fbo' || layout === 'pointToPoint' || layout === 'mountain')

  // ── Derived pickup / dropoff for summary + payload ──
  const derivedPickup = useMemo(() => {
    if (layout === 'airport') return form.airportDirection === 'Arrival' ? AIRPORT_LABEL : form.pickupLocation
    if (layout === 'fbo') return form.airportDirection === 'Arrival' ? form.fboName : form.pickupLocation
    if (layout === 'mountain' && form.pickupType === 'Airport') return AIRPORT_LABEL
    if (layout === 'wedding' || layout === 'nightlife') return itinerary[0]?.location || ''
    return form.pickupLocation
  }, [layout, form, itinerary])

  const derivedDropoff = useMemo(() => {
    if (layout === 'airport') return form.airportDirection === 'Arrival' ? form.dropoffLocation : AIRPORT_LABEL
    if (layout === 'fbo') return form.airportDirection === 'Arrival' ? form.dropoffLocation : form.fboName
    if (layout === 'wedding' || layout === 'nightlife') return itinerary[itinerary.length - 1]?.location || ''
    return form.dropoffLocation
  }, [layout, form, itinerary])

  // ── Validation (split per wizard step) ──
  const collectCustomerErrors = () => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    return e
  }

  const collectTripErrors = () => {
    const e: FormErrors = {}
    // A date picker can be bypassed, so re-check that no date is in the past.
    if (form.pickupDate && form.pickupDate < todayISO) e.pickupDate = 'Please choose today or a future date'
    if (form.eventDate && form.eventDate < todayISO) e.eventDate = 'Please choose today or a future date'
    if (form.returnDate && form.pickupDate && form.returnDate < form.pickupDate) {
      e.returnDate = 'Return date cannot be before the pickup date'
    }
    // A round trip without a return leg reaches the office as an incomplete booking.
    if (showReturn && !form.returnDate) e.returnDate = 'Return date is required for a round trip'
    if (layout === 'airport') {
      // Airline stays required both ways — at DIA it decides which terminal we use.
      if (!airline) e.airline = 'Please select an airline'
      // Arrivals are timed off the inbound flight, so the number is essential. Departures
      // are timed off the pickup address, so it only helps us watch for schedule changes.
      if (form.airportDirection === 'Arrival' && !form.flightNumber.trim()) {
        e.flightNumber = 'Flight number is required so we can track your arrival'
      }
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!form.pickupTime) e.pickupTime = 'Time is required'
      if (form.airportDirection === 'Arrival' && !form.dropoffLocation.trim()) e.dropoffLocation = 'Destination is required'
      if (form.airportDirection === 'Departure' && !form.pickupLocation.trim()) e.pickupLocation = 'Pickup address is required'
    } else if (layout === 'fbo') {
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!form.pickupTime) e.pickupTime = 'Time is required'
      if (form.airportDirection === 'Arrival' && !form.dropoffLocation.trim()) e.dropoffLocation = 'Destination is required'
      if (form.airportDirection === 'Departure' && !form.pickupLocation.trim()) e.pickupLocation = 'Pickup address is required'
    } else if (layout === 'event') {
      if (!form.eventVenue) e.eventVenue = 'Please choose a venue'
      if (!form.eventDate) e.eventDate = 'Event date is required'
      if (!form.pickupLocation.trim()) e.pickupLocation = 'Pickup address is required'
    } else if (layout === 'wedding' || layout === 'nightlife') {
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!itinerary[0]?.location.trim()) e.itin0 = 'Pickup location is required'
    } else if (layout === 'hourly') {
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!form.pickupTime) e.pickupTime = 'Start time is required'
      if (!form.pickupLocation.trim()) e.pickupLocation = 'Pickup address is required'
    } else if (layout === 'mountain') {
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!form.pickupTime) e.pickupTime = 'Time is required'
      if (form.pickupType === 'Airport') {
        if (!airline) e.airline = 'Please select an airline'
      } else if (!form.pickupLocation.trim()) {
        e.pickupLocation = 'Pickup address is required'
      }
      if (!form.dropoffLocation.trim() && !form.resort) e.dropoffLocation = 'Destination is required'
    } else {
      // pointToPoint
      if (!form.pickupDate) e.pickupDate = 'Date is required'
      if (!form.pickupTime) e.pickupTime = 'Time is required'
      if (!form.pickupLocation.trim()) e.pickupLocation = 'Pickup address is required'
      if (!form.dropoffLocation.trim()) e.dropoffLocation = 'Destination is required'
    }
    return e
  }

  /**
   * Applies errors and reports validity. On failure it brings the FIRST invalid field
   * into view and focuses it — scrolling to the top of the page instead just hid the
   * reason the form refused to advance.
   */
  const commit = (e: FormErrors) => {
    setErrors(e)
    if (Object.keys(e).length === 0) return true
    setErrorCount(Object.keys(e).length)
    // Wait for the error nodes to render before locating the first one.
    window.setTimeout(() => {
      const first = document.querySelector('[data-field-error]')
      if (!first) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      // Prefer a real input, but the airline picker is a <button> combobox — accept that too.
      // The message is a sibling of the control, so start at its parent and walk up.
      const findControl = (el: HTMLElement) =>
        el.querySelector<HTMLElement>('input, select, textarea') ?? el.querySelector<HTMLElement>('button')

      let group: HTMLElement = (first.parentElement as HTMLElement) ?? (first as HTMLElement)
      let control = findControl(group)
      while (!control && group.parentElement && group !== document.body) {
        group = group.parentElement
        control = findControl(group)
      }
      group.scrollIntoView({ behavior: 'smooth', block: 'center' })
      control?.focus({ preventScroll: true })
    }, 0)
    return false
  }

  const validateTrip = () => commit(collectTripErrors())
  const validateCustomer = () => commit(collectCustomerErrors())
  const validate = () => commit({ ...collectTripErrors(), ...collectCustomerErrors() })

  // ── Wizard navigation ──
  const goToStep = (next: number) => {
    setStep(next)
    setErrorCount(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goNext = () => {
    if (step === 1 && !validateTrip()) return
    if (step === 2 && !validateCustomer()) return
    goToStep(Math.min(STEPS.length, step + 1))
  }

  const goBack = () => goToStep(Math.max(1, step - 1))

  const onSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)

    const additionalStopsText = stops.filter(Boolean).join(' | ')
    const itineraryText = itinerary
      .filter((s) => s.location)
      .map((s) => `${s.label}: ${s.location}${s.time ? ` (${s.time})` : ''}`)
      .join(' | ')

    const details = {
      layout,
      airportDirection: form.airportDirection,
      fboName: layout === 'fbo' ? form.fboName : undefined,
      aircraftType: form.aircraftType || undefined,
      tailNumber: form.tailNumber || undefined,
      durationHours: form.durationHours || undefined,
      serviceArea: layout === 'hourly' ? form.serviceArea : undefined,
      pickupType: layout === 'mountain' ? form.pickupType : undefined,
      resort: form.resort || undefined,
      estimatedTravelTime: form.estimatedTravelTime || undefined,
      eventVenue: form.eventVenue || undefined,
      eventDate: form.eventDate || undefined,
      eventTime: form.eventTime || undefined,
      returnPickupTime: form.returnPickupTime || undefined,
      itinerary: itineraryText || undefined,
      company: form.company || undefined,
    }

    const payload = {
      // customer
      name: form.name,
      phone: form.phone,
      email: form.email,
      company: form.company,
      // service / trip
      serviceType: form.serviceType,
      tripType: form.tripType,
      // airport / mountain-airport
      airportDirection: layout === 'airport' || (layout === 'mountain' && form.pickupType === 'Airport') ? form.airportDirection : undefined,
      airline: airline?.name,
      airlineCode: airline?.code,
      terminal: airline ? MEET_GREET[airline.terminal].terminal : undefined,
      flightNumber: form.flightNumber || undefined,
      // route
      pickupDate: form.pickupDate,
      pickupTime: form.pickupTime,
      pickupLocation: derivedPickup,
      dropoffLocation: derivedDropoff || form.resort,
      additionalStops: [additionalStopsText, itineraryText].filter(Boolean).join(' || '),
      // round trip
      returnPickupLocation: showReturn ? form.returnPickupLocation : undefined,
      returnDate: showReturn ? form.returnDate : undefined,
      returnTime: showReturn ? form.returnTime : undefined,
      // passengers & vehicle
      passengers: String(form.passengers),
      luggage: String(form.luggage),
      vehiclePreference: form.vehicleCategory,
      specialRequests: form.specialRequests,
      // structured extras
      details,
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, website: honeypot }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error || 'There was a problem submitting your request. Please try again or call us directly.')
        return
      }
      const body = await res.json().catch(() => ({}))
      setReference(body.reference || '')
      clearSavedDraft()
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Failed to submit booking', err)
      alert('There was a problem submitting your request. Please try again or call us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success screen ──
  if (submitted) return <SuccessScreen name={form.name} phone={form.phone} email={form.email} reference={reference} />

  const vehicle = getVehicleCategory(form.vehicleCategory)
  // Show the selected service's real banner (defaults to airport-transportation).
  const summaryImage = `/images/services/service-banner-${config.number}.jpeg`

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-16 font-body text-gray-900">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Page heading */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-wide text-gray-900">BOOK YOUR RIDE</h1>
          <p className="text-gray-500 mt-2">Fast, simple and secure booking in less than a minute.</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full" style={{ backgroundColor: GOLD }} />
        </div>

        {/* Hidden bot trap — real people never see or fill this */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        {draftRestored && !submitted && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <span className="flex-1">We restored the details you started earlier.</span>
            <button
              type="button"
              onClick={() => {
                clearSavedDraft()
                window.location.reload()
              }}
              className="shrink-0 text-xs font-bold uppercase tracking-wider text-gray-400 underline hover:text-gray-600"
            >
              Start over
            </button>
          </div>
        )}

        {errorCount > 0 && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">
              {errorCount === 1
                ? 'One field still needs your attention — we’ve highlighted it below.'
                : `${errorCount} fields still need your attention — we’ve highlighted them below.`}
            </span>
          </div>
        )}

        {/* Progress */}
        <Stepper current={step} onSelect={(n) => n < step && goToStep(n)} />

        <div
          className={`grid items-start gap-6 ${
            step === 3 ? 'mx-auto max-w-3xl' : 'lg:grid-cols-[1fr_360px]'
          }`}
        >
          {/* ─────────── LEFT: FORM ─────────── */}
          <div className="space-y-6">
            {/* STEP 1 — TRIP DETAILS */}
            {step === 1 && (
            <SectionCard step={1} title="Trip Details">
              <div className="grid gap-6 md:grid-cols-2">
                <Select
                  label="Service Category"
                  value={form.serviceType}
                  onChange={(v) => changeService(v)}
                  options={SERVICE_CONFIGS.map((c: ServiceConfig) => ({ value: c.name, label: numberedServiceLabel(c) }))}
                  leftIcon={<Car className="h-4 w-4" />}
                />
                <TripTypeToggle value={form.tripType} onChange={(v) => set('tripType', v)} />
              </div>

              <div className="mt-6">{renderTripFields()}</div>

              {/* Additional stops (not for itinerary layouts, which build their own list) */}
              {layout !== 'wedding' && layout !== 'nightlife' && (
                <AdditionalStops stops={stops} setStops={setStops} />
              )}

              {/* Special requests */}
              <div className="mt-6">
                <Field label="Special Requests" optional icon={<Info className="h-4 w-4" />}>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={form.specialRequests}
                    onChange={(e) => set('specialRequests', e.target.value)}
                    placeholder="Anything else we should know? (flight assistance, décor, accessibility, preferred route, etc.)"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 outline-none transition-colors focus:border-[color:var(--gold)] focus:bg-white"
                    style={{ ['--gold' as string]: GOLD }}
                  />
                  <div className="mt-1 text-right text-xs text-gray-400">{form.specialRequests.length}/300</div>
                </Field>
              </div>
            </SectionCard>
            )}

            {/* STEP 2 — CUSTOMER + PASSENGER/VEHICLE */}
            {step === 2 && (
            <SectionCard step={2} title="Customer Information">
              <div className="grid gap-6 md:grid-cols-2">
                <Input label="Full Name" required value={form.name} onChange={(v) => set('name', v)} error={errors.name} icon={<User className="h-4 w-4" />} placeholder="John Smith" />
                <Input label="Phone Number" required type="tel" value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} icon={<Phone className="h-4 w-4" />} placeholder="(720) 555-1234" />
                <Input label="Email Address" required type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} icon={<Mail className="h-4 w-4" />} placeholder="john.smith@email.com" />
                {config.showCompany && (
                  <Input label="Company Name" optional value={form.company} onChange={(v) => set('company', v)} icon={<Building className="h-4 w-4" />} placeholder="Summit Solutions Inc." />
                )}
              </div>

              <div className="mt-8 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: GOLD }} />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: GOLD }}>Passenger &amp; Vehicle</h3>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                <Counter label="Number of Passengers" value={form.passengers} min={1} onChange={(v) => set('passengers', v)} icon={<User className="h-4 w-4" />} />
                <Counter label="Number of Luggage" value={form.luggage} min={0} onChange={(v) => set('luggage', v)} icon={<Briefcase className="h-4 w-4" />} />
                <Field label="Vehicle Preference" optionalText="(Fleet Category)">
                  <NativeSelect value={form.vehicleCategory} onChange={(v) => set('vehicleCategory', v)} options={VEHICLE_CATEGORIES.map((v) => ({ value: v.name, label: v.name }))} leftIcon={<Car className="h-4 w-4" />} />
                  {vehicle && <p className="mt-1.5 text-xs text-gray-400">{vehicle.capacity}</p>}
                </Field>
              </div>
            </SectionCard>
            )}

            {/* STEP 3 — REVIEW & SUBMIT
                Reads top to bottom on every screen: what to do → what you entered → submit.
                The sticky sidebar is dropped here so the summary gets the full width. */}
            {step === 3 && (
              <>
                <SectionCard step={3} title="Review & Submit">
                  {shortNotice && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <strong>Short notice request.</strong> Your pickup is within the next few hours.
                        Please submit this form and then{' '}
                        <a href={PHONE_HREF} className="font-semibold underline">
                          call or text {PHONE}
                        </a>{' '}
                        so we can confirm availability right away.
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-gray-600">
                    Please check your details below. If something needs changing, use{' '}
                    <button type="button" onClick={() => goToStep(1)} className="font-semibold underline" style={{ color: GOLD }}>
                      Trip Details
                    </button>{' '}
                    or{' '}
                    <button type="button" onClick={() => goToStep(2)} className="font-semibold underline" style={{ color: GOLD }}>
                      Your Information
                    </button>
                    . Nothing is charged now — we&rsquo;ll send you a personalized quote.
                  </p>
                </SectionCard>

                {renderSummaryPanel(true)}

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2 rounded-lg bg-[#fdf6e3] px-4 py-3 text-sm text-gray-600">
                    <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                    Your information is secure and will only be used for your booking.
                  </div>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-black px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--gold)] transition-all hover:bg-gray-900 disabled:opacity-60"
                    style={{ ['--gold' as string]: GOLD }}
                  >
                    {isSubmitting ? 'Submitting…' : <>Submit Booking Request <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-400">We will contact you shortly with your personalized quote.</p>
                </div>
              </>
            )}

            {/* Wizard navigation */}
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step < STEPS.length && (
                <button
                  type="button"
                  onClick={goNext}
                  className="ml-auto inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-8 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-[color:var(--gold)] transition-all hover:bg-gray-900 sm:flex-none"
                  style={{ ['--gold' as string]: GOLD }}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ─────────── RIGHT: LIVE SUMMARY (desktop, steps 1–2 only) ─────────── */}
          {step < 3 && (
            <aside className="hidden lg:sticky lg:top-24 lg:block">{renderSummaryPanel()}</aside>
          )}
        </div>
      </div>
    </div>
  )

  // Summary "cart" — sticky sidebar on desktop, shown on the final step on mobile.
  /**
   * The booking summary.
   *
   * `wide` is used on the review step, where the panel spans the full column instead
   * of sitting in the 360px sidebar — the groups move into two columns so the rows
   * don't stretch into unreadably long label/value pairs.
   */
  function renderSummaryPanel(wide = false) {
    const tripGroup = (
      <SummaryGroup icon={<Plane className="h-3.5 w-3.5" />} title="Trip Details">
        {buildTripSummary().map((row, i) => (
          <SummaryRow key={i} label={row.label} value={row.value} />
        ))}
      </SummaryGroup>
    )

    const vehicleGroup = (
      <SummaryGroup icon={<Users className="h-3.5 w-3.5" />} title="Passenger & Vehicle">
        <SummaryRow label="Passengers" value={String(form.passengers)} inline />
        <SummaryRow label="Luggage" value={String(form.luggage)} inline />
        <SummaryRow label="Vehicle" value={form.vehicleCategory} />
        {vehicle && <p className="text-[11px] text-white/40">{vehicle.capacity}</p>}
      </SummaryGroup>
    )

    // Contact details, so "Review & Submit" can actually be reviewed.
    const contactGroup =
      form.name || form.email || form.phone ? (
        <SummaryGroup icon={<User className="h-3.5 w-3.5" />} title="Your Details">
          {form.name && <SummaryRow label="Name" value={form.name} />}
          {form.phone && <SummaryRow label="Phone" value={form.phone} />}
          {form.email && <SummaryRow label="Email" value={form.email} />}
          {form.company && <SummaryRow label="Company" value={form.company} />}
        </SummaryGroup>
      ) : null

    const noticeCard = (
      <div className="rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 p-4" style={{ ['--gold' as string]: GOLD }}>
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          <Info className="h-3.5 w-3.5" /> Booking Request Only
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">
          You will receive a personalized quote by phone, text, or email after we review your reservation.
        </p>
      </div>
    )

    const helpCard = (
      <a href={PHONE_HREF} className="block rounded-lg border border-[color:var(--gold)]/40 p-4 transition-colors hover:bg-white/5" style={{ ['--gold' as string]: GOLD }}>
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          <Phone className="h-3.5 w-3.5" /> Need Help Booking?
        </p>
        <p className="mt-1 text-sm font-semibold text-white">Call or Text {PHONE}</p>
        <p className="text-xs text-white/50">We’re here for you 24/7.</p>
      </a>
    )

    const divider = <div className="border-t border-white/10" />

    return (
      <div className="overflow-hidden rounded-xl bg-[#0a0a0a] text-white shadow-2xl shadow-black/30 ring-1 ring-white/10">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: GOLD }}>Your Booking Summary</h2>
        </div>
        <div className={`mt-4 w-full overflow-hidden ${wide ? 'h-36 sm:h-44' : 'h-40'}`}>
          <img
            key={config.slug}
            src={summaryImage}
            alt={form.serviceType}
            className="h-full w-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              const step = t.dataset.step
              if (!step) {
                t.dataset.step = 'jpg'
                t.src = `/images/services/service-banner-${config.number}.jpg`
              } else if (step === 'jpg') {
                t.dataset.step = 'stock'
                t.src = config.summaryImage
              }
            }}
          />
        </div>

        {wide ? (
          <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
            <div className="space-y-5">{tripGroup}</div>
            <div className="space-y-5">
              {vehicleGroup}
              {contactGroup && (
                <>
                  {divider}
                  {contactGroup}
                </>
              )}
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              {noticeCard}
              {helpCard}
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {tripGroup}
            {divider}
            {vehicleGroup}
            {contactGroup && (
              <>
                {divider}
                {contactGroup}
              </>
            )}
            {noticeCard}
            {helpCard}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // SERVICE-SPECIFIC FIELD MODULES
  // ─────────────────────────────────────────────
  function renderTripFields() {
    switch (layout) {
      case 'airport':
        return renderAirport()
      case 'fbo':
        return renderFbo()
      case 'hourly':
        return renderHourly()
      case 'mountain':
        return renderMountain()
      case 'event':
        return renderEvent()
      case 'wedding':
      case 'nightlife':
        return renderItinerary()
      default:
        return renderPointToPoint()
    }
  }

  function renderAirport() {
    const arriving = form.airportDirection === 'Arrival'
    return (
      <div className="space-y-6">
        <SegmentToggle
          label="Arrival / Departure"
          value={form.airportDirection}
          onChange={(v) => {
            set('airportDirection', v)
            // Switching to Departure makes the flight number optional — drop any
            // "required" error still on screen from the arrival rules.
            if (v === 'Departure') setErrors((prev) => ({ ...prev, flightNumber: undefined }))
          }}
          options={[
            { value: 'Arrival', label: 'Arrival', icon: <PlaneLanding className="h-4 w-4" /> },
            { value: 'Departure', label: 'Departure', icon: <PlaneTakeoff className="h-4 w-4" /> },
          ]}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <AirlineCombobox airline={airline} setAirline={(a) => { setAirline(a); setErrors((p) => ({ ...p, airline: undefined })) }} error={errors.airline} />
          <Input
            label="Flight Number"
            required={arriving}
            optionalText={arriving ? undefined : 'Optional — helps us track delays'}
            value={form.flightNumber}
            onChange={(v) => set('flightNumber', v)}
            error={errors.flightNumber}
            placeholder="e.g. UA1234"
          />
        </div>
        <DateTimeRow
          dateLabel={arriving ? 'Arrival Date' : 'Departure Date'}
          timeLabel={arriving ? 'Arrival Time' : 'Departure Time'}
          form={form}
          set={set}
          errors={errors}
        />
        {arriving && airline && <MeetGreetBox terminal={airline.terminal} />}
        <div className="grid gap-6 md:grid-cols-2">
          {arriving ? (
            <>
              <ReadOnlyLocation label="Pickup Location (At Airport)" value={AIRPORT_LABEL} />
              <AddressInput label="Destination" required value={form.dropoffLocation} onChange={(v) => set('dropoffLocation', v)} error={errors.dropoffLocation} placeholder="Hotel, home or business address" />
            </>
          ) : (
            <>
              <AddressInput label="Pickup Location" required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Home, hotel or business address" />
              <ReadOnlyLocation label="Destination" value={AIRPORT_LABEL} />
            </>
          )}
        </div>
        {renderReturnBlock()}
      </div>
    )
  }

  function renderFbo() {
    const arriving = form.airportDirection === 'Arrival'
    const fbo = FBO_TERMINALS.find((f) => f.name === form.fboName)
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="FBO / Private Terminal">
            <NativeSelect value={form.fboName} onChange={(v) => set('fboName', v)} options={FBO_TERMINALS.map((f) => ({ value: f.name, label: f.name }))} leftIcon={<Plane className="h-4 w-4" />} />
          </Field>
          <SegmentToggle
            label="Flight Type"
            value={form.airportDirection}
            onChange={(v) => set('airportDirection', v)}
            options={[
              { value: 'Arrival', label: 'Arrival', icon: <PlaneLanding className="h-4 w-4" /> },
              { value: 'Departure', label: 'Departure', icon: <PlaneTakeoff className="h-4 w-4" /> },
            ]}
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Aircraft Type" optional>
            <NativeSelect value={form.aircraftType} onChange={(v) => set('aircraftType', v)} placeholder="Select aircraft type" options={AIRCRAFT_TYPES.map((a) => ({ value: a, label: a }))} />
          </Field>
          <Input label="Tail Number" optional value={form.tailNumber} onChange={(v) => set('tailNumber', v)} placeholder="e.g. N12345" />
        </div>
        <DateTimeRow dateLabel={arriving ? 'Arrival Date' : 'Departure Date'} timeLabel={arriving ? 'Arrival Time' : 'Departure Time'} form={form} set={set} errors={errors} />
        {arriving && (
          <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#166534]"><MapPin className="h-4 w-4" /> Meet &amp; Greet Instructions</p>
            <p className="mt-1 text-sm text-[#15803d]">Your chauffeur will monitor your flight and meet you at:</p>
            <p className="mt-1 text-sm font-semibold text-[#166534]">{fbo?.name}</p>
            {fbo?.address && <p className="text-xs text-[#15803d]">{fbo.address}</p>}
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {arriving ? (
            <>
              <ReadOnlyLocation label="Pickup Location (From FBO)" value={fbo?.name || ''} />
              <AddressInput label="Destination" required value={form.dropoffLocation} onChange={(v) => set('dropoffLocation', v)} error={errors.dropoffLocation} placeholder="Hotel, home or business address" />
            </>
          ) : (
            <>
              <AddressInput label="Pickup Location" required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Home, hotel or business address" />
              <ReadOnlyLocation label="Destination (FBO)" value={fbo?.name || ''} />
            </>
          )}
        </div>
        {renderReturnBlock()}
      </div>
    )
  }

  function renderPointToPoint() {
    const hourly = form.tripType === 'Hourly (As Directed)'
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Input label="Pickup Date" type="date" required min={todayISO} value={form.pickupDate} onChange={(v) => set('pickupDate', v)} error={errors.pickupDate} />
          <Input label="Pickup Time" type="time" required value={form.pickupTime} onChange={(v) => set('pickupTime', v)} error={errors.pickupTime} />
          {hourly && (
            <Field label="Duration / Hours" optional>
              <NativeSelect value={form.durationHours} onChange={(v) => set('durationHours', v)} placeholder="Select hours" options={HOURLY_DURATIONS.map((h) => ({ value: h, label: h }))} leftIcon={<Clock className="h-4 w-4" />} />
            </Field>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AddressInput label="Pickup Location" required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Home, hotel or business address" />
          <AddressInput label="Destination" required value={form.dropoffLocation} onChange={(v) => set('dropoffLocation', v)} error={errors.dropoffLocation} placeholder="Drop-off address" />
        </div>
        {renderReturnBlock()}
      </div>
    )
  }

  function renderHourly() {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#854d0e]">
          <span className="font-bold">Hourly Service (As Directed).</span> Your chauffeur will be at your service for the selected number of hours.
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Input label="Date" type="date" required min={todayISO} value={form.pickupDate} onChange={(v) => set('pickupDate', v)} error={errors.pickupDate} />
          <Input label="Start Time" type="time" required value={form.pickupTime} onChange={(v) => set('pickupTime', v)} error={errors.pickupTime} />
          <Field label="Hourly Duration" required>
            <NativeSelect value={form.durationHours} onChange={(v) => set('durationHours', v)} placeholder="Select hours" options={HOURLY_DURATIONS.map((h) => ({ value: h, label: h }))} leftIcon={<Clock className="h-4 w-4" />} />
          </Field>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AddressInput label="Pickup Location" required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Starting address" />
          <Field label="Service Area">
            <NativeSelect value={form.serviceArea} onChange={(v) => set('serviceArea', v)} options={SERVICE_AREAS.map((s) => ({ value: s, label: s }))} leftIcon={<MapPin className="h-4 w-4" />} />
          </Field>
        </div>
      </div>
    )
  }

  function renderMountain() {
    const arriving = form.pickupType === 'Airport'
    return (
      <div className="space-y-6">
        <Field label="Pickup Type">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { value: 'Airport', label: 'Airport (DEN)', sub: 'Arriving at the airport', icon: <Plane className="h-4 w-4" /> },
              { value: 'Hotel', label: 'Hotel', sub: 'Staying at a hotel', icon: <Hotel className="h-4 w-4" /> },
              { value: 'Residence', label: 'Residence / Airbnb', sub: 'Pick up from residence', icon: <Home className="h-4 w-4" /> },
            ] as const).map((opt) => {
              const active = form.pickupType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('pickupType', opt.value)}
                  aria-pressed={active}
                  className={`rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--gold)] ${
                    active
                      ? 'border-transparent shadow-sm hover:brightness-95'
                      : 'border-gray-200 bg-white hover:border-[color:var(--gold)] hover:bg-[color:var(--gold)]/10'
                  }`}
                  style={{ ['--gold' as string]: GOLD, ...(active ? { backgroundColor: GOLD } : {}) }}
                >
                  <span className={`flex items-center gap-2 text-sm font-semibold ${active ? '' : 'text-gray-900'}`} style={{ color: active ? '#0a0a0a' : undefined }}>
                    {opt.icon} {opt.label}
                  </span>
                  <span className={`mt-0.5 block text-xs ${active ? '' : 'text-gray-500'}`} style={{ color: active ? 'rgba(10,10,10,0.75)' : undefined }}>
                    {opt.sub}
                  </span>
                </button>
              )
            })}
          </div>
        </Field>

        {arriving ? (
          <div className="grid gap-6 md:grid-cols-2">
            <AirlineCombobox airline={airline} setAirline={(a) => { setAirline(a); setErrors((p) => ({ ...p, airline: undefined })) }} error={errors.airline} labelOverride="Arrival Airline" />
            <Input label="Flight Number" optional value={form.flightNumber} onChange={(v) => set('flightNumber', v)} placeholder="e.g. AA1234" />
          </div>
        ) : (
          <AddressInput label={`Pickup Location (${form.pickupType})`} required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Hotel or residence address" />
        )}

        <DateTimeRow dateLabel={arriving ? 'Arrival Date' : 'Pickup Date'} timeLabel={arriving ? 'Arrival Time' : 'Pickup Time'} form={form} set={set} errors={errors} />
        {arriving && airline && <MeetGreetBox terminal={airline.terminal} />}

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Destination (Resort)" required>
            <NativeSelect value={form.resort} onChange={(v) => set('resort', v)} placeholder="Select resort" options={MOUNTAIN_RESORTS.map((r) => ({ value: r, label: r }))} leftIcon={<Mountain className="h-4 w-4" />} />
            {errors.dropoffLocation && !form.resort && <p className="mt-1 text-xs text-red-500">{errors.dropoffLocation}</p>}
          </Field>
          <AddressInput label="Resort / Hotel Address" optional value={form.dropoffLocation} onChange={(v) => set('dropoffLocation', v)} placeholder="Specific lodge or address (optional)" />
        </div>
        {renderReturnBlock()}
      </div>
    )
  }

  function renderEvent() {
    const sporting = isSportingService(form.serviceType)
    const venues = sporting ? SPORTING_VENUES : CONCERT_VENUES
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" style={{ color: GOLD }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: GOLD }}>Event Information</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Field label="Event / Venue" required>
            <NativeSelect value={form.eventVenue} onChange={(v) => set('eventVenue', v)} placeholder="Select venue" options={venues.map((v) => ({ value: v, label: v }))} leftIcon={<MapPin className="h-4 w-4" />} />
            {errors.eventVenue && <p className="mt-1 text-xs text-red-500">{errors.eventVenue}</p>}
          </Field>
          <Input label="Event Date" type="date" required min={todayISO} value={form.eventDate} onChange={(v) => set('eventDate', v)} error={errors.eventDate} />
          <Input label="Event Time" type="time" value={form.eventTime} onChange={(v) => set('eventTime', v)} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AddressInput label="Pickup Location (From)" required value={form.pickupLocation} onChange={(v) => set('pickupLocation', v)} error={errors.pickupLocation} placeholder="Home, hotel or residence" />
          <Input label="Pickup Time" type="time" value={form.pickupTime} onChange={(v) => set('pickupTime', v)} />
        </div>
        <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#854d0e]">
          <span className="font-bold">Recommended Pickup:</span> we suggest pickup 2–2.5 hours before event time to ensure on-time arrival and smooth entry.
        </div>
        {form.tripType !== 'One Way' && (
          <div className="grid gap-6 md:grid-cols-2">
            <AddressInput label="Return Pickup Location (After Event)" value={form.returnPickupLocation} onChange={(v) => set('returnPickupLocation', v)} placeholder="Where should we pick you up after?" />
            <Input label="Return Pickup Time" type="time" value={form.returnPickupTime} onChange={(v) => set('returnPickupTime', v)} />
          </div>
        )}
      </div>
    )
  }

  function renderItinerary() {
    const nightlife = layout === 'nightlife'
    return (
      <div className="space-y-6">
        {nightlife && (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#854d0e]">
            <span className="font-bold">Hourly Service (As Directed).</span> Plan your stops below — add or remove as needed (minimum 3 hours).
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          <Input label={nightlife ? 'Date' : 'Wedding Date'} type="date" required min={todayISO} value={form.pickupDate} onChange={(v) => set('pickupDate', v)} error={errors.pickupDate} />
          {nightlife ? (
            <>
              <Input label="Start Time" type="time" value={form.pickupTime} onChange={(v) => set('pickupTime', v)} />
              <Field label="Hourly Duration">
                <NativeSelect value={form.durationHours} onChange={(v) => set('durationHours', v)} placeholder="Select hours" options={HOURLY_DURATIONS.slice(1).map((h) => ({ value: h, label: h }))} leftIcon={<Clock className="h-4 w-4" />} />
              </Field>
            </>
          ) : (
            <Input label="Start Time" type="time" value={form.pickupTime} onChange={(v) => set('pickupTime', v)} />
          )}
        </div>

        <Field label={nightlife ? 'Itinerary (As Directed)' : 'Wedding-Day Itinerary'}>
          <p className="mb-3 text-xs text-gray-500">Plan your stops. You can add or remove stops as needed.</p>
          <div className="space-y-3">
            {itinerary.map((stop, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--gold)] text-[10px] text-white" style={{ ['--gold' as string]: GOLD }}>{i + 1}</span>
                    {stop.label}
                  </span>
                  {i !== 0 && i !== itinerary.length - 1 && (
                    <button type="button" onClick={() => removeItineraryStop(i)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <PlaceInput
                    value={stop.location}
                    onChange={(v) => updateItineraryStop(i, 'location', v)}
                    placeholder="Address / venue"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)]"
                  />
                  <input
                    type="time"
                    value={stop.time}
                    onChange={(e) => updateItineraryStop(i, 'time', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)]"
                    style={{ ['--gold' as string]: GOLD }}
                  />
                </div>
                {i === 0 && errors.itin0 && <p className="mt-1 text-xs text-red-500">{errors.itin0}</p>}
              </div>
            ))}
          </div>
          <button type="button" onClick={addItineraryStop} className="mt-3 flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[color:var(--gold)]/5" style={{ ['--gold' as string]: GOLD, color: GOLD, borderColor: GOLD }}>
            <Plus className="h-4 w-4" /> Add Stop
          </button>
        </Field>

        {form.passengers >= 8 && (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#854d0e]">
            <span className="font-bold">Larger Vehicle Assistance.</span> For {form.passengers} passengers we recommend a Sprinter Van or Party Bus for everyone’s comfort. Need help choosing? Call or text us anytime.
          </div>
        )}
      </div>
    )
  }

  function renderReturnBlock() {
    if (!showReturn) return null
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          <Calendar className="h-3.5 w-3.5" /> Return Trip
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <AddressInput label="Return Pickup Location" value={form.returnPickupLocation} onChange={(v) => set('returnPickupLocation', v)} placeholder="Return pickup address" />
          <Input label="Return Date" type="date" required min={form.pickupDate || todayISO} value={form.returnDate} onChange={(v) => set('returnDate', v)} error={errors.returnDate} />
          <Input label="Return Time" type="time" value={form.returnTime} onChange={(v) => set('returnTime', v)} />
        </div>
      </div>
    )
  }

  // Itinerary helpers
  function updateItineraryStop(i: number, key: keyof ItineraryStop, value: string) {
    setItinerary((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))
    if (i === 0 && errors.itin0) setErrors((p) => ({ ...p, itin0: undefined }))
  }
  function addItineraryStop() {
    setItinerary((prev) => {
      const insertAt = Math.max(1, prev.length - 1)
      const next = [...prev]
      next.splice(insertAt, 0, { label: `Stop ${insertAt}`, location: '', time: '' })
      return next.map((s, idx) => (idx === 0 || idx === next.length - 1 ? s : { ...s, label: `Stop ${idx}` }))
    })
  }
  function removeItineraryStop(i: number) {
    setItinerary((prev) => prev.filter((_, idx) => idx !== i).map((s, idx, arr) => (idx === 0 || idx === arr.length - 1 ? s : { ...s, label: `Stop ${idx}` })))
  }

  // ─────────────────────────────────────────────
  // LIVE SUMMARY ROWS
  // ─────────────────────────────────────────────
  function buildTripSummary(): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [
      { label: 'Service', value: form.serviceType },
      { label: 'Trip Type', value: form.tripType },
    ]
    const dash = (s: string) => s || '—'

    if (layout === 'airport') {
      rows.push({ label: form.airportDirection, value: dash(`${form.flightNumber}${airline ? ` · ${airline.name}` : ''}`) })
      if (airline && form.airportDirection === 'Arrival') rows.push({ label: 'Meet & Greet', value: MEET_GREET[airline.terminal].terminal })
    }
    if (layout === 'fbo') {
      rows.push({ label: 'FBO', value: dash(form.fboName) })
      if (form.tailNumber) rows.push({ label: 'Tail #', value: form.tailNumber })
    }
    if (layout === 'event') {
      rows.push({ label: 'Venue', value: dash(form.eventVenue) })
      if (form.eventDate) rows.push({ label: 'Event', value: fmtDateTime(form.eventDate, form.eventTime) })
    }
    if (layout === 'mountain') rows.push({ label: 'Pickup Type', value: form.pickupType })
    if (layout === 'hourly' || (layout === 'pointToPoint' && form.tripType === 'Hourly (As Directed)') || layout === 'nightlife') {
      if (form.durationHours) rows.push({ label: 'Duration', value: form.durationHours })
      if (layout === 'hourly') rows.push({ label: 'Service Area', value: form.serviceArea })
    }

    if (layout === 'wedding' || layout === 'nightlife') {
      itinerary.filter((s) => s.location).forEach((s) => rows.push({ label: s.label, value: `${s.location}${s.time ? ` · ${fmtTime(s.time)}` : ''}` }))
    } else {
      if (form.pickupDate) rows.push({ label: 'Pickup', value: fmtDateTime(form.pickupDate, form.pickupTime) })
      if (derivedPickup) rows.push({ label: 'From', value: derivedPickup })
      const dropoff = derivedDropoff || form.resort
      if (dropoff) rows.push({ label: 'To', value: dropoff })
    }

    if (showReturn && form.returnDate) rows.push({ label: 'Return', value: fmtDateTime(form.returnDate, form.returnTime) })
    if (stops.filter(Boolean).length) rows.push({ label: 'Stops', value: stops.filter(Boolean).join(', ') })
    return rows
  }
}

// ═════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═════════════════════════════════════════════

/** Wizard progress bar — completed steps are clickable to go back and edit. */
function Stepper({ current, onSelect }: { current: number; onSelect: (n: number) => void }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onSelect(n)}
                disabled={n >= current}
                className={`flex items-center gap-2.5 ${done ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    done
                      ? 'bg-black text-white'
                      : active
                        ? 'bg-black'
                        : 'border border-gray-300 bg-white text-gray-400'
                  }`}
                  style={active ? { color: GOLD } : undefined}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span
                  className={`hidden whitespace-nowrap text-xs font-bold uppercase tracking-wider sm:block ${
                    active ? 'text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </button>
              {n < STEPS.length && <span className={`mx-3 h-px flex-1 ${done ? 'bg-black' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 sm:hidden">
        Step {current} of {STEPS.length} — {STEPS[current - 1]}
      </p>
    </div>
  )
}

function SectionCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-bold" style={{ color: GOLD }}>{step}</span>
        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.section>
  )
}

function Field({ label, required, optional, optionalText, icon, children }: { label: string; required?: boolean; optional?: boolean; optionalText?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-700">
        <span className="flex items-center gap-1.5">
          {icon && <span className="text-gray-400">{icon}</span>}
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        {optional && <span className="font-normal normal-case tracking-normal text-gray-400">(Optional)</span>}
        {optionalText && <span className="font-normal normal-case tracking-normal text-gray-400">{optionalText}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ label, value, onChange, error, icon, required, optional, optionalText, placeholder, type = 'text', min }: { label: string; value: string; onChange: (v: string) => void; error?: string; icon?: React.ReactNode; required?: boolean; optional?: boolean; optionalText?: string; placeholder?: string; type?: string; min?: string }) {
  return (
    <Field label={label} required={required} optional={optional} optionalText={optionalText}>
      <div className="relative">
        {icon && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          className={`w-full rounded-lg border py-2.5 text-sm text-gray-900 outline-none transition-colors focus:bg-white ${error ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'} ${icon ? 'pl-10 pr-3' : 'px-3'}`}
          style={{ ['--tw-ring-color' as string]: GOLD }}
          onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={(e) => (e.currentTarget.style.borderColor = error ? '#fca5a5' : '#e5e7eb')}
        />
      </div>
      {error && <p data-field-error className="mt-1 text-xs text-red-500">{error}</p>}
    </Field>
  )
}

/** Labelled address field — matches Input's look, with address suggestions. */
function AddressInput({
  label,
  value,
  onChange,
  error,
  required,
  optional,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  optional?: boolean
  placeholder?: string
}) {
  return (
    <Field label={label} required={required} optional={optional}>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="h-4 w-4" />
        </div>
        <PlaceInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition-colors focus:border-[color:var(--gold)] focus:bg-white ${
            error ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'
          }`}
        />
      </div>
      {error && <p data-field-error className="mt-1 text-xs text-red-500">{error}</p>}
    </Field>
  )
}

function NativeSelect({ value, onChange, options, placeholder, leftIcon }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; leftIcon?: React.ReactNode }) {
  return (
    <div className="relative">
      {leftIcon && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-lg border border-gray-200 bg-gray-50/50 py-2.5 pr-9 text-sm text-gray-900 outline-none transition-colors focus:bg-white ${leftIcon ? 'pl-10' : 'pl-3'} ${value ? '' : 'text-gray-400'}`}
        onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function Select({ label, value, onChange, options, leftIcon }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; leftIcon?: React.ReactNode }) {
  return (
    <Field label={label}>
      <NativeSelect value={value} onChange={onChange} options={options} leftIcon={leftIcon} />
    </Field>
  )
}

function ReadOnlyLocation({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
        <MapPin className="h-4 w-4 text-gray-400" /> {value}
      </div>
    </Field>
  )
}

function DateTimeRow({ dateLabel, timeLabel, form, set, errors }: { dateLabel: string; timeLabel: string; form: any; set: (k: string, v: unknown) => void; errors: FormErrors }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Input label={dateLabel} type="date" required min={todayISO} value={form.pickupDate} onChange={(v) => set('pickupDate', v)} error={errors.pickupDate} icon={<Calendar className="h-4 w-4" />} />
      <Input label={timeLabel} type="time" required value={form.pickupTime} onChange={(v) => set('pickupTime', v)} error={errors.pickupTime} icon={<Clock className="h-4 w-4" />} />
    </div>
  )
}

function Counter({ label, value, onChange, min = 0, icon }: { label: string; value: number; onChange: (v: number) => void; min?: number; icon?: React.ReactNode }) {
  return (
    <Field label={label} required>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-2">
        <span className="pl-2 text-gray-400">{icon}</span>
        <span className="font-semibold text-gray-900">{value}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={() => onChange(value + 1)} className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
    </Field>
  )
}

/**
 * Shared styling for the segmented choice buttons (trip type, arrival/departure, pickup type).
 *
 * The selected state used to be gold text on a 5%-gold tint — 2.3:1 contrast, which read
 * as invisible. Selected now inverts to a solid gold fill with near-black text (8.2:1),
 * and both states have a distinct hover so the control feels clickable.
 */
const SEGMENT_BASE =
  'relative flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--gold)]'

function segmentProps(active: boolean) {
  return {
    className: `${SEGMENT_BASE} ${
      active
        ? 'border-transparent shadow-sm hover:brightness-95'
        : 'border-gray-200 bg-white text-gray-600 hover:border-[color:var(--gold)] hover:bg-[color:var(--gold)]/10 hover:text-gray-900'
    }`,
    style: {
      ['--gold' as string]: GOLD,
      ...(active ? { backgroundColor: GOLD, color: '#0a0a0a' } : {}),
    },
  }
}

function TripTypeToggle({ value, onChange }: { value: TripType; onChange: (v: TripType) => void }) {
  const options: TripType[] = ['One Way', 'Round Trip', 'Hourly (As Directed)']
  return (
    <Field label="Trip Type">
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={active}
              {...(() => {
                const p = segmentProps(active)
                return { ...p, className: `${p.className} px-2 py-2.5 text-xs` }
              })()}
            >
              {opt === 'Hourly (As Directed)' ? 'Hourly' : opt}
              {active && <Check className="absolute right-1.5 top-1.5 h-3 w-3" />}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

function SegmentToggle<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: React.ReactNode }[] }) {
  return (
    <Field label={label}>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              {...(() => {
                const p = segmentProps(active)
                return { ...p, className: `${p.className} py-2.5 text-sm` }
              })()}
            >
              {opt.icon} {opt.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

function MeetGreetBox({ terminal }: { terminal: 'East' | 'West' }) {
  const mg = MEET_GREET[terminal]
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#166534]"><MapPin className="h-4 w-4" /> Meet &amp; Greet Instructions</p>
      <p className="mt-1 text-sm font-semibold text-[#166534]">{mg.instructions}</p>
      <p className="mt-1 text-xs text-[#15803d]">Your chauffeur will be holding a sign with your name.</p>
    </motion.div>
  )
}

function AdditionalStops({ stops, setStops }: { stops: string[]; setStops: (s: string[]) => void }) {
  return (
    <div className="mt-6">
      <Field label="Additional Stops" optional icon={<MapPin className="h-4 w-4" />}>
        <div className="space-y-2">
          {stops.map((s, i) => (
            <div key={i} className="flex gap-2">
              <PlaceInput
                value={s}
                onChange={(val) => setStops(stops.map((v, idx) => (idx === i ? val : v)))}
                placeholder={`Stop ${i + 1} address`}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm outline-none focus:border-[color:var(--gold)] focus:bg-white"
              />
              <button type="button" onClick={() => setStops(stops.filter((_, idx) => idx !== i))} className="rounded-lg border border-gray-200 px-3 text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setStops([...stops, ''])} className="mt-2 flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: GOLD, borderColor: GOLD }}>
          <Plus className="h-4 w-4" /> Add Stop
        </button>
      </Field>
    </div>
  )
}

function SummaryGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>{icon} <span>{title}</span></p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value, inline }: { label: string; value: string; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">{label}</span>
        <span className="font-medium text-white">{value || '—'}</span>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-sm font-medium leading-snug text-white">{value || '—'}</p>
    </div>
  )
}

// ── Airline searchable combobox with logo + code-badge fallback ──
function AirlineCombobox({ airline, setAirline, error, labelOverride }: { airline: Airline | null; setAirline: (a: Airline) => void; error?: string; labelOverride?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    if (!query) return DEN_AIRLINES
    const q = query.toLowerCase()
    return DEN_AIRLINES.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
  }, [query])

  return (
    <Field label={labelOverride || 'Airline'} required>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${error ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'}`}
        >
          {airline ? (
            <span className="flex items-center gap-2 text-gray-900">
              <AirlineLogo airline={airline} />
              <span className="font-medium">{airline.name}</span>
            </span>
          ) : (
            <span className="text-gray-400">Search airline by name or code…</span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        {error && <p data-field-error className="mt-1 text-xs text-red-500">{error}</p>}

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
              <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type UA, AA, United…"
                    className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--gold)]"
                    style={{ ['--gold' as string]: GOLD }}
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No airlines found.</div>
                ) : (
                  filtered.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => { setAirline(a); setOpen(false); setQuery('') }}
                      className="flex w-full items-center justify-between border-b border-gray-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-3">
                        <AirlineLogo airline={a} />
                        <span className="text-gray-900">{a.name}</span>
                      </span>
                      {airline?.code === a.code && <Check className="h-4 w-4" style={{ color: GOLD }} />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Field>
  )
}

function AirlineLogo({ airline }: { airline: Airline }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded bg-gray-900 px-1.5 text-[11px] font-bold text-white">{airline.code}</span>
  }
  return (
    <span className="inline-flex h-6 w-9 items-center justify-center overflow-hidden rounded bg-white ring-1 ring-gray-200">
      <img src={airline.logo} alt={airline.code} className="h-full w-full object-contain" onError={() => setFailed(true)} />
    </span>
  )
}

function SuccessScreen({ name, phone, email, reference }: { name: string; phone: string; email: string; reference?: string }) {
  const first = name ? name.split(' ')[0] : 'there'
  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-16 font-body text-gray-900">
      <div className="mx-auto max-w-2xl px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-lg shadow-green-500/20">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-[#16a34a]">Booking Request Submitted!</h1>
          <p className="mt-2 text-lg text-gray-900">Thank you, {first}!</p>
          {reference && (
            <div className="mx-auto mt-6 inline-block rounded-lg border border-gray-200 border-l-4 px-6 py-3" style={{ borderLeftColor: GOLD }}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Your reference</p>
              <p className="mt-0.5 font-display text-2xl font-bold tracking-wider text-gray-900">{reference}</p>
            </div>
          )}
          <p className="mx-auto mt-4 max-w-lg text-gray-600">
            We’ve received your booking request and will review it shortly. You’ll receive a personalized quote by phone, text, or email — this is a <strong>booking request only</strong>, no payment is required now.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <Phone className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">We may contact you at<br /><strong className="text-gray-900">{phone}</strong></p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <Mail className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">Confirmation sent to<br /><strong className="text-gray-900">{email}</strong></p>
            </div>
          </div>
          <button onClick={() => (window.location.href = '/')} className="mt-8 rounded-lg bg-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--gold)] transition-colors hover:bg-gray-900" style={{ ['--gold' as string]: GOLD }}>
            Return to Home
          </button>
        </motion.div>
      </div>
    </div>
  )
}
