import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Banknote, CalendarDays, CreditCard, FileText, Loader2, Mail,
  MapPin, Plus, Receipt, Save, Send, Trash2, User, Wallet,
} from 'lucide-react'

/**
 * The quote page, in the client's own layout.
 *
 * Laid out as a document rather than another dark admin panel: a white sheet
 * with black section bars and gold for the figures that matter, which is the
 * design he sent and also the right instinct. This is the one admin screen
 * whose numbers get read aloud to a customer on the telephone, and a price
 * list is easier to read off paper-white than off charcoal.
 *
 * The trip is restated at the top because he asked for the order details and
 * the price to be visible together — the office is pricing *this* journey,
 * and an airport run and a four-hour charter are priced differently.
 *
 * **The arithmetic is not done here.** Every change asks the server what the
 * quote comes to. A second copy of the rules in TypeScript would drift from
 * quoting.js, and the first anyone would know is a customer being emailed a
 * total the office never saw.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

type Charge = { kind: string; label: string; quantity: string; unitRate: string }

/** A quote already sent, as the history route returns it. */
interface SentQuote {
  id: string
  total: number
  note: string | null
  valid_until: string | null
  payment_link: string | null
  rate_type: string | null
  base_fare: number | null
  billed_hours: number | null
  hourly_rate: number | null
  discount: number | null
  charges: { kind?: string; label?: string; quantity?: number; unitRate?: number }[]
  status: string
  sent_at: string
}

/** One entry in the booking's payment ledger. */
interface Payment {
  id: string
  kind: string
  amount: number | string
  method: string | null
  reference: string | null
  received_at: string
  note: string | null
}

const PAYMENT_KINDS: { value: 'deposit' | 'balance' | 'full' | 'refund'; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'balance', label: 'Balance' },
  { value: 'full', label: 'Paid in full' },
  { value: 'refund', label: 'Refund' },
]

interface ChargeKind {
  kind: string
  label: string
  suggestedRate: number | null
}

interface Breakdown {
  baseFare: number
  charges: { kind: string; label: string; quantity: number; unitRate: number; amount: number }[]
  chargesTotal: number
  gratuityPercent: number
  gratuity: number
  cardFeePercent: number
  cardFee: number
  discount: number
  subtotal: number
  taxPercent: number
  tax: number
  total: number
  depositRequired: number
  amountPaid: number
  balanceDue: number
  billedHours: number
}

interface Booking {
  id: string
  reference?: string
  /** The last quote's total, so a balance can be seen before re-pricing. */
  quote_total?: number | null
  status?: string
  name: string
  email: string
  phone: string
  service_type: string
  pickup_date: string
  pickup_time: string
  pickup_location: string
  dropoff_location: string
  passengers?: string
  vehicle_preference?: string
  airline_name?: string
  flight_number?: string
  special_requests?: string
  internal_notes?: string
  payment_status?: string
  payment_method?: string
}

const PAYMENT_METHODS = [
  { id: 'payment_link', label: 'Payment Link', icon: CreditCard },
  { id: 'venmo', label: 'Venmo', icon: Wallet },
  { id: 'zelle', label: 'Zelle', icon: Wallet },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
]

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
const PAYMENT_STATUSES = [
  'Pending Quote', 'Quote Sent', 'Deposit Requested',
  // What a booking is between the deposit arriving and the balance being
  // settled. The server derives it from the payment ledger; 'Deposit Paid'
  // stays in the list only so bookings already carrying it still display.
  'Partially Paid', 'Deposit Paid',
  'Balance Due', 'Balance Payment Requested', 'Fully Paid',
]

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/* ── the pieces the client's layout is built from ───────────────────────── */

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof FileText
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
      <h3 className="flex items-center gap-2 bg-brand-black px-4 py-2.5 text-sm font-bold text-white">
        <Icon className="h-4 w-4 text-brand-gold" />
        {title}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Label on the left, control on the right — the client's row shape. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-1.5">
      <span className="w-full shrink-0 text-sm font-semibold text-neutral-700 sm:w-36">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function MoneyInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center rounded border border-neutral-300 bg-white focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold/40">
      <span className="pl-3 text-sm text-neutral-400">$</span>
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0.00"
        className="w-full bg-transparent px-2 py-2 text-sm font-medium text-neutral-900 outline-none disabled:bg-neutral-100"
      />
    </div>
  )
}

/** The gold-when-selected pill the client uses for every either/or choice. */
function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded px-4 py-2 text-sm font-semibold transition ${
        selected
          ? 'bg-brand-gold text-brand-black shadow-sm'
          : 'bg-white text-neutral-600 hover:bg-neutral-50'
      }`}
    >
      {children}
    </button>
  )
}

const selectClass =
  'w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/40'

/* ── the page ───────────────────────────────────────────────────────────── */

export function AdminQuotePage({
  bookingId,
  token,
  onBack,
}: {
  bookingId: string
  token: string | null
  onBack: () => void
}) {
  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const [booking, setBooking] = useState<Booking | null>(null)
  const [kinds, setKinds] = useState<ChargeKind[]>([])
  const [loadError, setLoadError] = useState('')

  const [bookingStatus, setBookingStatus] = useState('Confirmed')
  const [paymentStatus, setPaymentStatus] = useState('Pending Quote')
  const [rateType, setRateType] = useState<'flat' | 'hourly'>('flat')
  const [baseFare, setBaseFare] = useState('')
  const [hours, setHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [charges, setCharges] = useState<Charge[]>([])
  const [discount, setDiscount] = useState('')
  const [gratuityOverride, setGratuityOverride] = useState('')
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full')
  const [depositRequired, setDepositRequired] = useState('')
  /**
   * What the ledger says has been received — summed by the server, never
   * typed here. This used to be a free-text box that fed only the on-screen
   * preview: the office could enter "deposit received 150", watch the
   * balance fall, send the quote, and nothing was recorded anywhere. The
   * money moved and the system did not know.
   */
  const [payments, setPayments] = useState<Payment[]>([])
  const [paidTotal, setPaidTotal] = useState(0)
  const depositReceived = paidTotal ? String(paidTotal) : ''
  const [payAmount, setPayAmount] = useState('')
  const [payKind, setPayKind] = useState<'deposit' | 'balance' | 'full' | 'refund'>('deposit')
  const [payMethod, setPayMethod] = useState('payment_link')
  const [payReference, setPayReference] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('payment_link')
  const [paymentLink, setPaymentLink] = useState('')
  /*
   * Both of these are printed by the quote email and the customer's page,
   * and neither had anywhere to come from: the hold date never appeared on
   * a real quote, and "A note from our team" was a panel nothing could
   * fill.
   */
  const [validUntil, setValidUntil] = useState('')
  const [teamNote, setTeamNote] = useState('')
  const [balanceDueDate, setBalanceDueDate] = useState('')
  const [emailReceipt, setEmailReceipt] = useState(true)
  const [internalNotes, setInternalNotes] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  const [quote, setQuote] = useState<Breakdown | null>(null)
  const [pricing, setPricing] = useState(false)
  const [busy, setBusy] = useState<'save' | 'confirm' | 'send' | 'balance' | null>(null)
  const [done, setDone] = useState('')
  const [failed, setFailed] = useState('')

  // A card fee is the processor's cut. Cash and Zelle cost nothing to take,
  // so adding one would be indefensible on an invoice.
  const cardFeeApplies = paymentMethod === 'payment_link' || paymentMethod === 'credit_card'

  useEffect(() => {
    ;(async () => {
      try {
        const [b, k, sent] = await Promise.all([
          fetch(`${API_URL}/bookings/${bookingId}`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/quotes/charge-kinds`, { headers }).then((r) => r.json()),
          // Newest first. The whole sheet, not just the link: the page
          // used to open blank on a booking that had already been quoted,
          // so adjusting one figure or re-sending meant retyping the fare,
          // every optional charge and the discount from the email.
          fetch(`${API_URL}/bookings/${bookingId}/quotes`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ])

        const history: SentQuote[] = Array.isArray(sent) ? sent : []
        const last = history[0]
        // The link can outlive the quote it was sent with, so it is taken
        // from the most recent quote that has one rather than only the last.
        const linked = history.find((q) => q && q.payment_link)
        if (linked?.payment_link) setPaymentLink(linked.payment_link)

        if (last) {
          if (last.rate_type === 'hourly' || last.rate_type === 'flat') setRateType(last.rate_type)
          if (last.base_fare != null) setBaseFare(String(last.base_fare))
          if (last.billed_hours) setHours(String(last.billed_hours))
          if (last.hourly_rate) setHourlyRate(String(last.hourly_rate))
          if (last.discount) setDiscount(String(last.discount))
          if (Array.isArray(last.charges) && last.charges.length) {
            setCharges(
              last.charges.map((c) => ({
                kind: c.kind || 'other',
                label: c.label || '',
                quantity: String(c.quantity ?? 1),
                unitRate: String(c.unitRate ?? 0),
              }))
            )
          }
          if (last.valid_until) setValidUntil(last.valid_until)
          if (last.note) setTeamNote(last.note)
        }
        await loadPayments()
        setBooking(b)
        setKinds(k.kinds || [])
        setCustomerNotes(b.special_requests || '')
        setInternalNotes(b.internal_notes || '')
        if (b.status) setBookingStatus(b.status)
        if (b.payment_status) setPaymentStatus(b.payment_status)
        if (b.payment_method) setPaymentMethod(b.payment_method)
        // The terms already agreed with this customer. Sending a quote
        // writes all three unconditionally, so a blank form here does not
        // merely forget the deposit — re-opening the page to change a price
        // would clear the $150 the office already asked for.
        if (b.payment_option === 'deposit' || b.payment_option === 'full') setPaymentOption(b.payment_option)
        if (b.deposit_required != null) setDepositRequired(String(b.deposit_required))
        // Already 'YYYY-MM-DD' from the API, which is what a date input
        // wants; a serialized timestamp would be rejected outright.
        if (b.balance_due_date) setBalanceDueDate(b.balance_due_date)
      } catch {
        setLoadError('Could not load this booking.')
      }
    })()
  }, [bookingId, headers])

  /** The ledger, which is the only thing that decides what has been paid. */
  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/payments`, { headers })
      if (!res.ok) return
      const j = await res.json()
      setPayments(Array.isArray(j.payments) ? j.payments : [])
      setPaidTotal(Number(j.paid) || 0)
    } catch {
      /* The sheet is still usable without it; the office sees no payments. */
    }
  }, [bookingId, headers])

  const recordPayment = async () => {
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount === 0) {
      setPayError('Enter the amount received.')
      return
    }
    setPayBusy(true)
    setPayError('')
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: payKind === 'refund' ? -Math.abs(amount) : Math.abs(amount),
          kind: payKind,
          method: payMethod,
          reference: payReference.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Could not record that payment.')
      // The server derives the status from the ledger, so take its word for
      // it rather than working it out again here and risking two answers.
      if (j.paymentStatus) setPaymentStatus(j.paymentStatus)
      setPayAmount('')
      setPayReference('')
      await loadPayments()
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Could not record that payment.')
    } finally {
      setPayBusy(false)
    }
  }

  const timer = useRef<number | undefined>(undefined)
  const priceIt = useCallback(async () => {
    setPricing(true)
    try {
      const res = await fetch(`${API_URL}/quotes/preview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rateType, baseFare, hours, hourlyRate,
          charges: charges.map((c) => ({
            kind: c.kind,
            label: c.label,
            quantity: Number(c.quantity) || 0,
            unitRate: Number(c.unitRate) || 0,
          })),
          discount, gratuityOverride, cardFeeApplies,
          paymentOption, depositRequired,
          amountPaid: depositReceived,
        }),
      })
      if (res.ok) setQuote(await res.json())
    } finally {
      setPricing(false)
    }
  }, [
    headers, rateType, baseFare, hours, hourlyRate, charges, discount,
    gratuityOverride, cardFeeApplies, paymentOption, depositRequired, depositReceived,
  ])

  useEffect(() => {
    // Debounced, so typing "240" prices once rather than three times.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(priceIt, 280)
    return () => window.clearTimeout(timer.current)
  }, [priceIt])

  /** Everything the office has typed, in the shape the server expects. */
  const payload = () => ({
    rateType, baseFare, hours, hourlyRate,
    charges: charges.map((c) => ({
      kind: c.kind,
      label: c.label,
      quantity: Number(c.quantity) || 0,
      unitRate: Number(c.unitRate) || 0,
    })),
    discount, gratuityOverride, cardFeeApplies,
    paymentOption, depositRequired, balanceDueDate,
    paymentMethod, paymentLink, validUntil,
    note: teamNote,
    status: bookingStatus,
    paymentStatus,
    internalNotes, customerNotes,
  })

  const run = async (
    which: 'save' | 'confirm' | 'send' | 'balance',
    url: string,
    method: 'POST' | 'PATCH',
    success: string
  ) => {
    setBusy(which)
    setDone('')
    setFailed('')
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload()) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'That did not work.')
      setDone(success)
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy(null)
    }
  }

  const addCharge = (k: ChargeKind) =>
    setCharges((cs) => [
      ...cs,
      {
        kind: k.kind,
        label: k.label,
        quantity: '1',
        unitRate: k.suggestedRate != null ? String(k.suggestedRate) : '',
      },
    ])

  const setCharge = (i: number, patch: Partial<Charge>) =>
    setCharges((cs) => cs.map((c, n) => (n === i ? { ...c, ...patch } : c)))

  if (loadError) return <p className="p-6 text-sm text-white/60">{loadError}</p>
  if (!booking) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading&hellip;
      </p>
    )
  }

  const ready = (quote?.total ?? 0) > 0
  const remaining = (quote?.total ?? 0) - (quote?.amountPaid ?? 0)
  /*
   * What is actually still owed on the booking as saved, as opposed to the
   * preview the office may be mid-way through editing. The quote sheet opens
   * with an empty fare, so a figure derived from the preview is zero on load
   * and the balance action would never appear on the one booking that needs
   * it.
   */
  const outstanding = Math.max(0, Number((((booking?.quote_total ?? 0) - paidTotal)).toFixed(2)))

  return (
    <div className="mx-auto min-w-0 max-w-3xl pb-10">
      {/* ── masthead ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-brand-black px-4 py-3">
        <button
          onClick={onBack}
          className="rounded border border-white/15 p-1.5 text-white/60 transition hover:border-brand-gold/50 hover:text-brand-gold"
          title="Back to the booking"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-lg leading-tight tracking-wide text-white">
            DENVER BLACK LIMO
          </p>
          <p className="text-[11px] tracking-[0.2em] text-brand-gold">BOOKING &amp; PAYMENT</p>
        </div>
        <span className="shrink-0 rounded border border-brand-gold px-2.5 py-1 font-mono text-xs text-brand-gold">
          {booking.reference}
        </span>
      </div>

      <div className="space-y-4">
        {/* ── the trip ───────────────────────────────────────────────── */}
        <Card title="The Trip" icon={MapPin}>
          <div className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            <p className="flex items-start gap-2 text-neutral-800">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                <b className="font-semibold">{booking.name}</b>
                <span className="block text-xs text-neutral-500">
                  {booking.email} &middot; {booking.phone}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-2 text-neutral-800">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                <b className="font-semibold">
                  {booking.pickup_date} at {booking.pickup_time}
                </b>
                <span className="block text-xs text-neutral-500">
                  {booking.service_type}
                  {booking.passengers ? ` · ${booking.passengers} passenger(s)` : ''}
                  {booking.vehicle_preference ? ` · ${booking.vehicle_preference}` : ''}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-2 text-neutral-800 sm:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <span>
                {booking.pickup_location} &rarr; {booking.dropoff_location}
                {booking.flight_number && (
                  <span className="block text-xs text-neutral-500">
                    {booking.airline_name} {booking.flight_number}
                  </span>
                )}
              </span>
            </p>
          </div>
        </Card>

        {/* ── booking & payment ──────────────────────────────────────── */}
        <Card title="Booking &amp; Payment" icon={FileText}>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Field label="Booking Status">
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
                className={selectClass}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment Status">
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={selectClass}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="w-full shrink-0 text-sm font-semibold text-neutral-700 sm:w-36">
              Payment Method
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition ${
                      paymentMethod === m.id
                        ? 'border-brand-gold bg-brand-gold text-brand-black'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {/* ── charges & fees ─────────────────────────────────────────── */}
        <Card title="Charges &amp; Fees" icon={Receipt}>
          <Field label="Rate Type">
            <div className="flex max-w-sm gap-1 rounded border border-neutral-300 bg-neutral-100 p-1">
              <Choice selected={rateType === 'flat'} onClick={() => setRateType('flat')}>
                Flat Rate
              </Choice>
              <Choice selected={rateType === 'hourly'} onClick={() => setRateType('hourly')}>
                Hourly
              </Choice>
            </div>
          </Field>

          {rateType === 'flat' ? (
            <Field label="Base Fare">
              <MoneyInput value={baseFare} onChange={setBaseFare} />
            </Field>
          ) : (
            <>
              <Field label="Hours">
                <input
                  inputMode="decimal"
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  className={selectClass}
                />
              </Field>
              <Field label="Hourly Rate">
                <MoneyInput value={hourlyRate} onChange={setHourlyRate} />
              </Field>
            </>
          )}

          {/* optional charges */}
          <div className="mt-4 rounded border border-neutral-300 p-3">
            <p className="mb-2 text-sm font-semibold text-neutral-700">Optional Charges</p>

            {charges.length > 0 && (
              <div className="mb-3 space-y-2">
                {charges.map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-2 rounded border border-neutral-200 bg-neutral-50 p-2"
                  >
                    <span className="min-w-[6rem] flex-1 text-sm font-medium text-neutral-800">
                      {c.label}
                    </span>
                    <label className="w-16">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                        Qty
                      </span>
                      <input
                        inputMode="decimal"
                        value={c.quantity}
                        onChange={(e) =>
                          setCharge(i, { quantity: e.target.value.replace(/[^0-9.]/g, '') })
                        }
                        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-brand-gold"
                      />
                    </label>
                    <label className="w-24">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                        Unit rate
                      </span>
                      <MoneyInput
                        value={c.unitRate}
                        onChange={(v) => setCharge(i, { unitRate: v })}
                      />
                    </label>
                    <span className="w-20 pb-2 text-right font-mono text-sm font-semibold text-neutral-900">
                      {usd((Number(c.quantity) || 0) * (Number(c.unitRate) || 0))}
                    </span>
                    <button
                      onClick={() => setCharges((cs) => cs.filter((_, n) => n !== i))}
                      className="mb-1 rounded border border-neutral-300 p-1.5 text-neutral-400 transition hover:border-red-400 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {kinds.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => addCharge(k)}
                  className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-brand-gold hover:text-brand-gold-dark"
                >
                  <Plus className="h-3 w-3" />
                  {k.label}
                  {k.suggestedRate != null && (
                    <span className="text-neutral-400">${k.suggestedRate}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              Add only when applicable &middot; each line shows its quantity and unit rate
            </p>
          </div>

          <div className="mt-3">
            <Field label="Discount">
              <MoneyInput value={discount} onChange={setDiscount} />
            </Field>
          </div>

          {/* Gratuity and the service charge sit here, immediately above the
              total, because that is where they are worked out: gratuity on
              the fare plus the extras above, and the card fee on top of that.
              Printed under the Base Fare they read as a percentage of the
              fare alone, which is not what the customer is charged. */}
          <Field label={`Gratuity (${quote?.gratuityPercent ?? 20}%)`}>
            <MoneyInput
              value={gratuityOverride !== '' ? gratuityOverride : String(quote?.gratuity ?? '')}
              onChange={setGratuityOverride}
            />
          </Field>

          <Field label="Service Charge">
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700">
                {usd(quote?.cardFee ?? 0)}
              </span>
              <span className="text-xs text-neutral-500">
                {cardFeeApplies ? `${quote?.cardFeePercent ?? 0}% card processing` : 'not charged'}
              </span>
            </div>
          </Field>

          {/* ── the summary table ────────────────────────────────────── */}
          <div className="mt-4 overflow-hidden rounded border border-neutral-300">
            <SumRow label="Subtotal" value={quote?.subtotal ?? 0} />
            <SumRow
              label={`Tax${(quote?.taxPercent ?? 0) > 0 ? ` (${quote?.taxPercent}%)` : ' (if applicable)'}`}
              value={quote?.tax ?? 0}
            />
            <SumRow label="TOTAL" value={quote?.total ?? 0} emphasis />
            <SumRow label="Amount Paid" value={quote?.amountPaid ?? 0} />
            <SumRow label="BALANCE DUE" value={quote?.balanceDue ?? 0} emphasis />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
            {pricing && <Loader2 className="h-3 w-3 animate-spin" />}
            Optional fees appear only when added
          </p>
        </Card>

        {/* ── deposit & balance ──────────────────────────────────────── */}
        <Card title="Deposit &amp; Balance" icon={Wallet}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Field label="Payment Option">
                <div className="flex max-w-sm gap-1 rounded border border-neutral-300 bg-neutral-100 p-1">
                  <Choice selected={paymentOption === 'full'} onClick={() => setPaymentOption('full')}>
                    Pay in Full
                  </Choice>
                  <Choice
                    selected={paymentOption === 'deposit'}
                    onClick={() => setPaymentOption('deposit')}
                  >
                    Deposit
                  </Choice>
                </div>
              </Field>

              {paymentOption === 'deposit' && (
                <>
                  <Field label="Deposit Required">
                    <MoneyInput value={depositRequired} onChange={setDepositRequired} />
                  </Field>
                  <Field label="Received So Far">
                    <span className="block rounded border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700">
                      {usd(paidTotal)}
                    </span>
                  </Field>
                  <Field label="Balance Due Date">
                    <input
                      type="date"
                      value={balanceDueDate}
                      onChange={(e) => setBalanceDueDate(e.target.value)}
                      className={selectClass}
                    />
                  </Field>
                </>
              )}
            </div>

            {paymentOption === 'deposit' && (
              <div className="flex min-w-[11rem] flex-col items-center justify-center rounded border border-brand-gold bg-brand-cream px-5 py-4">
                <p className="text-xs font-semibold text-neutral-600">Remaining Balance</p>
                <p className="mt-1 font-mono text-2xl font-bold text-brand-black">
                  {usd(remaining > 0 ? remaining : 0)}
                </p>
              </div>
            )}
          </div>

          {/*
            * The ledger. Every payment is its own row rather than a running
            * total on the booking, because an argument about money turns on
            * when it arrived and how, not just how much — and the status is
            * derived from these rows by the server, so the two can never
            * disagree.
            */}
          <div className="mt-4 rounded border border-neutral-300">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-700">Payments Received</h3>
              <span className="text-sm font-semibold text-neutral-900">{usd(paidTotal)} recorded</span>
            </div>

            {payments.length > 0 && (
              <ul className="divide-y divide-neutral-200">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2 text-sm">
                    <span className="text-neutral-700">
                      <span className="font-medium capitalize text-neutral-900">{p.kind}</span>
                      {p.method ? ` · ${p.method.replace(/_/g, ' ')}` : ''}
                      {p.reference ? ` · ${p.reference}` : ''}
                      {' · '}
                      <span className="text-xs text-neutral-500">
                        {String(p.received_at || '').slice(0, 10)}
                      </span>
                    </span>
                    <span className="tabular-nums font-medium text-neutral-900">{usd(Number(p.amount))}</span>
                  </li>
                ))}
              </ul>
            )}

            {/*
              * A grid, not a flex row. Fixed widths beside a flex-1 field
              * left the reference box 26px wide on a phone — the office
              * runs this from one, and a Square receipt number will not go
              * in 26 pixels. Two columns on a phone, four on a desktop.
              */}
            <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Amount</label>
                <MoneyInput value={payAmount} onChange={setPayAmount} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Kind</label>
                <select value={payKind} onChange={(e) => setPayKind(e.target.value as typeof payKind)} className={selectClass}>
                  {PAYMENT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={selectClass}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Reference</label>
                <input
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Square receipt…"
                  className={selectClass}
                />
              </div>
              <button
                type="button"
                onClick={recordPayment}
                disabled={payBusy}
                className="col-span-2 rounded bg-brand-black px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-gold-light transition hover:brightness-125 disabled:opacity-40 sm:col-span-4"
              >
                {payBusy ? 'Saving…' : 'Record this payment'}
              </button>
            </div>

            {payError && <p className="px-4 pb-3 text-sm font-medium text-red-600">{payError}</p>}
          </div>

          <label className="mt-3 flex items-start gap-2.5 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={emailReceipt}
              onChange={(e) => setEmailReceipt(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#c9a227]"
            />
            <span>
              Email deposit receipt &amp; remaining balance to customer
              <span className="mt-0.5 block text-[11px] italic text-neutral-400">
                Mark deposit received only after payment is verified.
              </span>
            </span>
          </label>

          <div className="mt-3">
            <label className="block text-sm font-semibold text-neutral-700">
              Payment link for the customer
            </label>
            <div className="mt-1 flex items-center rounded border border-neutral-300 bg-white focus-within:border-brand-gold">
              <CreditCard className="ml-3 h-4 w-4 shrink-0 text-neutral-400" />
              <input
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://square.link/..."
                className="w-full bg-transparent px-2 py-2 text-sm text-neutral-900 outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Paste the link the customer should pay through. It is included in the quote email.
              {paymentOption === 'deposit' && depositRequired
                ? ' If the link takes a fixed amount, make sure it matches what you are asking for.'
                : ''}
            </p>
          </div>

          {/* Both of these print on the customer's quote. Neither had a
              field, so the hold date never appeared and the note panel in
              the email was unreachable. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-neutral-700">Hold this price until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={`${selectClass} mt-1`}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Printed on the quote as a deadline. Leave empty for no date.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700">Note from our team</label>
              <textarea
                value={teamNote}
                onChange={(e) => setTeamNote(e.target.value)}
                rows={2}
                placeholder="e.g. Your chauffeur will meet you at baggage claim with a name board."
                className={`${selectClass} mt-1 resize-y`}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Shown to the customer in its own panel on the quote email.
              </p>
            </div>
          </div>
        </Card>

        {/* ── notes ──────────────────────────────────────────────────── */}
        <div className="grid gap-4 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Internal Notes (admin only)
            </span>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g., driver instructions, office notes, etc."
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-gold"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Customer Notes</span>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g., pickup details, special requests, etc."
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-gold"
            />
          </label>
        </div>

        {/* ── actions, in the client's stacked shape ─────────────────── */}
        <div className="space-y-2.5">
          <Action
            icon={Save}
            title="Save Changes"
            subtitle="Save edits in admin. Nothing is sent to the customer."
            tone="gold"
            busy={busy === 'save'}
            disabled={busy !== null}
            onClick={() =>
              run('save', `${API_URL}/bookings/${bookingId}/payment`, 'PATCH', 'Changes saved.')
            }
          />
          <Action
            icon={Mail}
            title="Send Updated Confirmation"
            subtitle="Send changes for an existing booking."
            tone="outline"
            busy={busy === 'confirm'}
            disabled={busy !== null}
            onClick={() =>
              run(
                'confirm',
                `${API_URL}/bookings/${bookingId}/confirmation`,
                'POST',
                'Updated confirmation sent to the customer.'
              )
            }
          />
          <Action
            icon={Send}
            title="Send Quote to Customer"
            subtitle={`Email the price${ready ? ` of ${usd(quote?.total ?? 0)}` : ''}, terms and payment link.`}
            tone="black"
            busy={busy === 'send'}
            // The only one that needs a price: the other two are about the
            // booking, this one is the price itself.
            disabled={!ready || busy !== null}
            onClick={() =>
              run('send', `${API_URL}/bookings/${bookingId}/quote`, 'POST', 'Quote sent to the customer.')
            }
          />

          {/*
            * Only offered once there is something to chase: a total, money
            * received, and a gap between them. Hidden otherwise rather than
            * disabled, because an office that has not taken a deposit has no
            * balance to ask for and the button would only raise a question.
            */}
          {paidTotal > 0 && outstanding > 0 && (
            <Action
              icon={Send}
              title="Request the Remaining Balance"
              subtitle={`Email ${usd(outstanding)} still owed, with the payment link.`}
              tone="outline"
              busy={busy === 'balance'}
              disabled={busy !== null}
              onClick={() =>
                run(
                  'balance',
                  `${API_URL}/bookings/${bookingId}/balance-request`,
                  'POST',
                  'Balance request sent to the customer.'
                )
              }
            />
          )}

          {(done || failed) && (
            <p
              className={`rounded border px-4 py-2.5 text-sm font-medium ${
                failed
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              {failed || done}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SumRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-neutral-200 px-3 py-2 last:border-b-0 ${
        emphasis ? 'bg-brand-gold/25' : 'bg-white'
      }`}
    >
      <span
        className={
          emphasis
            ? 'text-sm font-bold tracking-wide text-brand-black'
            : 'text-sm text-neutral-600'
        }
      >
        {label}
      </span>
      <span
        className={`font-mono ${
          emphasis ? 'text-base font-bold text-brand-black' : 'text-sm text-neutral-800'
        }`}
      >
        {usd(value)}
      </span>
    </div>
  )
}

function Action({
  icon: Icon,
  title,
  subtitle,
  tone,
  disabled,
  busy,
  onClick,
}: {
  icon: typeof Save
  title: string
  subtitle: string
  tone: 'gold' | 'outline' | 'black'
  disabled?: boolean
  busy?: boolean
  onClick?: () => void
}) {
  const tones = {
    gold: 'bg-brand-gold text-brand-black hover:bg-brand-gold-light border-brand-gold',
    outline: 'bg-white text-neutral-800 hover:bg-neutral-50 border-neutral-300',
    black: 'bg-brand-black text-white hover:bg-neutral-800 border-brand-black',
  }[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-lg border px-5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${tones}`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-5 w-5 shrink-0" />
      )}
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs opacity-70">{subtitle}</span>
      </span>
    </button>
  )
}
