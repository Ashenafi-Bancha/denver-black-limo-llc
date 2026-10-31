import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Clock, Loader2, MapPin, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from './AdminUI'

/**
 * What the chauffeur photographed.
 *
 * The agreement makes the client liable for "smoking in the vehicles,
 * vomiting in vehicle, excessive spills/messes, burns, tears, broken
 * glassware", and bills a no-show. Each of those is argued after the fact
 * against a customer who remembers it differently; this is the office's side
 * of that argument.
 *
 * These are not served like CMS images. A picture of a damaged interior or the
 * doorway nobody came out of sits behind a token, so an <img src> cannot fetch
 * one — a tag sends no Authorization header. Each is fetched as a blob and
 * handed to the browser as an object URL, which then has to be revoked, or the
 * admin leaks a few megabytes per booking the office opens.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface TripPhoto {
  id: string
  kind: string
  note: string | null
  driver_name: string | null
  taken_at: string
  recorded_at: string
  lat: string | number | null
  lng: string | number | null
  mime_type: string
  byte_size: number
}

const KIND_LABELS: Record<string, string> = {
  vehicle_before: 'Vehicle before',
  vehicle_after: 'Vehicle after',
  damage: 'Damage',
  no_show: 'No-show',
  other: 'Other',
}

const KIND_TONES: Record<string, string> = {
  vehicle_before: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  vehicle_after: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  damage: 'border-red-500/40 bg-red-500/10 text-red-300',
  no_show: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  other: 'border-white/15 bg-white/5 text-white/60',
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtFull = (iso: string) => new Date(iso).toLocaleString()

/** Fetches a token-guarded image and keeps the object URL alive while shown. */
function useAuthedImage(photoId: string | null, token: string | null) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!photoId) return
    let cancelled = false
    let objectUrl: string | null = null
    setSrc(null)
    setFailed(false)
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/trip-photos/${photoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      // Without this the browser holds every photo the office has looked at
      // until the tab is closed.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId, token])

  return { src, failed }
}

function Thumb({
  photo,
  token,
  onOpen,
}: {
  photo: TripPhoto
  token: string | null
  onOpen: () => void
}) {
  const { src, failed } = useAuthedImage(photo.id, token)
  const lag = Math.round(
    (new Date(photo.recorded_at).getTime() - new Date(photo.taken_at).getTime()) / 60000
  )

  return (
    <div className="w-[108px] shrink-0">
      <button
        type="button"
        onClick={onOpen}
        title={fmtFull(photo.taken_at)}
        className="block h-[108px] w-[108px] overflow-hidden rounded border border-white/10 bg-brand-surface transition hover:border-brand-gold/60"
      >
        {src ? (
          <img src={src} alt={KIND_LABELS[photo.kind] || photo.kind} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/30">
            {failed ? <X className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
          </span>
        )}
      </button>
      <p
        className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
          KIND_TONES[photo.kind] || KIND_TONES.other
        }`}
      >
        {KIND_LABELS[photo.kind] || photo.kind}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-white/50">{fmtTime(photo.taken_at)}</p>
      {lag >= 5 && (
        <p className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-amber-300/80">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          synced {lag} min later
        </p>
      )}
    </div>
  )
}

function Lightbox({
  photo,
  token,
  onClose,
  onDelete,
}: {
  photo: TripPhoto
  token: string | null
  onClose: () => void
  onDelete: () => void
}) {
  const { src, failed } = useAuthedImage(photo.id, token)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-3xl overflow-auto rounded-lg border border-white/10 bg-brand-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {KIND_LABELS[photo.kind] || photo.kind}
            </p>
            <p className="text-xs text-white/50">
              {fmtFull(photo.taken_at)}
              {photo.driver_name ? ` · ${photo.driver_name}` : ''} ·{' '}
              {Math.round(photo.byte_size / 1024)} KB
            </p>
            {photo.note && <p className="mt-1 text-xs text-white/70">{photo.note}</p>}
            {photo.lat != null && photo.lng != null && (
              <a
                href={`https://www.google.com/maps?q=${photo.lat},${photo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-brand-gold"
              >
                <MapPin className="h-3 w-3" />
                {Number(photo.lat).toFixed(4)}, {Number(photo.lng).toFixed(4)}
              </a>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="rounded border border-red-500/40 p-2 text-red-300 transition hover:bg-red-500/10"
              title="Delete this photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 p-2 text-white/60 transition hover:bg-white/5"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-[200px] items-center justify-center p-3">
          {src ? (
            <img src={src} alt={KIND_LABELS[photo.kind] || photo.kind} className="max-h-[70vh] w-auto rounded" />
          ) : (
            <span className="text-sm text-white/40">
              {failed ? 'Could not load this photo.' : 'Loading…'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminTripPhotos({
  bookingId,
  token,
  onToast,
}: {
  bookingId: string
  token: string | null
  onToast?: (text: string, kind: 'ok' | 'err') => void
}) {
  const [photos, setPhotos] = useState<TripPhoto[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<TripPhoto | null>(null)
  const [confirming, setConfirming] = useState<TripPhoto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/photos`, { headers })
      if (!res.ok) throw new Error()
      setPhotos(await res.json())
    } catch {
      setError('Could not load the photos.')
    }
  }, [bookingId, headers])

  useEffect(() => {
    load()
  }, [load])

  const remove = async () => {
    if (!confirming) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/trip-photos/${confirming.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error()
      setPhotos((prev) => (prev || []).filter((p) => p.id !== confirming.id))
      setOpen(null)
      onToast?.('Photo deleted.', 'ok')
    } catch {
      onToast?.('Could not delete that photo.', 'err')
    } finally {
      setDeleting(false)
      setConfirming(null)
    }
  }

  if (error) return <p className="text-sm text-white/40">{error}</p>
  if (!photos) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading photos&hellip;
      </p>
    )
  }
  // Silent when there is nothing: most trips have no photographs, and an empty
  // panel on every booking would train the office to stop looking at this one.
  if (!photos.length) return null

  return (
    // min-w-0, or the fixed-width thumbnails below set the width of the whole
    // booking panel and overflow-x-auto never engages.
    <div className="min-w-0 space-y-3">
      <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-gold">
        <Camera className="h-4 w-4" /> PHOTOS ({photos.length})
      </h4>
      <div className="flex gap-3 overflow-x-auto rounded border border-white/5 bg-brand-surface p-4">
        {photos.map((p) => (
          <Thumb key={p.id} photo={p} token={token} onOpen={() => setOpen(p)} />
        ))}
      </div>

      {open && (
        <Lightbox
          photo={open}
          token={token}
          onClose={() => setOpen(null)}
          onDelete={() => setConfirming(open)}
        />
      )}

      <ConfirmDialog
        open={!!confirming}
        title="Delete this photo?"
        message={
          <>
            This is evidence for a damage or no-show charge and cannot be recovered. The driver
            cannot take it again.
          </>
        }
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}
