import { motion } from 'framer-motion'
import { type FormEvent, useState } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { PageHero } from '../components/ui'
import { ADDRESS, EMAIL, EMAIL_HREF, FACEBOOK_URL, PHONE, PHONE_HREF } from '../constants'

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    console.log('Contact form:', data)
    setSubmitted(true)
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We're Here 24/7"
        subtitle="Reach our team for reservations, quotes, corporate accounts, and special event planning."
        image="/images/hero1.jpg"
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <motion.a
              href={PHONE_HREF}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">PHONE</p>
                <p className="font-display text-2xl text-white">{PHONE}</p>
                <p className="text-sm text-white/60">Click to call — 24/7 support</p>
              </div>
            </motion.a>
            <motion.a
              href={EMAIL_HREF}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">EMAIL</p>
                <p className="text-lg text-white">{EMAIL}</p>
              </div>
            </motion.a>
            <motion.a
              href={FACEBOOK_URL}
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">FACEBOOK</p>
                <p className="text-lg text-white">Denver Black Limo LLC</p>
              </div>
            </motion.a>
            <motion.div
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">SERVICE AREA</p>
                <p className="text-white/80">{ADDRESS}</p>
              </div>
            </motion.div>
            <motion.div
              className="flex items-start gap-4 border border-brand-gold/25 bg-brand-surface p-5 transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/10 hover:shadow-lg hover:shadow-brand-gold/25"
              whileHover={{ scale: 1.02 }}
            >
              <svg className="mt-1 h-5 w-5 text-brand-gold-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <div>
                <p className="text-xs tracking-widest text-brand-gold/80">SERVICE HOURS</p>
                <p className="text-white/80">Available 24 hours a day, 7 days a week</p>
                <p className="text-sm text-white/60">Reservations accepted 24/7</p>
              </div>
            </motion.div>
            <div className="flex aspect-video items-center justify-center border border-dashed border-brand-gold/30 bg-brand-surface text-sm text-white/45">
              Map embed placeholder — Google Maps integration ready
            </div>
          </div>

          <div className="border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <h2 className="font-display text-2xl text-brand-gold-light">Send a Message</h2>
            {submitted ? (
              <p className="mt-6 text-white/80">
                Thank you — your message has been received. Our team will respond shortly.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Phone" name="phone" type="tel" required />
                <div>
                  <label className="text-xs tracking-widest text-brand-gold/80">Message</label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="mt-2 w-full border border-white/10 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gold-gradient py-3 text-xs font-bold tracking-[0.2em] text-brand-black"
                >
                  SEND MESSAGE
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
