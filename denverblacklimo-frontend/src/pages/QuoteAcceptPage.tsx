import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  Loader2,
  Phone,
  Plane,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { PHONE, PHONE_HREF } from '../constants'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * Where a price quote is accepted.
 *
 * A white document on cream, the same sheet the office works from, because
 * this is the page a customer may forward to whoever is paying, or print for
 * an expense claim — and the dark site chrome it used to wear made a
 * reservation look like marketing.
 *
 * One decision, one tap. Everything else answers the question a person asks
 * before saying yes — is this the right trip, and what am I paying for —
 * because the alternative is that they close the tab meaning to check later,
 * and later never comes.
 */

interface ChargeItem {
  kind?: string
  label: string
  quantity?: number | null
  unitRate?: number | null
  amount: number
}

interface Charges {
  rateType: string | null
  baseFare: number | null
  billedHours: number | null
  hourlyRate: number | null
  items: ChargeItem[]
  extras: number | null
  discount: number | null
  gratuityPercent: number | null
  gratuity: number | null
  cardFeePercent: number | null
  cardFee: number | null
  subtotal: number | null
  taxPercent: number | null
  tax: number | null
}

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
  tripType: string | null
  returnDate: string | null
  returnTime: string | null
  returnPickupLocation: string | null
  airlineName: string | null
  flightNumber: string | null
  airportDirection: string | null
  currency: string
  lineItems: { label: string; amount: number }[]
  charges: Charges | null
  total: number
  note: string | null
  specialRequests: string | null
  validUntil: string | null
  status: 'Sent' | 'Accepted' | 'Declined'
  expired: boolean
  respondedAt: string | null
  paymentLink: string | null
  depositRequired: number | null
  paymentOption: string
  agreementToken: string | null
  agreementSigned: boolean
}

/** The sign goes before the symbol: a discount reads "-$11.00". */
const money = (n: number, currency = 'USD') => {
  const v = Number(n || 0)
  return `${v < 0 ? '-' : ''}${currency === 'USD' ? '$' : `${currency} `}${Math.abs(v).toFixed(2)}`
}

/** A percentage with no trailing zeros: 3.5%, 20%. */
const pct = (n: number | null) =>
  n === null || n === undefined ? '' : `${Number(n).toFixed(3).replace(/\.?0+$/, '')}%`

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

/** A black bar with gold type — the section heading from the client's sheet. */
function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-brand-black px-4 py-2.5 md:px-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-gold-light">{children}</h2>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-28 shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 font-medium text-neutral-900">{value}</dd>
    </div>
  )
}

/** One charge line. `meta` is the working — "2 × $20.00" — not a second label. */
function Charge({
  label,
  meta,
  amount,
  currency,
  strong,
}: {
  label: string
  meta?: string
  amount: number
  currency: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-200 py-2.5 last:border-0">
      <div className="min-w-0">
        <span className={strong ? 'font-semibold text-neutral-900' : 'text-neutral-700'}>{label}</span>
        {meta && <span className="ml-2 text-xs text-neutral-500">{meta}</span>}
      </div>
      <span className={`shrink-0 tabular-nums ${strong ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>
        {money(amount, currency)}
      </span>
    </div>
  )
}

const STEPS = ['Review', 'Accept', 'Payment']

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 md:gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const now = n === current
        return (
          <li key={label} className="flex min-w-0 items-center gap-2 md:gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? 'bg-brand-gold text-brand-black'
                  : now
                    ? 'bg-brand-black text-brand-gold-light ring-2 ring-brand-gold/50'
                    : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span
              className={`truncate text-[11px] font-semibold uppercase tracking-[0.14em] ${
                now ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              {label}
            </span>
            {n < STEPS.length && <span className="hidden h-px w-6 bg-neutral-300 sm:block md:w-10" />}
          </li>
        )
      })}
    </ol>
  )
}

export function QuoteAcceptPage() {
  const { token = '' } = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [terms, setTerms] = useState(false)
  const [option, setOption] = useState<'full' | 'deposit'>('full')
  const [done, setDone] = useState<{
    status: string
    agreementToken: string | null
    paymentLink: string | null
    dueNow: number | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/quote/${encodeURIComponent(token)}`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'This quote link is not valid.')
        const json = (await res.json()) as Quote
        if (!cancelled) {
          setQuote(json)
          // The office may already have decided this is a deposit booking.
          if (json.paymentOption === 'deposit') setOption('deposit')
        }
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
        body: JSON.stringify({
          accept,
          paymentOption: accept ? option : undefined,
          reason: accept ? undefined : reason.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not record your answer.')
      setDone({
        status: json.status,
        agreementToken: json.agreementToken ?? null,
        paymentLink: json.paymentLink ?? null,
        dueNow: json.dueNow ?? null,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record your answer.')
    } finally {
      setBusy(null)
    }
  }

  if (loadError) {
    return (
      <section className="min-h-[60vh] bg-brand-cream px-4 pb-20 pt-32 text-center md:px-6">
        <h1 className="font-display text-3xl text-neutral-900">Quote not available</h1>
        <p className="mx-auto mt-4 max-w-md text-neutral-600">{loadError}</p>
        <p className="mx-auto mt-6 max-w-md text-neutral-600">
          Please use the link in your email, or call us at{' '}
          <a href={PHONE_HREF} className="font-semibold text-brand-gold-dark">{PHONE}</a>.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-brand-gold-dark hover:underline">
          Back to the website
        </Link>
      </section>
    )
  }

  if (!quote) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center gap-3 bg-brand-cream px-4 text-neutral-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your quote…
      </section>
    )
  }

  const status = done?.status || quote.status
  const settled = status !== 'Sent'
  const accepted = status === 'Accepted'
  const agreementToken = done?.agreementToken ?? quote.agreementToken
  const paymentLink = done?.paymentLink ?? quote.paymentLink
  const c = quote.charges

  // The structured sheet when there is one, the old {label, amount} list
  // otherwise: quotes sent before 019 have no base fare, and they must still
  // show the figures the customer was actually given.
  const structured = Boolean(c && (c.baseFare !== null || (c.items && c.items.length)))

  const deposit = quote.depositRequired
  const depositOffered = deposit !== null && deposit > 0 && deposit < quote.total
  const dueNow = done?.dueNow ?? (option === 'deposit' && depositOffered ? deposit! : quote.total)
  const remaining = Math.max(0, Number((quote.total - dueNow).toFixed(2)))

  // Ticking the terms box is what moves them from reading to deciding, so the
  // stepper reports something true rather than decorating the page.
  const step = accepted ? 3 : terms ? 2 : 1
  const roundTrip = String(quote.tripType || '').toLowerCase().includes('round')

  return (
    <div className="bg-brand-cream pb-16 pt-24 md:pt-28">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* ── the letterhead ──────────────────────────────────────────── */}
        <header className="rounded-t-lg border border-b-0 border-neutral-300 bg-white px-5 py-6 md:px-8 md:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-brand-gold-dark">
                Denver Black Limo
              </p>
              <h1 className="mt-2 font-display text-3xl leading-tight text-neutral-900 md:text-4xl">
                {accepted
                  ? 'Your quote is accepted'
                  : status === 'Declined'
                    ? 'Quote declined'
                    : 'Review & Accept Your Quote'}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {accepted
                  ? agreementToken && !quote.agreementSigned
                    ? 'Thank you. Two steps are left — sign the agreement, then pay.'
                    : 'Thank you. One step is left — the payment below.'
                  : status === 'Declined'
                    ? 'No problem at all. If your plans change, we would be glad to quote again.'
                    : `Hello ${(quote.name || '').split(' ')[0]}, here is the price for your trip.`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Reservation</p>
              <p className="font-mono text-sm font-semibold text-neutral-900">{quote.reference}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <Stepper current={step} />
          </div>
        </header>

        {/* ── passenger & routing ─────────────────────────────────────── */}
        <section className="border border-b-0 border-neutral-300 bg-white">
          <Bar>Passenger &amp; Routing Information</Bar>
          <div className="grid gap-x-8 px-5 py-4 text-sm md:grid-cols-2 md:px-8">
            <dl>
              <Row label="Passenger" value={quote.name} />
              <Row label="Service" value={quote.serviceType} />
              <Row label="Passengers" value={quote.passengers} />
              <Row label="Vehicle" value={quote.vehicle} />
            </dl>
            <dl>
              <Row label="Date" value={longDate(quote.pickupDate)} />
              <Row label="Pick-up time" value={quote.pickupTime ? clock12(quote.pickupTime) : ''} />
              <Row label="Pick-up" value={quote.pickupLocation} />
              <Row label="Drop-off" value={quote.dropoffLocation} />
            </dl>
          </div>

          {(roundTrip || quote.flightNumber) && (
            <div className="border-t border-neutral-200 px-5 py-4 md:px-8">
              {quote.flightNumber && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                  <Plane className="h-4 w-4 shrink-0 text-brand-gold-dark" />
                  <span className="font-medium text-neutral-900">
                    {[quote.airlineName, quote.flightNumber].filter(Boolean).join(' ')}
                  </span>
                  {quote.airportDirection && (
                    /* Stored as the office typed it — "Arrival" from the
                       admin form, "arrival" from the website — so matched
                       loosely, the way the server's own isArrival does. An
                       exact comparison labelled every arrival a departure. */
                    <span className="text-neutral-500">
                      ({/arriv/i.test(quote.airportDirection) ? 'arriving in Denver' : 'departing Denver'})
                    </span>
                  )}
                </p>
              )}
              {roundTrip && (
                <dl className="mt-2 text-sm">
                  <Row label="Return" value={quote.returnDate ? longDate(quote.returnDate) : 'To be confirmed'} />
                  <Row label="Return time" value={quote.returnTime ? clock12(quote.returnTime) : ''} />
                  <Row label="Return from" value={quote.returnPickupLocation} />
                </dl>
              )}
              {/* The booking stores wall-clock text with no zone, so a reader
                  in another zone has to be told which clock it is. */}
              <p className="mt-3 text-xs text-neutral-500">All times are Denver local.</p>
            </div>
          )}

          {quote.specialRequests && (
            <div className="border-t border-neutral-200 px-5 py-4 md:px-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Your requests</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{quote.specialRequests}</p>
            </div>
          )}
        </section>

        {/* ── charges & fees ──────────────────────────────────────────── */}
        <section className="border border-b-0 border-neutral-300 bg-white">
          <Bar>Charges &amp; Fees</Bar>
          <div className="px-5 py-4 md:px-8">
            {structured && c ? (
              <>
                {c.rateType === 'hourly' && c.hourlyRate !== null ? (
                  <Charge
                    label="Hourly Charter"
                    meta={`${c.billedHours ?? 0} hrs × ${money(c.hourlyRate, quote.currency)}`}
                    amount={c.baseFare ?? 0}
                    currency={quote.currency}
                  />
                ) : (
                  <Charge label="Base Fare" amount={c.baseFare ?? 0} currency={quote.currency} />
                )}

                {(c.items || []).map((it, i) => (
                  <Charge
                    key={i}
                    label={it.label}
                    meta={
                      it.quantity && it.unitRate
                        ? `${it.quantity} × ${money(it.unitRate, quote.currency)}`
                        : undefined
                    }
                    amount={Number(it.amount || 0)}
                    currency={quote.currency}
                  />
                ))}

                {c.discount ? (
                  <Charge label="Discount" amount={-Math.abs(c.discount)} currency={quote.currency} />
                ) : null}

                {/* Gratuity and the service charge print here, immediately
                    above the total, because this is where they are worked
                    out: gratuity on the fare plus the extras above, and the
                    card fee on top of that. Shown under the base fare they
                    read as a percentage of the fare alone, which is not what
                    the customer is being charged. */}
                {c.gratuity !== null && (
                  <Charge
                    label="Gratuity"
                    meta={c.gratuityPercent ? pct(c.gratuityPercent) : undefined}
                    amount={c.gratuity}
                    currency={quote.currency}
                  />
                )}
                {c.cardFee ? (
                  <Charge
                    label="Service Charge"
                    meta={c.cardFeePercent ? `${pct(c.cardFeePercent)} card processing` : undefined}
                    amount={c.cardFee}
                    currency={quote.currency}
                  />
                ) : null}

                {/* Subtotal only earns its line when tax follows it.
                    Without tax it is the total again, one row higher. */}
                {c.tax ? (
                  <>
                    <Charge label="Subtotal" amount={c.subtotal ?? 0} currency={quote.currency} />
                    <Charge
                      label="Tax"
                      meta={c.taxPercent ? pct(c.taxPercent) : undefined}
                      amount={c.tax}
                      currency={quote.currency}
                    />
                  </>
                ) : null}
              </>
            ) : (
              quote.lineItems.map((l, i) => (
                <Charge key={i} label={l.label} amount={Number(l.amount || 0)} currency={quote.currency} />
              ))
            )}
          </div>

          <div className="flex items-baseline justify-between gap-4 border-t-2 border-brand-black bg-neutral-50 px-5 py-4 md:px-8">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">Total Balance</span>
            <span className="font-display text-3xl text-neutral-900 md:text-4xl">
              {money(quote.total, quote.currency)}
            </span>
          </div>

          {quote.validUntil && !settled && (
            <p className="flex items-center gap-2 border-t border-neutral-200 px-5 py-3 text-xs text-neutral-600 md:px-8">
              <Clock className="h-3.5 w-3.5 shrink-0 text-brand-gold-dark" />
              This price is held until{' '}
              <span className="font-semibold text-neutral-900">{longDate(quote.validUntil)}</span>.
            </p>
          )}
        </section>

        {quote.note && (
          <section className="border border-b-0 border-neutral-300 bg-white">
            <Bar>A Note From Our Team</Bar>
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-neutral-700 md:px-8">{quote.note}</p>
          </section>
        )}

        {/* ── the decision ────────────────────────────────────────────── */}
        <section className="rounded-b-lg border border-neutral-300 bg-white">
          {settled ? (
            accepted ? (
              <>
                {/*
                  * Signing comes before the money, matching the order the
                  * quote email sets out: the agreement is what confirms the
                  * reservation and states what may be charged, so asking for
                  * payment against terms nobody has agreed to is backwards.
                  * It disappears once signed rather than nagging.
                  */}
                {agreementToken && !quote.agreementSigned && (
                  <>
                    <Bar>Step 2 — Sign your agreement</Bar>
                    <div className="px-5 py-5 md:px-8 md:py-6">
                      <p className="flex items-center gap-2 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" /> Quote accepted
                      </p>
                      <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-neutral-700">
                        <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold-dark" />
                        This is what confirms the booking. It takes about a minute, and the signed copy is emailed
                        to you.
                      </p>
                      <Link
                        to={`/agreement/${agreementToken}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-black px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-brand-gold-light transition hover:brightness-125"
                      >
                        Read &amp; Sign the Agreement
                      </Link>
                    </div>
                  </>
                )}

                <Bar>{agreementToken && !quote.agreementSigned ? 'Step 3 — Payment' : 'Payment'}</Bar>
                <div className="px-5 py-5 md:px-8 md:py-6">
                  {!(agreementToken && !quote.agreementSigned) && (
                    <p className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" /> Quote accepted
                    </p>
                  )}

                  <div className="mt-4 rounded border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-neutral-600">Due now</span>
                      <span className="font-display text-2xl text-neutral-900">{money(dueNow, quote.currency)}</span>
                    </div>
                    {remaining > 0 && (
                      <div className="mt-1.5 flex items-baseline justify-between gap-4 text-sm">
                        <span className="text-neutral-500">Balance due later</span>
                        <span className="tabular-nums text-neutral-700">{money(remaining, quote.currency)}</span>
                      </div>
                    )}
                  </div>

                  {paymentLink ? (
                    <>
                      <a
                        href={paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-black px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-brand-gold-light transition hover:brightness-125"
                      >
                        <CreditCard className="h-4 w-4" /> Pay {money(dueNow, quote.currency)} Now
                      </a>
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                        <ShieldCheck className="h-3.5 w-3.5" /> Secure card checkout through Square.
                      </p>
                    </>
                  ) : (
                    /* No link pasted in yet. Saying so beats a button that
                       goes nowhere. */
                    <p className="mt-5 rounded border border-brand-gold/40 bg-brand-gold/5 p-4 text-sm text-neutral-700">
                      We will email you a secure payment link shortly. Nothing further is needed from you right now.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="px-5 py-6 md:px-8">
                <p className="flex items-center gap-2 font-semibold text-neutral-600">
                  <XCircle className="h-5 w-5" /> You declined this quote
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  If anything changes, call us at{' '}
                  <a href={PHONE_HREF} className="font-semibold text-brand-gold-dark">{PHONE}</a> and we will quote
                  again.
                </p>
              </div>
            )
          ) : (
            <>
              <Bar>Payment Choices</Bar>
              <div className="px-5 py-5 md:px-8 md:py-6">
                {depositOffered ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: 'full' as const, title: 'Pay in Full', amount: quote.total, sub: 'Nothing left to pay.' },
                      {
                        key: 'deposit' as const,
                        title: 'Pay Deposit',
                        amount: deposit!,
                        sub: `${money(quote.total - deposit!, quote.currency)} due before the trip.`,
                      },
                    ].map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setOption(o.key)}
                        aria-pressed={option === o.key}
                        className={`rounded border p-4 text-left transition ${
                          option === o.key
                            ? 'border-brand-gold bg-brand-gold/8 ring-1 ring-brand-gold'
                            : 'border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-neutral-900">{o.title}</span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              option === o.key ? 'border-brand-gold bg-brand-gold' : 'border-neutral-400'
                            }`}
                          >
                            {option === o.key && <Check className="h-2.5 w-2.5 text-brand-black" />}
                          </span>
                        </span>
                        <span className="mt-1 block font-display text-2xl text-neutral-900">
                          {money(o.amount, quote.currency)}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-500">{o.sub}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between gap-4 rounded border border-neutral-200 bg-neutral-50 p-4">
                    <span className="text-sm font-semibold text-neutral-900">Pay in Full</span>
                    <span className="font-display text-2xl text-neutral-900">{money(quote.total, quote.currency)}</span>
                  </div>
                )}

                {quote.expired && (
                  <p className="mt-4 rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
                    This quote has passed its date. Call us and we will send a fresh price straight away.
                  </p>
                )}

                <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-gold-dark"
                  />
                  <span>
                    I accept the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="font-semibold text-brand-gold-dark underline-offset-4 hover:underline"
                    >
                      Booking Terms &amp; Cancellation Policy
                    </Link>
                    .
                  </span>
                </label>

                {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

                <button
                  onClick={() => respond(true)}
                  disabled={busy !== null || quote.expired || !terms}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-black px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-brand-gold-light transition hover:brightness-125 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                >
                  {busy === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Accept Quote &amp; Continue to Payment
                  {busy !== 'accept' && <ArrowRight className="h-4 w-4" />}
                </button>

                {/* Only when there is a Square link to send them to. On a
                    cash or Zelle booking the office has pasted none, and
                    promising a card checkout that never appears is worse
                    than saying nothing. */}
                {paymentLink && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Secure card checkout through Square.
                  </p>
                )}
                {/* Said here, before the tap, because the office confirms
                    payment by hand — accepting only reserves the price. */}
                <p className="mt-2 text-center text-xs text-neutral-400">
                  Quote acceptance does not confirm payment.
                </p>

                {!declining ? (
                  <button
                    onClick={() => setDeclining(true)}
                    className="mt-5 w-full text-center text-xs text-neutral-400 transition hover:text-neutral-700"
                  >
                    My plans have changed
                  </button>
                ) : (
                  <div className="mt-5 rounded border border-neutral-200 p-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                      Anything you would like us to know? (optional)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-gold-dark"
                      placeholder="Price, dates, or something else"
                    />
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => setDeclining(false)}
                        className="text-xs text-neutral-500 hover:text-neutral-900"
                      >
                        Never mind
                      </button>
                      <button
                        onClick={() => respond(false)}
                        disabled={busy !== null}
                        className="ml-auto rounded-full border border-neutral-300 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-900 disabled:opacity-40"
                      >
                        {busy === 'decline' ? 'Sending…' : 'Decline quote'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="max-w-md text-neutral-600">
            {/* Read off the sheet, not asserted. The charges above bill a
                gratuity line, and a footnote calling it optional contradicts
                the figure being accepted — which is where a dispute starts. */}
            {c && c.gratuity ? (
              <>
                The {c.gratuityPercent ? pct(c.gratuityPercent) : ''} gratuity is already included in the total above, so
                nothing further is expected on the day.{' '}
              </>
            ) : (
              <>Gratuity is not included and is always your choice. </>
            )}
            Additional time, extra stops, tolls and parking are billed as used, as set out in our{' '}
            <Link to="/terms" className="font-semibold text-brand-gold-dark underline-offset-4 hover:underline">
              terms
            </Link>
            .
          </p>
          <a href={PHONE_HREF} className="inline-flex items-center gap-2 font-semibold text-brand-gold-dark">
            <Phone className="h-4 w-4" /> {PHONE}
          </a>
        </div>
      </div>
    </div>
  )
}
