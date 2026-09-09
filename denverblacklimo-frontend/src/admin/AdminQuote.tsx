import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { estimateTrip } from '../lib/estimate'

/**
 * Composing a price quote and sending it to the customer.
 *
 * The pricing engine suggests a price and fills in the lines; the office
 * decides what actually goes out. That order matters — a rate card cannot see
 * a wedding running late, a regular worth keeping, or a competitor's number,
 * so the suggestion is a starting point and never the last word.
 *
 * The total is always the sum of the visible lines. A quote whose total does
 * not match its own lines is the one thing that would cost trust outright.
 */

export interface QuoteTarget {
  id: string
  reference: string
  customer: string
  email: string | null
  serviceType: string
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  vehicle: string
  passengers: string
  estimateShown?: number | null
  quoteStatus?: string | null
  quoteTotal?: number | null
}

export interface LineItem {
  label: string
  amount: string
}

const FIELD =
  'w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold'
const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80'

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function QuoteModal({
  target,
  busy,
  error,
  onClose,
  onSend,
}: {
  target: QuoteTarget
  busy: boolean
  error: string
  onClose: () => void
  onSend: (payload: {
    lineItems: { label: string; amount: number }[]
    note: string
    validUntil: string
    suggestedTotal: number | null
  }) => void
}) {
  const [items, setItems] = useState<LineItem[]>([{ label: 'Chauffeured transportation', amount: '' }])
  const [note, setNote] = useState('')
  const [validUntil, setValidUntil] = useState(addDays(3))
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState<{ total: number; lines: { label: string; amount: number }[] } | null>(null)
  const [suggestError, setSuggestError] = useState('')

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const valid = items.some((i) => i.label.trim() && Number(i.amount) > 0) && total > 0

  /**
   * Asks the pricing engine what this trip should cost. The addresses are
   * stored as text, so they are geocoded first — the same lookup the booking
   * form uses. Any failure here is silent by design: the office can always
   * type the price, and a broken suggestion must never block a quote.
   */
  const suggest = useCallback(async () => {
    setSuggesting(true)
    setSuggestError('')
    const result = await estimateTrip({
      serviceType: target.serviceType,
      vehicleName: target.vehicle,
      pickup: target.pickupLocation,
      dropoff: target.dropoffLocation,
      date: target.pickupDate,
      time: target.pickupTime,
    })
    if (!result) {
      setSuggestError('Could not price this trip automatically. Enter the price yourself.')
    } else if (!result.quotable) {
      setSuggestError(
        result.reason === 'not_configured'
          ? 'The rate card is not complete yet, so there is no suggestion.'
          : 'This trip is outside what the rate card prices automatically. Enter the price yourself.'
      )
    } else {
      setSuggestion({ total: result.total || 0, lines: result.lines || [] })
    }
    setSuggesting(false)
  }, [target])

  // Offered as soon as the panel opens: the office should not have to ask.
  useEffect(() => {
    suggest()
  }, [suggest])

  const useSuggestion = () => {
    if (!suggestion) return
    if (!suggestion.lines.length) {
      setItems([{ label: 'Chauffeured transportation', amount: String(suggestion.total) }])
      return
    }
    // The engine rounds its total to the nearest $5, so its own lines can add
    // up to a slightly different figure. The office would otherwise see a
    // suggestion of $85 and a total of $85.50. The remainder goes onto the
    // last line — which is the discount in every priced result — so the lines
    // and the total agree before anyone edits them.
    const lines = suggestion.lines.map((l) => ({ ...l }))
    const summed = lines.reduce((sum, l) => sum + l.amount, 0)
    const remainder = Math.round((suggestion.total - summed) * 100) / 100
    if (remainder !== 0) {
      const last = lines[lines.length - 1]
      last.amount = Math.round((last.amount + remainder) * 100) / 100
    }
    setItems(lines.map((l) => ({ label: l.label, amount: String(l.amount) })))
  }

  const setItem = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <div>
            <h2 className="font-display text-lg text-brand-gold">Send price quote</h2>
            <p className="mt-0.5 text-xs text-white/50">
              {target.reference} &middot; {target.customer} &middot; {target.email || 'no email on file'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-lg border border-white/10 bg-brand-black/40 p-4 text-sm text-white/70">
            <p className="text-white/90">{target.serviceType}</p>
            <p className="mt-1 text-xs">
              {target.pickupLocation} &rarr; {target.dropoffLocation}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {target.pickupDate}
              {target.pickupTime ? ` · ${target.pickupTime}` : ''} &middot; {target.vehicle || 'vehicle not set'} &middot;{' '}
              {target.passengers || '—'} passengers
            </p>
            {target.estimateShown != null && (
              <p className="mt-2 border-t border-white/10 pt-2 text-xs text-amber-300">
                The customer was shown {money(target.estimateShown)} on the website when they booked.
              </p>
            )}
          </div>

          {/* The engine's opinion, offered but never imposed. */}
          <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-gold-light">
                <Sparkles className="h-4 w-4" /> Suggested price
              </p>
              {suggesting ? (
                <span className="flex items-center gap-2 text-xs text-white/50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> calculating…
                </span>
              ) : suggestion ? (
                <span className="font-display text-2xl text-brand-gold">{money(suggestion.total)}</span>
              ) : null}
            </div>
            {suggestion && !suggesting && (
              <button
                type="button"
                onClick={useSuggestion}
                className="mt-3 rounded-full border border-brand-gold/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-gold-light transition hover:bg-brand-gold/15"
              >
                Use these figures
              </button>
            )}
            {suggestError && <p className="mt-2 text-xs text-white/50">{suggestError}</p>}
          </div>

          <div>
            <span className={LABEL}>What the customer is paying for</span>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item.label}
                    onChange={(e) => setItem(i, { label: e.target.value })}
                    placeholder="Description"
                    className={`${FIELD} flex-1`}
                  />
                  <input
                    value={item.amount}
                    onChange={(e) => setItem(i, { amount: e.target.value })}
                    placeholder="0.00"
                    inputMode="decimal"
                    className={`${FIELD} w-32 text-right`}
                  />
                  <button
                    type="button"
                    onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                    disabled={items.length === 1}
                    aria-label="Remove line"
                    className="rounded border border-white/10 px-3 text-white/40 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { label: '', amount: '' }])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-gold-light hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add a line
            </button>
            <p className="mt-2 text-xs text-white/40">
              A negative amount makes a discount, for example &ldquo;Repeat customer discount&rdquo; at -25.
            </p>

            <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="text-sm uppercase tracking-widest text-white/60">Total</span>
              <span className="font-display text-3xl text-brand-gold">{money(total)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Hold this price until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={FIELD} />
              <p className="mt-1.5 text-xs text-white/40">A deadline gets an answer sooner.</p>
            </div>
            <div>
              <label className={LABEL}>Note to the customer</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className={`${FIELD} resize-none`}
                placeholder="Anything worth saying alongside the price."
              />
            </div>
          </div>

          {!target.email && (
            <p className="text-sm font-medium text-amber-400">
              This booking has no email address, so the quote cannot be sent. Add one first.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() =>
                onSend({
                  lineItems: items
                    .filter((i) => i.label.trim() && i.amount !== '')
                    .map((i) => ({ label: i.label.trim(), amount: Number(i.amount) })),
                  note: note.trim(),
                  validUntil,
                  suggestedTotal: suggestion ? suggestion.total : null,
                })
              }
              disabled={!valid || busy || !target.email}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send quote &middot; {money(total)}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
