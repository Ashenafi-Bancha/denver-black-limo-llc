import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Copy, Loader2, Search, Trash2, X } from 'lucide-react'

/** Toast messages so status changes and saves confirm themselves instead of failing silently. */
export type Toast = { id: number; text: string; kind: 'ok' | 'err' }

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-2xl backdrop-blur ${
              t.kind === 'ok'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                : 'border-red-500/40 bg-red-500/15 text-red-100'
            }`}
          >
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/50 transition hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Search field used by both the Bookings and Inbox lists. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-brand-black py-2.5 pl-9 pr-9 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-brand-gold/50"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/** Filter chip with a live count, so an admin can see how much work sits behind each status. */
export function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-brand-gold/60 bg-brand-gold/15 text-brand-gold-light'
          : 'border-white/10 bg-brand-black text-white/60 hover:border-white/25 hover:text-white'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-brand-gold/25' : 'bg-white/10'}`}>{count}</span>
    </button>
  )
}

/** Click-to-copy for phone numbers, emails and booking references. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
        } catch {
          /* clipboard blocked — nothing useful to show */
        }
      }}
      title={label ? `Copy ${label}` : 'Copy'}
      aria-label={label ? `Copy ${label}` : 'Copy'}
      className="rounded p-1 text-white/35 transition hover:bg-white/10 hover:text-brand-gold"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  onClick,
}: {
  label: string
  value: number | string
  hint?: string
  icon: React.ReactNode
  tone?: 'default' | 'gold' | 'alert'
  onClick?: () => void
}) {
  const tones = {
    default: 'border-white/10',
    gold: 'border-brand-gold/40',
    alert: 'border-amber-500/50',
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-xl border bg-brand-surface p-5 text-left shadow-lg shadow-black/20 transition ${tones[tone]} ${
        onClick ? 'hover:border-brand-gold/60 hover:bg-white/[0.04]' : ''
      }`}
    >
      <div className="rounded-lg bg-brand-black/60 p-2.5 text-brand-gold">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
        <p className="mt-1 font-display text-3xl leading-none text-white">{value}</p>
        {hint && <p className="mt-1.5 text-xs text-white/45">{hint}</p>}
      </div>
    </Wrapper>
  )
}

export function EmptyState({ icon, text, hint }: { icon?: React.ReactNode; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-brand-surface p-12 text-center text-white/50">
      {icon && <div className="mb-4 text-white/20">{icon}</div>}
      <p>{text}</p>
      {hint && <p className="mt-1 text-sm text-white/35">{hint}</p>}
    </div>
  )
}

/**
 * Centred confirmation card.
 *
 * Deleting a booking or a message cannot be undone, so it always goes through here
 * rather than firing straight from the row button.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-brand-surface p-6 text-center shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl text-white">{title}</h2>
            <div className="mt-2 text-sm leading-relaxed text-white/65">{message}</div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-red-500/90 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {busy ? 'Deleting…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Centred result card shown after a save or delete finishes. */
export function ResultDialog({
  result,
  onClose,
}: {
  result: { ok: boolean; title: string; message?: string } | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!result) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Successes close themselves; failures stay until dismissed so the reason is read.
    const timer = result.ok ? setTimeout(onClose, 2600) : undefined
    return () => {
      document.removeEventListener('keydown', onKey)
      if (timer) clearTimeout(timer)
    }
  }, [result, onClose])

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border p-6 text-center shadow-2xl ${
              result.ok ? 'border-emerald-500/40 bg-brand-surface' : 'border-red-500/40 bg-brand-surface'
            }`}
          >
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${
                result.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-300'
              }`}
            >
              {result.ok ? <Check className="h-7 w-7" /> : <X className="h-7 w-7" />}
            </div>
            <h2 className="mt-4 font-display text-xl text-white">{result.title}</h2>
            {result.message && <p className="mt-2 text-sm leading-relaxed text-white/65">{result.message}</p>}
            <button
              onClick={onClose}
              className="mt-6 rounded-lg border border-white/15 px-6 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
