import { motion } from 'framer-motion'
import { type FormEvent, useState } from 'react'
import { PageHero } from '../components/ui'
import { SERVICE_TYPES, VEHICLE_PREFERENCES } from '../constants'

type FormErrors = Record<string, string>

export function BookNowPage() {
  const [submitted, setSubmitted] = useState(false)
  const [roundTrip, setRoundTrip] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (data: Record<string, FormDataEntryValue>) => {
    const next: FormErrors = {}
    if (!String(data.serviceType)) next.serviceType = 'Select a service type'
    if (!String(data.pickupDate)) next.pickupDate = 'Pickup date is required'
    if (!String(data.pickupTime)) next.pickupTime = 'Pickup time is required'
    if (!String(data.pickupLocation)) next.pickupLocation = 'Pickup location is required'
    if (!String(data.dropoffLocation)) next.dropoffLocation = 'Drop-off location is required'
    if (!String(data.passengers)) next.passengers = 'Passenger count is required'
    if (!String(data.name)) next.name = 'Name is required'
    if (!String(data.phone)) next.phone = 'Phone is required'
    const email = String(data.email)
    if (!email) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email'
    if (roundTrip && !String(data.returnDate)) next.returnDate = 'Return date is required'
    if (roundTrip && !String(data.returnTime)) next.returnTime = 'Return time is required'
    return next
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const nextErrors = validate(data)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    console.log('Booking payload:', { ...data, roundTrip })
    setSubmitted(true)
  }

  return (
    <>
      <PageHero
        eyebrow="Reservations"
        title="Reserve Your Ride"
        subtitle="Complete the form below and our team will confirm your luxury chauffeured transportation."
        image="/images/hero1.jpg"
      />
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        {submitted ? (
          <div className="border border-brand-gold/30 bg-brand-surface p-8 text-center">
            <h2 className="font-display text-3xl text-brand-gold-light">Request Received</h2>
            <p className="mt-4 text-white/70">
              Thank you for choosing Denver Black Limo. A coordinator will contact you shortly to confirm
              your reservation details.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <SelectField
              label="Service Type"
              name="serviceType"
              error={errors.serviceType}
              options={SERVICE_TYPES}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Pickup Date" name="pickupDate" type="date" error={errors.pickupDate} />
              <InputField label="Pickup Time" name="pickupTime" type="time" error={errors.pickupTime} />
            </div>
            <InputField label="Pickup Location" name="pickupLocation" error={errors.pickupLocation} />
            <InputField label="Drop-off Location" name="dropoffLocation" error={errors.dropoffLocation} />
            <InputField
              label="Number of Passengers"
              name="passengers"
              type="number"
              min={1}
              error={errors.passengers}
            />
            <SelectField
              label="Vehicle Preference (optional)"
              name="vehiclePreference"
              options={VEHICLE_PREFERENCES}
              optional
            />
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
                className="accent-brand-gold"
              />
              Round trip
            </label>
            {roundTrip && (
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Return Date" name="returnDate" type="date" error={errors.returnDate} />
                <InputField label="Return Time" name="returnTime" type="time" error={errors.returnTime} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Name" name="name" error={errors.name} />
              <InputField label="Phone" name="phone" type="tel" error={errors.phone} />
            </div>
            <InputField label="Email" name="email" type="email" error={errors.email} />
            <div>
              <label className="text-xs tracking-widest text-brand-gold/80">Special Requests</label>
              <textarea
                name="notes"
                rows={4}
                className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gold-gradient py-3 text-xs font-bold tracking-[0.25em] text-brand-black"
            >
              SUBMIT RESERVATION REQUEST
            </button>
          </form>
        )}
      </section>
    </>
  )
}

function InputField({
  label,
  name,
  type = 'text',
  error,
  min,
}: {
  label: string
  name: string
  type?: string
  error?: string
  min?: number
}) {
  return (
    <div>
      <label className="text-xs tracking-widest text-brand-gold/80">{label}</label>
      <input
        name={name}
        type={type}
        min={min}
        className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  name,
  options,
  error,
  optional,
}: {
  label: string
  name: string
  options: readonly string[]
  error?: string
  optional?: boolean
}) {
  return (
    <div>
      <label className="text-xs tracking-widest text-brand-gold/80">{label}</label>
      <select
        name={name}
        required={!optional}
        defaultValue=""
        className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
      >
        <option value="" disabled>
          {optional ? 'Select (optional)' : 'Select...'}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
