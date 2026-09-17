import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Loader2, Mail, Phone, Send, Trash2, X } from 'lucide-react'
import type { Affiliate } from './AdminAffiliates'

/**
 * Handing one reservation to a partner company.
 *
 * Only active affiliates are offered, because a company we have stopped working
 * with must keep the trips it already ran but never be given a new one. If the
 * trip is currently assigned to a company that has since been deactivated, that
 * assignment is still shown — it happened, and hiding it would leave the office
 * thinking the trip was unassigned.
 *
 * Emailing the farmout sheet is a choice, not a consequence. Sometimes the
 * office has already agreed the job on the phone and only needs it recorded.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AffiliateTarget {
  id: string
  reference: string
  customer: string
  pickup: string
  affiliateId: string | null
  affiliateCompany: string | null
  affiliateEmail: string | null
  affiliatePhone: string | null
  affiliateActive: boolean | null
  notifiedAt: string | null
}

export function AssignAffiliateModal({
  target,
  token,
  busy,
  error,
  onClose,
  onAssign,
}: {
  target: AffiliateTarget
  token: string | null
  busy: boolean
  error: string
  onClose: () => void
  onAssign: (payload: { affiliateId: string | null; notify: boolean }) => void
}) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>(target.affiliateId ?? '')
  const [notify, setNotify] = useState(false)

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  useEffect(() => {
    let cancelled = false
    // No ?all=1: the picker offers active companies only.
    fetch(`${API_URL}/affiliates`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!cancelled) setAffiliates(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [headers])

  const chosen = affiliates.find((a) => a.id === selected) ?? null
  const changed = (selected || null) !== (target.affiliateId ?? null)

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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg text-brand-gold">
              <Building2 className="h-5 w-5" /> Assign affiliate
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              {target.reference} &middot; {target.customer} &middot; {target.pickup}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* The company currently carrying this trip, including one that has
              since been deactivated — it still ran the job. */}
          {target.affiliateCompany && (
            <div className="rounded-lg border border-white/10 bg-brand-black/40 p-4">
              <p className="text-xs uppercase tracking-widest text-white/40">Currently assigned</p>
              <p className="mt-1 font-medium text-white">{target.affiliateCompany}</p>
              <p className="mt-0.5 text-xs text-white/50">
                {target.affiliateEmail}
                {target.affiliatePhone ? ` · ${target.affiliatePhone}` : ''}
              </p>
              {target.affiliateActive === false && (
                <p className="mt-2 text-xs text-amber-300">
                  This company is now inactive. The assignment stands, but choosing a different one
                  cannot be undone by picking them again.
                </p>
              )}
              {target.notifiedAt && (
                <p className="mt-1 text-xs text-emerald-300">
                  Farmout sheet sent {new Date(target.notifiedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80">
              Partner company
            </label>
            {loading ? (
              <p className="flex items-center gap-2 py-3 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading affiliates&hellip;
              </p>
            ) : !affiliates.length ? (
              <p className="rounded border border-white/10 bg-brand-black/40 p-4 text-sm text-white/60">
                No active affiliates yet. Add one in the Affiliates tab first.
              </p>
            ) : (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold"
              >
                <option value="" className="bg-brand-black text-white">
                  — No affiliate —
                </option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id} className="bg-brand-black text-white">
                    {a.companyName}
                  </option>
                ))}
              </select>
            )}
            {chosen && (
              <div className="mt-3 space-y-1 rounded border border-white/10 bg-brand-black/40 p-3 text-xs text-white/60">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-brand-gold/60" /> {chosen.email}
                </p>
                {chosen.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-brand-gold/60" /> {chosen.phone}
                  </p>
                )}
                {chosen.contactName && <p className="text-white/45">Contact: {chosen.contactName}</p>}
                {chosen.notes && <p className="whitespace-pre-wrap text-white/45">{chosen.notes}</p>}
              </div>
            )}
          </div>

          {selected && (
            <label className="flex items-start gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-gold"
              />
              <span>
                Email the farmout sheet to {chosen?.companyName || 'this affiliate'}
                <span className="mt-0.5 block text-xs text-white/40">
                  The trip, the passenger and the routing &mdash; not what the customer is paying.
                </span>
              </span>
            </label>
          )}

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {target.affiliateId && (
              <button
                onClick={() => onAssign({ affiliateId: null, notify: false })}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded border border-red-500/30 px-5 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-40 sm:mr-auto"
              >
                <Trash2 className="h-4 w-4" /> Remove affiliate
              </button>
            )}
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => onAssign({ affiliateId: selected || null, notify })}
              disabled={busy || (!changed && !notify)}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : notify ? <Send className="h-4 w-4" /> : null}
              {notify ? 'Assign and send' : 'Assign'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
