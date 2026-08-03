import { motion } from 'framer-motion'
import { type FormEvent, useState } from 'react'
import {
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  Headphones,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Timer,
  UserRound,
} from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { IMAGES } from '../config/images'
import { SERVICE_TYPES } from '../constants'
import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  DEFAULT_BUSINESS,
  DEFAULT_FAQS,
  telHref,
  mailHref,
  type BusinessInfo,
  type Faq,
} from '../content/defaults'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const trustItems = [
  { icon: Headphones, title: '24/7 SUPPORT', text: "We're here anytime, day or night." },
  { icon: Timer, title: 'QUICK RESPONSE', text: 'We respond to all inquiries promptly.' },
  { icon: ShieldCheck, title: 'YOUR PRIVACY', text: 'Your information is safe with us.' },
  { icon: UserRound, title: 'PROFESSIONAL SERVICE', text: 'Expect first-class service every time.' },
]

export function ContactPage() {
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const faqs = get<Faq[]>('faqs', DEFAULT_FAQS)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    pickup: '',
    dropoff: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showAllFaqs, setShowAllFaqs] = useState(false)

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    // Fold trip fields into the message so the existing backend schema is unchanged.
    const details = [
      form.pickup && `Pick-Up: ${form.pickup}`,
      form.dropoff && `Drop-Off: ${form.dropoff}`,
      form.message && `\n${form.message}`,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const res = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Contact',
          name: form.name,
          email: form.email,
          phone: form.phone,
          service: form.service || undefined,
          message: details || 'Contact request',
        }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const visibleFaqs = showAllFaqs ? faqs : faqs.slice(0, 5)

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-brand-black px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-brand-gold/60'

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src="/images/contact/contact-hero.jpeg"
          alt="Denver Black Limo — contact us"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            const t = e.currentTarget
            const step = t.dataset.step
            if (!step) {
              t.dataset.step = 'about'
              t.src = '/images/about-hero.jpg'
            } else if (step === 'about') {
              t.dataset.step = 'stock'
              t.src = IMAGES.hero1
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/70 to-brand-black/30 md:bg-gradient-to-r md:from-brand-black md:via-brand-black/80 md:to-brand-black/20" />
        <motion.div
          className="relative mx-auto flex min-h-[46vh] max-w-7xl flex-col justify-end px-4 pb-12 pt-28 md:justify-center md:px-6 md:pb-16"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <p className="text-xs tracking-[0.3em] text-brand-gold-light">GET IN TOUCH</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight md:text-5xl">
            <span className="text-white">We&rsquo;re Here to </span>
            <span className="text-gold-gradient">Serve You</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            Have a question, need a quote, or ready to book your luxury ride? Contact Denver Black
            Limo LLC today. We&rsquo;re available 24/7 to assist you.
          </p>
        </motion.div>
      </section>

      {/* Contact info + map + form */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact information */}
          <div className="rounded-xl border border-brand-gold/25 bg-brand-surface p-6">
            <h2 className="text-sm font-bold tracking-[0.2em] text-brand-gold-light">
              CONTACT INFORMATION
            </h2>
            <div className="mt-6 space-y-6">
              <a href={telHref(biz.phone)} className="group flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light transition group-hover:bg-brand-gold/10">
                  <Phone className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-sm text-white/60">Phone</span>
                  <span className="block font-display text-xl text-white">{biz.phone}</span>
                  <span className="block text-xs text-brand-gold/80">24/7 Customer Support</span>
                </span>
              </a>
              <a href={mailHref(biz.email)} className="group flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light transition group-hover:bg-brand-gold/10">
                  <Mail className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-sm text-white/60">Email</span>
                  <span className="block break-all text-base text-white">{biz.email}</span>
                  <span className="block text-xs text-brand-gold/80">We reply within minutes</span>
                </span>
              </a>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-sm text-white/60">Office Location</span>
                  <span className="block text-base text-white">Denver, Colorado</span>
                  <span className="block text-xs text-brand-gold/80">Serving all major areas</span>
                </span>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                  <Clock className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-sm text-white/60">Business Hours</span>
                  <span className="block text-base text-white">24 Hours / 7 Days a Week</span>
                  <span className="block text-xs text-brand-gold/80">
                    Always available when you need us
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Map / coverage panel */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-surface">
            <div className="relative min-h-[260px] flex-1">
              <img
                src="/images/coverage-map.jpeg"
                alt="Denver Black Limo service coverage map — Front Range, Colorado"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  const step = t.dataset.step
                  if (!step) {
                    t.dataset.step = 'contact'
                    t.src = '/images/contact/map.jpeg'
                  } else if (step === 'contact') {
                    t.dataset.step = 'stock'
                    t.src =
                      'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1000&auto=format&fit=crop&q=80'
                  }
                }}
              />
            </div>
            <div className="flex items-start gap-3 border-t border-brand-gold/25 bg-brand-black/60 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                <Car className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-widest text-brand-gold-light">
                  WE COME TO YOU
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  Airport, Hotel, Home, Office, or Anywhere in Between.
                </p>
              </div>
            </div>
          </div>

          {/* Send us a message */}
          <div className="rounded-xl border border-brand-gold/25 bg-brand-surface p-6">
            <h2 className="text-center text-sm font-bold tracking-[0.2em] text-brand-gold-light">
              SEND US A MESSAGE
            </h2>
            {status === 'sent' ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="text-white/90">
                  Thank you — your message has been received. Our team will respond shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="Full Name"
                    aria-label="Full Name"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Phone Number"
                    aria-label="Phone Number"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  aria-label="Email Address"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                />
                <select
                  aria-label="Service Needed"
                  value={form.service}
                  onChange={(e) => setField('service', e.target.value)}
                  className={`${inputClass} ${form.service ? 'text-white' : 'text-white/50'}`}
                >
                  <option value="">Service Needed</option>
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s} className="text-brand-black">
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Pick-Up Location"
                  aria-label="Pick-Up Location"
                  value={form.pickup}
                  onChange={(e) => setField('pickup', e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Drop-Off Location"
                  aria-label="Drop-Off Location"
                  value={form.dropoff}
                  onChange={(e) => setField('dropoff', e.target.value)}
                  className={inputClass}
                />
                <textarea
                  rows={4}
                  placeholder="Additional Details / Message"
                  aria-label="Additional Details / Message"
                  value={form.message}
                  onChange={(e) => setField('message', e.target.value)}
                  className={inputClass}
                />
                {status === 'error' && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    Something went wrong. Please try again or call us at {biz.phone}.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient py-3 text-xs font-bold tracking-[0.2em] text-brand-black shadow-lg shadow-brand-gold/20 transition hover:brightness-110 disabled:opacity-70"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> SENDING…
                    </>
                  ) : (
                    <>
                      SEND MESSAGE <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-white/45">
                  <Lock className="h-3 w-3 text-brand-gold/70" /> Your information is secure and
                  confidential.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Trust row */}
      <section className="border-y border-brand-gold/15 bg-brand-charcoal">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
          {trustItems.map((t) => (
            <div key={t.title} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                <t.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-bold tracking-widest text-white">{t.title}</p>
              <p className="text-xs text-white/55">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs — light section to match the design */}
      <section className="bg-brand-cream py-14 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-brand-gold-dark">NEED HELP?</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-brand-black md:text-4xl">
              Frequently
              <br />
              Asked Questions
            </h2>
            <div className="mt-3 h-0.5 w-14 bg-brand-gold-dark" />
            <p className="mt-4 text-sm leading-relaxed text-brand-black/65">
              Find quick answers to common questions about our services, bookings, and more.
            </p>
            {faqs.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllFaqs((v) => !v)}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-black/25 px-5 py-2.5 text-xs font-bold tracking-widest text-brand-black transition hover:border-brand-gold-dark hover:text-brand-gold-dark"
              >
                {showAllFaqs ? 'SHOW FEWER FAQS' : 'VIEW ALL FAQS'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllFaqs ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {visibleFaqs.map((faq, i) => {
                const open = openFaq === i
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-lg border border-brand-black/10 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-brand-black transition hover:text-brand-gold-dark"
                    >
                      {faq.question}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-brand-gold-dark transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {open && (
                      <p className="border-t border-brand-black/5 px-5 py-4 text-sm leading-relaxed text-brand-black/70">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <CTABanner title="Book Your Luxury Transportation Today" />
    </>
  )
}
