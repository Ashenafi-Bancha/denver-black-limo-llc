import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Copy, KeyRound, Loader2, LogOut, Smartphone, X } from 'lucide-react'

/**
 * Giving a chauffeur access to the driver app, and taking it away.
 *
 * The password is shown exactly once, at the moment it is created, because it
 * is stored only as a hash — there is nothing to look up later. The office
 * reads it to the driver or sends it on, and if it is lost the answer is
 * another new one, never a recovery.
 *
 * Signing out every device is here rather than buried elsewhere, because the
 * moment the office needs it — a phone left in a car, a driver who has stopped
 * working — is the same moment they are looking at that driver.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AccessTarget {
  id: string
  name: string
  email: string
  hasPassword: boolean
  lastLoginAt: string | null
  devices: number
}

export function DriverAccessModal({
  target,
  token,
  onClose,
  onResult,
  onChanged,
}: {
  target: AccessTarget
  token: string | null
  onClose: () => void
  onResult: (text: string, kind: 'ok' | 'err') => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [issued, setIssued] = useState<string | null>(null)
  const [signedOut, setSignedOut] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const setPassword = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/drivers/${target.id}/password`, {
        method: 'POST',
        headers,
        body: JSON.stringify(useCustom && custom ? { password: custom } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not set this password.')
        return
      }
      setIssued(data.password)
      setSignedOut(data.signedOutDevices ?? 0)
      onChanged()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const signOutEverywhere = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/drivers/${target.id}/sessions`, { method: 'DELETE', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not sign this driver out.')
        return
      }
      onResult(
        data.signedOutDevices
          ? `${target.name} signed out of ${data.signedOutDevices} device${data.signedOutDevices === 1 ? '' : 's'}.`
          : `${target.name} was not signed in anywhere.`,
        'ok'
      )
      onChanged()
      onClose()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-title"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.2 }}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-brand-surface shadow-2xl sm:rounded-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <div className="min-w-0">
            <h2 id="access-title" className="flex items-center gap-2 font-display text-lg text-brand-gold">
              <Smartphone className="h-5 w-5" /> Driver app access
            </h2>
            <p className="mt-0.5 truncate text-xs text-white/50">
              {target.name} &middot; {target.email}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* The password, shown once. After this dialog closes it is gone. */}
          {issued ? (
            <>
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                  Password created
                </p>
                <div className="mt-3 flex items-center gap-2 rounded border border-white/15 bg-brand-black px-3 py-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-lg tracking-wide text-white">{issued}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(issued)
                        .then(() => {
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        })
                        .catch(() => {})
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded border border-white/15 px-3 py-2 text-xs text-white/70 transition hover:text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Write this down or send it now &mdash; it is stored only as a scrambled value and
                    cannot be shown again. If it is lost, create another one.
                  </span>
                </p>
                {Boolean(signedOut) && (
                  <p className="mt-2 text-xs text-white/50">
                    {signedOut} device{signedOut === 1 ? '' : 's'} signed out by this change.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-brand-black/40 p-4 text-xs leading-relaxed text-white/60">
                <p className="mb-1 font-semibold text-white/80">What to tell {target.name.split(' ')[0]}</p>
                <p>
                  Open the driver app, sign in with <b className="text-white/80">{target.email}</b> and this
                  password, then change it from the app.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded bg-gold-gradient px-4 py-3 text-sm font-bold uppercase tracking-widest text-brand-black"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-white/10 bg-brand-black/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/70">App access</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                      target.hasPassword
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/20 bg-white/5 text-white/50'
                    }`}
                  >
                    {target.hasPassword ? 'Can sign in' : 'No password yet'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/45">
                  {target.lastLoginAt
                    ? `Last signed in ${new Date(target.lastLoginAt).toLocaleString()}`
                    : target.hasPassword
                      ? 'Has never signed in.'
                      : 'Create a password so this driver can use the app.'}
                </p>
                {target.devices > 0 && (
                  <p className="mt-1 text-xs text-white/45">
                    Signed in on {target.devices} device{target.devices === 1 ? '' : 's'}.
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                    className="h-4 w-4 accent-brand-gold"
                  />
                  Choose the password myself
                </label>
                {useCustom && (
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="At least 8 characters"
                    className="mt-3 w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold"
                  />
                )}
                {!useCustom && (
                  <p className="mt-2 text-xs text-white/40">
                    A strong password is generated, avoiding characters that are easy to confuse when read
                    aloud.
                  </p>
                )}
              </div>

              {target.hasPassword && (
                <p className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    This replaces their current password and signs them out everywhere. They will not be
                    able to use the app until you give them the new one.
                  </span>
                </p>
              )}

              {error && <p className="text-sm font-medium text-red-400">{error}</p>}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {target.devices > 0 && (
                  <button
                    onClick={signOutEverywhere}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded border border-red-500/30 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-40 sm:mr-auto"
                  >
                    <LogOut className="h-4 w-4" /> Sign out all devices
                  </button>
                )}
                <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
                  Cancel
                </button>
                <button
                  onClick={setPassword}
                  disabled={busy || (useCustom && custom.trim().length < 8)}
                  className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {target.hasPassword ? 'Reset password' : 'Create password'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
