import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, FileSignature, Loader2, Phone, XCircle } from 'lucide-react'
import { PHONE, PHONE_HREF } from '../constants'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * Where a price quote is accepted.
 *
 * One decision, one tap, above the fold. Everything else on the page exists
 * to answer the question a person asks before saying yes — is this the right
 * trip, and what am I paying for — because the alternative is that they close
 * the tab meaning to check later, and later never comes.
 */

interface Quote {
  reference: string
  name: string
  serviceType: string
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  vehicle: string
  passengers: string
  currency: string
  lineItems: { label: string; amount: number }[]
  total: number
  note: string | null
  validUntil: string | null
  status: 'Sent' | 'Accepted' | 'Declined'
  expired: boolean
  respondedAt: string | null
  agreementToken: string | null
  agreementSigned: boolean
}

/** The sign goes before the symbol: a discount reads "-$11.00". */
const money = (n: number, currency = 'USD') => {
  const v = Number(n || 0)
  return `${v < 0 ? '-' : ''}${currency === 'USD' ? '$' : `${currency} `}${Math.abs(v).toFixed(2)}`
}

function longDate(iso: string): string {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso || ''
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function clock12(hhmm: string): string {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/)
  if (!m) return hhmm || ''
  const h = Number(m[1])
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

export function QuoteAcceptPage() {
  const { token = '' } = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<{ status: string; agreementToken: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/quote/${encodeURIComponent(token)}`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'This quote link is not valid.')
        const json = (await res.json()) as Quote
        if (!cancelled) setQuote(json)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'This quote link is not valid.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline')
    setError('')
    try {
      const res = await fetch(`${API_URL}/quote/${encodeURIComponent(token)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept, reason: accept ? undefined : reason.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not record your answer.')
      setDone({ status: json.status, agreementToken: json.agreementToken })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record your answer.')
    } finally {
      setBusy(null)
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-20 pt-32 text-center md:px-6">
        <h1 className="font-display text-3xl text-white">Quote not available</h1>
        <p className="mt-4 text-white/70">{loadError}</p>
        <p className="mt-6 text-white/70">
          Please use the link in your email, or call us at{' '}
          <a href={PHONE_HREF} className="font-semibold text-brand-gold-light">{PHONE}</a>.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-brand-gold-light hover:underline">
          Back to the website
        </Link>
      </section>
    )
  }

  if (!quote) {
    return (
      <section className="mx-auto flex max-w-2xl items-center justify-center gap-3 px-4 pb-20 pt-40 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your quote…
      </section>
    )
  }

  const status = done?.status || quote.status
  const settled = status !== 'Sent'
  const accepted = status === 'Accepted'
  const agreementToken = done?.agreementToken ?? quote.agreementToken

  return (
    <>
      <section className="border-b border-brand-gold/15 bg-brand-black pb-10 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <p className="text-xs font-bold tracking-[0.3em] text-brand-gold-light">YOUR PRICE QUOTE</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-white md:text-4xl">
            {accepted ? 'Your trip is confirmed' : status === 'Declined' ? 'Quote declined' : `Hello ${(quote.name || '').split(' ')[0]}, here is your price`}
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {accepted
              ? 'Thank you. We have your acceptance on file and your chauffeur will be assigned.'
              : status === 'Declined'
                ? 'No problem at all. If your plans change, we would be glad to quote again.'
                : 'Check the details below, then accept and your reservation is confirmed.'}
          </p>
          <p className="mt-4 text-sm text-white/45">Reservation {quote.reference}</p>
        </div>
      </section>

      <section className="bg-brand-charcoal py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          {/* The price, and the decision, first. */}
          <div className="rounded-2xl border-2 border-brand-gold/50 bg-brand-surface/50 p-6 md:p-8">
            <ul className="space-y-3">
              {quote.lineItems.map((l, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 text-[15px]">
                  <span className="text-white/80">{l.label}</span>
                  <span className="shrink-0 font-medium text-white">{money(l.amount, quote.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-[0.2em] text-white/60">Total</span>
              <span className="font-display text-4xl text-brand-gold md:text-5xl">{money(quote.total, quote.currency)}</span>
            </div>

            {quote.validUntil && !settled && (
              <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/60">
                <Clock className="h-4 w-4 text-brand-gold-light" />
                This price is held until <span className="font-semibold text-white">{longDate(quote.validUntil)}</span>.
              </p>
            )}

            {quote.expired && !settled && (
              <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                This quote has passed its date. Call us and we will send a fresh price straight away.
              </p>
            )}

            {settled ? (
              <div className={`mt-6 rounded-xl border p-5 ${accepted ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/15 bg-white/5'}`}>
                <p className={`flex items-center gap-2 font-semibold ${accepted ? 'text-emerald-300' : 'text-white/70'}`}>
                  {accepted ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  {accepted ? 'Accepted — your reservation is confirmed' : 'You declined this quote'}
                </p>
              </div>
            ) : (
              <div className="mt-7">
                {error && <p className="mb-4 text-sm font-medium text-red-400">{error}</p>}
                <button
                  onClick={() => respond(true)}
                  disabled={busy !== null || quote.expired}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 py-5 text-sm font-bold uppercase tracking-[0.18em] text-brand-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Accept this quote
                </button>

                {!declining ? (
                  <button
                    onClick={() => setDeclining(true)}
                    className="mt-4 w-full text-center text-xs text-white/45 transition hover:text-white/70"
                  >
                    My plans have changed
                  </button>
                ) : (
                  <div className="mt-5 rounded-lg border border-white/10 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50">
                      Anything you would like us to know? (optional)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border border-white/15 bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-gold"
                      placeholder="Price, dates, or something else"
                    />
                    <div className="mt-3 flex gap-3">
                      <button onClick={() => setDeclining(false)} className="text-xs text-white/50 hover:text-white">
                        Never mind
                      </button>
                      <button
                        onClick={() => respond(false)}
                        disabled={busy !== null}
                        className="ml-auto rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:text-white disabled:opacity-40"
                      >
                        {busy === 'decline' ? 'Sending…' : 'Decline quote'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Signing follows acceptance, not the other way round. */}
          {accepted && agreementToken && !quote.agreementSigned && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border border-brand-gold/40 bg-brand-black p-6 text-center md:p-8"
            >
              <FileSignature className="mx-auto h-8 w-8 text-brand-gold-light" />
              <h2 className="mt-3 font-display text-2xl text-white">One last step</h2>
              <p className="mt-2 text-white/70">
                Please sign the reservation agreement. It takes about a minute and the signed copy is emailed to you.
              </p>
              <Link
                to={`/agreement/${agreementToken}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-black"
              >
                Read &amp; Sign the Agreement
              </Link>
            </motion.div>
          )}

          {quote.note && (
            <div className="mt-6 rounded-2xl border border-brand-gold/25 bg-brand-surface/40 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-light">A note from our team</p>
              <p className="mt-2 leading-relaxed text-white/75">{quote.note}</p>
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-brand-surface/40 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-light">The trip this covers</p>
              <dl className="mt-4 space-y-2.5 text-sm">
                {[
                  ['Service', quote.serviceType],
                  ['Date', longDate(quote.pickupDate)],
                  ['Time', quote.pickupTime ? clock12(quote.pickupTime) : ''],
                  ['Pick-up', quote.pickupLocation],
                  ['Drop-off', quote.dropoffLocation],
                  ['Vehicle', quote.vehicle],
                  ['Passengers', quote.passengers],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k as string} className="flex gap-3">
                      <dt className="w-24 shrink-0 text-white/45">{k}</dt>
                      <dd className="text-white/85">{v}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-white/10 bg-brand-surface/40 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-light">What's included</p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                A professional chauffeur, a clean and inspected vehicle, all taxes and standard fees, and flight tracking
                on airport trips. Gratuity is not included and is always your choice. Additional time, extra stops, tolls
                and parking are billed as used, as set out in our{' '}
                <Link to="/terms" className="font-semibold text-brand-gold-light underline-offset-4 hover:underline">
                  terms and conditions
                </Link>
                .
              </p>
              <a href={PHONE_HREF} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-gold-light">
                <Phone className="h-4 w-4" /> Questions? {PHONE}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
