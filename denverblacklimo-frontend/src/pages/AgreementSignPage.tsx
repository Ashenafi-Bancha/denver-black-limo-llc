import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Download, FileText, Loader2, Pen, Phone, Type } from 'lucide-react'
import { PHONE, PHONE_HREF } from '../constants'
import { PREAMBLE, SECTIONS, type TermsBlock } from '../content/terms'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/**
 * The page the "Read & Sign the Agreement" link in the confirmation email
 * opens. The whole agreement is on screen — the same wording as the PDF and
 * the /terms page — and the signature is captured here rather than inside the
 * PDF, because signing a PDF needs desktop software most people booking a car
 * from their phone do not have.
 *
 * The signature is drawn on a canvas. Typing a name produces a canvas image
 * too, so the backend always receives the same thing and the record is
 * consistent however the customer chose to sign.
 */

interface Agreement {
  reference: string
  name: string
  email: string
  serviceType: string
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  vehicle: string
  passengers: number
  termsVersion: string
  signed: boolean
  signedAt: string | null
  signerName: string | null
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

function Block({ block }: { block: TermsBlock }) {
  if (block.type === 'p') return <p className="text-[15px] leading-relaxed text-white/75">{block.text}</p>
  if (block.type === 'sub')
    return (
      <p className="text-[15px] leading-relaxed text-white/75">
        <span className="font-semibold text-white">{block.title}</span>
        {block.text ? <> &ndash; {block.text}</> : null}
      </p>
    )
  if (block.type === 'bullets')
    return (
      <ul className="space-y-2 pl-5 text-[15px] leading-relaxed text-white/75 marker:text-brand-gold-light">
        {block.items.map((i) => (
          <li key={i} className="list-disc">{i}</li>
        ))}
      </ul>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-xl border-collapse text-left text-sm">
        <thead>
          <tr className="bg-brand-surface text-brand-gold-light">
            {block.head.map((h) => (
              <th key={h} className="border border-brand-gold/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map(([a, b]) => (
            <tr key={a} className="odd:bg-white/[0.02]">
              <td className="border border-brand-gold/20 px-4 py-2 text-white/85">{a}</td>
              <td className="border border-brand-gold/20 px-4 py-2 font-medium text-white">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Canvas signature pad. Pointer events cover mouse, finger and stylus alike. */
function SignaturePad({ onChange }: { onChange: (empty: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)

  // The canvas is sized to its rendered box times the device pixel ratio,
  // otherwise a signature drawn on a phone comes out soft in the PDF.
  const fit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 3)
    const w = Math.round(rect.width * ratio)
    const h = Math.round(rect.height * ratio)
    if (canvas.width === w && canvas.height === h) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [])

  useEffect(() => {
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!dirty.current) {
      dirty.current = true
      onChange(false)
    }
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dirty.current = false
    onChange(true)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className="h-40 w-full cursor-crosshair touch-none rounded-lg border border-brand-gold/40 bg-white"
        aria-label="Signature area — draw your signature here"
        data-signature-pad
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-white/50">Sign with your finger, stylus or mouse.</p>
        <button type="button" onClick={clear} className="text-xs font-semibold text-brand-gold-light hover:underline">
          Clear
        </button>
      </div>
    </div>
  )
}

export function AgreementSignPage() {
  const { token = '' } = useParams()
  const [data, setData] = useState<Agreement | null>(null)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [signerName, setSignerName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [padEmpty, setPadEmpty] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ signedAt: string } | null>(null)

  const pdfUrl = `${API_URL}/agreement/${encodeURIComponent(token)}/pdf`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/agreement/${encodeURIComponent(token)}`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'This signing link is not valid.')
        const json = (await res.json()) as Agreement
        if (cancelled) return
        setData(json)
        setSignerName(json.name || '')
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'This signing link is not valid.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  /** Whatever the customer chose, the backend receives one PNG. */
  const signatureImage = (): string | null => {
    if (mode === 'draw') {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-signature-pad]')
      return canvas && !padEmpty ? canvas.toDataURL('image/png') : null
    }
    const name = signerName.trim()
    if (!name) return null
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 220
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#111827'
    ctx.font = 'italic 84px "Cormorant Garamond", Georgia, serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 20, 118)
    return canvas.toDataURL('image/png')
  }

  const canSubmit = agreed && signerName.trim().length >= 2 && (mode === 'type' || !padEmpty) && !busy

  async function submit() {
    setError('')
    const signaturePng = signatureImage()
    if (!signaturePng) {
      setError(mode === 'draw' ? 'Please sign in the box above.' : 'Please type your full name.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/agreement/${encodeURIComponent(token)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: signerName.trim(), signaturePng, agreed: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not record your signature.')
      setDone({ signedAt: json.signedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record your signature.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-20 pt-32 text-center md:px-6">
        <h1 className="font-display text-3xl text-white">Link not valid</h1>
        <p className="mt-4 text-white/70">{loadError}</p>
        <p className="mt-6 text-white/70">
          Please use the link in your confirmation email, or call us at{' '}
          <a href={PHONE_HREF} className="font-semibold text-brand-gold-light">{PHONE}</a>.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-brand-gold-light hover:underline">
          Back to the website
        </Link>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="mx-auto flex max-w-2xl items-center justify-center gap-3 px-4 pb-20 pt-40 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your agreement…
      </section>
    )
  }

  const alreadySigned = data.signed || Boolean(done)
  const signedWhen = done?.signedAt || data.signedAt

  return (
    <>
      <section className="border-b border-brand-gold/15 bg-brand-black pb-10 pt-28 md:pt-32">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="text-xs font-bold tracking-[0.3em] text-brand-gold-light">RESERVATION AGREEMENT</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-white md:text-4xl">
            {alreadySigned ? 'Your agreement is signed' : 'Please read and sign your agreement'}
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            {alreadySigned
              ? 'Thank you. A signed copy has been emailed to you and is kept on file with your reservation.'
              : 'Your reservation is confirmed once this agreement is signed. Read it through, then sign at the bottom of the page.'}
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Reservation', data.reference],
              ['Service', data.serviceType],
              ['Pick-up', [longDate(data.pickupDate), data.pickupTime ? clock12(data.pickupTime) : ''].filter(Boolean).join(' · ')],
              ['Vehicle', data.vehicle || '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-brand-gold/25 bg-brand-surface/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gold-light">{k}</p>
                <p className="mt-1 text-sm font-medium text-white">{v}</p>
              </div>
            ))}
          </div>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-gold/50 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-light transition hover:bg-brand-gold/10"
          >
            {alreadySigned ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {alreadySigned ? 'Download signed PDF' : 'Open the PDF'}
          </a>
        </div>
      </section>

      <section className="bg-brand-charcoal py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <article className="max-h-[60vh] overflow-y-auto rounded-2xl border border-brand-gold/20 bg-brand-black/40 p-6 md:p-8">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Reservation Agreement, Terms, Conditions and Cancellation Policies
            </h2>
            <div className="mt-5 space-y-4">
              {PREAMBLE.map((p) => (
                <p key={p.slice(0, 40)} className="text-[15px] leading-relaxed text-white/75">{p}</p>
              ))}
            </div>
            {SECTIONS.map((s, i) => (
              <section key={s.id} className="mt-10">
                <h3 className="flex items-baseline gap-3 font-display text-xl tracking-wide text-white">
                  <span className="text-sm text-brand-gold-light">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h3>
                <div className="mt-4 space-y-4 border-l border-brand-gold/25 pl-5">
                  {s.blocks.map((b, j) => (
                    <Block key={j} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </article>

          {alreadySigned ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center md:p-8"
            >
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h2 className="mt-3 font-display text-2xl text-white">Signed and on file</h2>
              <p className="mt-2 text-white/70">
                Signed by <span className="font-semibold text-white">{done ? signerName : data.signerName}</span>
                {signedWhen ? <> on {new Date(signedWhen).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</> : null}.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-black"
                >
                  <Download className="h-4 w-4" /> Download signed PDF
                </a>
                <a href={PHONE_HREF} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-gold-light">
                  <Phone className="h-4 w-4" /> {PHONE}
                </a>
              </div>
            </motion.div>
          ) : (
            <div className="mt-8 rounded-2xl border border-brand-gold/30 bg-brand-surface/40 p-6 md:p-8">
              <h2 className="font-display text-2xl tracking-wide text-white">Sign the agreement</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                By signing, you confirm you have read and agree to the terms above, including the payment and deposit
                schedule, the authorization to charge the card on file, and the cancellation notice periods. You consent
                to signing electronically, and your electronic signature has the same legal effect as a handwritten one.
              </p>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-brand-gold-light">
                  Full name
                </label>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-3 text-white outline-none transition focus:border-brand-gold"
                />
              </div>

              <div className="mt-6">
                <div className="mb-3 flex gap-2">
                  {([['draw', 'Draw', Pen], ['type', 'Type', Type]] as const).map(([m, label, Icon]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                        mode === m ? 'bg-brand-gold text-brand-black' : 'border border-brand-gold/40 text-brand-gold-light'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {mode === 'draw' ? (
                  <SignaturePad onChange={setPadEmpty} />
                ) : (
                  <div className="flex h-40 items-center rounded-lg border border-brand-gold/40 bg-white px-6">
                    <span className="font-display text-4xl italic text-gray-900">{signerName || 'Your name'}</span>
                  </div>
                )}
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#c9a227]"
                />
                <span>
                  I have read and agree to the Reservation Agreement, Terms, Conditions and Cancellation Policies, and I
                  consent to signing this agreement electronically.
                </span>
              </label>

              {error && <p className="mt-4 text-sm font-medium text-red-400">{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing…</> : 'Sign & Submit'}
              </button>
              <p className="mt-3 text-xs text-white/50">
                A signed copy is emailed to you as soon as you sign. Questions? Call or text{' '}
                <a href={PHONE_HREF} className="font-semibold text-brand-gold-light">{PHONE}</a>.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
