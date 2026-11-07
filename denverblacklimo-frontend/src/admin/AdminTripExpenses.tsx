import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Receipt, Trash2 } from 'lucide-react'
import { ConfirmDialog } from './AdminUI'

/**
 * What the chauffeur paid out on this trip.
 *
 * The agreement allows tolls and parking to be charged on, so this is the
 * office's prompt to put them on the invoice — and the driver's record of what
 * they are owed back. Both halves matter: an expense nobody sees is money the
 * company loses twice.
 *
 * The per-row amounts arrive as node-pg strings ("13.50"), so every one of
 * them is coerced before it is shown or compared. The total is already a
 * number: the API does that conversion, because getting it wrong there would
 * concatenate rather than add.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface TripExpense {
  id: string
  kind: string
  amount: string | number
  note: string | null
  driver_name: string | null
  incurred_at: string
  recorded_at: string
  photo_id: string | null
}

const KIND_LABELS: Record<string, string> = {
  toll: 'Toll',
  parking: 'Parking',
  fuel: 'Fuel',
  cleaning: 'Cleaning',
  other: 'Other',
}

const money = (v: string | number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function AdminTripExpenses({
  bookingId,
  token,
  onToast,
}: {
  bookingId: string
  token: string | null
  onToast?: (text: string, kind: 'ok' | 'err') => void
}) {
  const [expenses, setExpenses] = useState<TripExpense[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<TripExpense | null>(null)
  const [deleting, setDeleting] = useState(false)

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/expenses`, { headers })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExpenses(data.expenses ?? [])
      setTotal(money(data.total))
    } catch {
      setError('Could not load the expenses.')
    }
  }, [bookingId, headers])

  useEffect(() => {
    load()
  }, [load])

  const remove = async () => {
    if (!confirming) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/expenses/${confirming.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error()
      // Re-read rather than subtract locally: the server owns the total, and
      // two places computing it is how they drift.
      await load()
      onToast?.('Expense removed.', 'ok')
    } catch {
      onToast?.('Could not remove that expense.', 'err')
    } finally {
      setDeleting(false)
      setConfirming(null)
    }
  }

  if (error) return <p className="text-sm text-white/40">{error}</p>
  if (!expenses) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses&hellip;
      </p>
    )
  }
  // Silent on the many trips that cost nothing, so the panel stays scannable.
  if (!expenses.length) return null

  return (
    <div className="min-w-0 space-y-3">
      <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-gold">
        <Receipt className="h-4 w-4" /> PAID BY THE CHAUFFEUR
      </h4>

      <div className="overflow-hidden rounded border border-white/5 bg-brand-surface">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="flex items-start gap-3 border-b border-white/5 p-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {KIND_LABELS[e.kind] || e.kind}
                {e.note && <span className="font-normal text-white/50"> &middot; {e.note}</span>}
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                {fmtDate(e.incurred_at)}
                {e.driver_name ? ` · ${e.driver_name}` : ''}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm text-white">
              ${money(e.amount).toFixed(2)}
            </p>
            <button
              type="button"
              onClick={() => setConfirming(e)}
              className="shrink-0 rounded border border-white/10 p-1.5 text-white/30 transition hover:border-red-500/40 hover:text-red-300"
              title="Remove this expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2.5">
          <p className="text-xs font-bold tracking-wide text-white/70">
            TO ADD TO THE INVOICE
          </p>
          <p className="font-mono text-sm font-bold text-emerald-300">${total.toFixed(2)}</p>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirming}
        title="Remove this expense?"
        message={
          <>
            {confirming && (
              <>
                {KIND_LABELS[confirming.kind] || confirming.kind} of{' '}
                <b>${money(confirming.amount).toFixed(2)}</b>
                {confirming.driver_name ? `, recorded by ${confirming.driver_name}` : ''}. This is
                money the chauffeur paid out, so removing it also removes what they are owed.
              </>
            )}
          </>
        }
        confirmLabel="Remove"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}
