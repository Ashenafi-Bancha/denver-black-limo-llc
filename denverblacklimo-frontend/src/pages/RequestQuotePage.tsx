import { type FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PageHero } from '../components/ui'
import { SERVICE_TYPES } from '../constants'
import { IMAGES } from '../config/images'
import { OPTION_CLASS, OPTION_PLACEHOLDER_CLASS } from '../lib/formStyles'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function RequestQuotePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', eventDate: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [honeypot, setHoneypot] = useState('')

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity()
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Quote', ...form, website: honeypot }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Quotes"
        title="Request a Quote"
        subtitle="Tell us about your trip or event — we'll respond with a tailored luxury transportation quote."
        image={IMAGES.hero1}
      />
      <section className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        {status === 'sent' ? (
          <div className="border border-brand-gold/30 bg-brand-surface p-8 text-center">
            <h2 className="font-display text-3xl text-brand-gold-light">Quote Request Sent</h2>
            <p className="mt-4 text-white/70">Our team will follow up with pricing and availability shortly.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label>
                Website
                <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </label>
            </div>
            <Field label="Name" value={form.name} onChange={(v) => setField('name', v)} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setField('email', v)} required />
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} required />
            <div>
              <label className="text-xs tracking-widest text-brand-gold/80">Service Interested In</label>
              <select
                required
                value={form.service}
                onChange={(e) => setField('service', e.target.value)}
                className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
              >
                <option value="" disabled className={OPTION_PLACEHOLDER_CLASS}>Select a service</option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s} className={OPTION_CLASS}>{s}</option>
                ))}
              </select>
            </div>
            <Field label="Event Date (optional)" type="date" value={form.eventDate} onChange={(v) => setField('eventDate', v)} />
            <div>
              <label className="text-xs tracking-widest text-brand-gold/80">Message / Details</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
              />
            </div>
            {status === 'error' && (
              <p className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                Something went wrong. Please try again or call us directly.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-gold/60 py-3 text-xs font-bold tracking-[0.2em] text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10 disabled:opacity-70"
            >
              {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> SUBMITTING…</> : 'SUBMIT QUOTE REQUEST'}
            </button>
          </form>
        )}
      </section>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs tracking-widest text-brand-gold/80">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
      />
    </div>
  )
}
