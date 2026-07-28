import { motion } from 'framer-motion'
import { type FormEvent, useState } from 'react'
import { Clock, MapPin, Loader2, CheckCircle2 } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { PageHero } from '../components/ui'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_BUSINESS, telHref, mailHref, type BusinessInfo } from '../content/defaults'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function ContactPage() {
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }

  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Contact', ...form }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We're Here 24/7"
        subtitle="Reach our team for reservations, quotes, corporate accounts, and special event planning."
        image="/images/about-hero.jpg"
        fallback={IMAGES.hero1}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <motion.a
              href={telHref(biz.phone)}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">PHONE</p>
                <p className="font-display text-2xl text-white">{biz.phone}</p>
                <p className="text-sm text-white/60">Click to call — 24/7 support</p>
              </div>
            </motion.a>
            <motion.a
              href={mailHref(biz.email)}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">EMAIL</p>
                <p className="text-lg text-white">{biz.email}</p>
              </div>
            </motion.a>
            <motion.a
              href={biz.facebook}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">FACEBOOK</p>
                <p className="text-lg text-white">{biz.companyName}</p>
              </div>
            </motion.a>
            <motion.div
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <MapPin className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">SERVICE AREA</p>
                <p className="text-white/80">{biz.address}</p>
              </div>
            </motion.div>
            <motion.div
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <Clock className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">SERVICE HOURS</p>
                <p className="text-white/80">{biz.hours}</p>
                <p className="text-sm text-white/60">Reservations accepted 24/7</p>
              </div>
            </motion.div>
          </div>

          <div className="border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <h2 className="font-display text-2xl text-brand-gold-light">Send a Message</h2>
            {status === 'sent' ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded border border-green-500/30 bg-green-500/10 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="text-white/90">Thank you — your message has been received. Our team will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Name" value={form.name} onChange={(v) => setField('name', v)} required />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setField('email', v)} required />
                <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} required />
                <div>
                  <label className="text-xs tracking-widest text-brand-gold/80">Message</label>
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
                    Something went wrong. Please try again or call us at {biz.phone}.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="flex w-full items-center justify-center gap-2 bg-gold-gradient py-3 text-xs font-bold tracking-[0.2em] text-brand-black disabled:opacity-70"
                >
                  {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> SENDING…</> : 'SEND MESSAGE'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <CTABanner />
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
