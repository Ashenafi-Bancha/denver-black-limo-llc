import { type FormEvent, useState } from 'react'
import { PageHero } from '../components/ui'
import { SERVICE_TYPES } from '../constants'

export function RequestQuotePage() {
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = Object.fromEntries(new FormData(form))
    console.log('Quote request:', data)
    setSubmitted(true)
  }

  return (
    <>
      <PageHero
        eyebrow="Quotes"
        title="Request a Quote"
        subtitle="Tell us about your trip or event — we'll respond with a tailored luxury transportation quote."
        image="/images/hero1.jpg"
      />
      <section className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        {submitted ? (
          <div className="border border-brand-gold/30 bg-brand-surface p-8 text-center">
            <h2 className="font-display text-3xl text-brand-gold-light">Quote Request Sent</h2>
            <p className="mt-4 text-white/70">Our team will follow up with pricing and availability shortly.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Phone" name="phone" type="tel" required />
            <div>
              <label className="text-xs tracking-widest text-brand-gold/80">Service Interested In</label>
              <select
                name="service"
                required
                defaultValue=""
                className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
              >
                <option value="" disabled>
                  Select a service
                </option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Event Date (optional)" name="eventDate" type="date" />
            <div>
              <label className="text-xs tracking-widest text-brand-gold/80">Message / Details</label>
              <textarea
                name="message"
                required
                rows={5}
                className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
              />
            </div>
            <button
              type="submit"
              className="w-full border border-brand-gold/60 py-3 text-xs font-bold tracking-[0.2em] text-brand-gold-light transition hover:bg-brand-gold/10"
            >
              SUBMIT QUOTE REQUEST
            </button>
          </form>
        )}
      </section>
    </>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs tracking-widest text-brand-gold/80">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
      />
    </div>
  )
}
