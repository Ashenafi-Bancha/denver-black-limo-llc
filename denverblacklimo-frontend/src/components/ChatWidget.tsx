import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronRight,
  Clock,
  Lock,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  Phone,
  RotateCw,
  Send,
  UserRound,
  X,
} from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  DEFAULT_ABOUT,
  DEFAULT_BUSINESS,
  telHref,
  type AboutContent,
  type BusinessInfo,
} from '../content/defaults'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const POS_KEY = 'dbl-chat-pos'

type Bubble = { from: 'bot' | 'user'; text: string }
/** Mini guided flow for "message Bereket": message → name → phone → email → submit. */
type FlowStep = 'idle' | 'askName' | 'askPhone' | 'askEmail' | 'done'

/** Tawk.to live chat is injected on demand; its API hangs off window. */
declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void
      hideWidget?: () => void
      onLoad?: () => void
      onChatMinimized?: () => void
    }
    Tawk_LoadStart?: Date
  }
}

const WELCOME: Bubble[] = [
  {
    from: 'bot',
    text: "Hi, I'm Bereket. Welcome to Denver Black Limo LLC!\n\nI'm here to help you get a quote or book your luxury transportation in just a few minutes.\n\nHow can I assist you today?",
  },
]

/** Bereket's avatar — the founder photo, falling back to a generic icon. */
function BereketAvatar({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <span className={`${className} flex items-center justify-center border border-brand-gold/60 text-brand-gold-light`}>
        <UserRound className="h-1/2 w-1/2" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt="Bereket"
      className={`${className} border border-brand-gold/60 object-cover object-[center_22%]`}
      onError={() => setFailed(true)}
    />
  )
}

export function ChatWidget() {
  const navigate = useNavigate()
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const about = { ...DEFAULT_ABOUT, ...get<Partial<AboutContent>>('about', {}) }
  const founderSrc = about.founderImage || DEFAULT_ABOUT.founderImage

  const [open, setOpen] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>(WELCOME)
  const [input, setInput] = useState('')
  const [flow, setFlow] = useState<FlowStep>('idle')
  const [sending, setSending] = useState(false)
  const draft = useRef<{ message: string; name: string; phone: string }>({ message: '', name: '', phone: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Tawk.to live chat (loaded on demand when configured in the CMS) ────────
  const tawkId = (biz.tawkId || '').trim()
  const openLiveChat = () => {
    if (!tawkId) return
    setOpen(false)
    if (window.Tawk_API?.maximize) {
      window.Tawk_API.maximize()
      return
    }
    window.Tawk_API = window.Tawk_API || {}
    // Keep OUR gold button as the only launcher: hide tawk's bubble on minimize.
    window.Tawk_API.onLoad = () => {
      window.Tawk_API?.maximize?.()
    }
    window.Tawk_API.onChatMinimized = () => {
      window.Tawk_API?.hideWidget?.()
    }
    window.Tawk_LoadStart = new Date()
    const s = document.createElement('script')
    s.async = true
    s.src = `https://embed.tawk.to/${tawkId}`
    s.charset = 'UTF-8'
    s.setAttribute('crossorigin', '*')
    document.head.appendChild(s)
  }

  // ── Draggable launcher button ──────────────────────────────────────────────
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(POS_KEY)
      return raw ? (JSON.parse(raw) as { x: number; y: number }) : null
    } catch {
      return null
    }
  })
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null)

  const clamp = (x: number, y: number) => {
    const size = 56
    const pad = 8
    return {
      x: Math.min(Math.max(x, pad), window.innerWidth - size - pad),
      y: Math.min(Math.max(y, pad), window.innerHeight - size - pad),
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = btnRef.current!.getBoundingClientRect()
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false }
    btnRef.current!.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
    if (d.moved) setPos(clamp(d.baseX + dx, d.baseY + dy))
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.moved) {
      setPos((p) => {
        if (p) try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
        return p
      })
    } else {
      setOpen((v) => !v)
    }
  }

  // Keep the button on-screen when the window resizes
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Auto-scroll the conversation
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [bubbles, open])

  const reset = () => {
    setBubbles(WELCOME)
    setFlow('idle')
    setInput('')
    draft.current = { message: '', name: '', phone: '' }
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const say = (b: Bubble) => setBubbles((prev) => [...prev, b])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    say({ from: 'user', text })

    if (flow === 'idle') {
      draft.current.message = text
      setFlow('askName')
      say({ from: 'bot', text: 'Thanks! May I have your name so our team can follow up?' })
      return
    }
    if (flow === 'askName') {
      draft.current.name = text
      setFlow('askPhone')
      say({
        from: 'bot',
        text: `Great to meet you, ${text}! What's the best phone number to reach you? (or type "skip")`,
      })
      return
    }
    if (flow === 'askPhone') {
      draft.current.phone = /^skip$/i.test(text) ? '' : text
      setFlow('askEmail')
      say({ from: 'bot', text: "Almost done — what's your email address?" })
      return
    }
    if (flow === 'askEmail') {
      setSending(true)
      try {
        const res = await fetch(`${API_URL}/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Contact',
            name: draft.current.name,
            email: text,
            phone: draft.current.phone || undefined,
            service: 'Chat with Bereket',
            message: draft.current.message,
          }),
        })
        if (res.ok) {
          setFlow('done')
          say({
            from: 'bot',
            text: 'Perfect — your message has been sent to our team! We will get back to you shortly. Need anything else? You can also call or text us anytime.',
          })
        } else {
          say({
            from: 'bot',
            text: `Hmm, that didn't go through. Please double-check the email address and send it again — or call us at ${biz.phone}.`,
          })
        }
      } catch {
        say({
          from: 'bot',
          text: `Sorry, something went wrong sending your message. Please try again or call us at ${biz.phone}.`,
        })
      } finally {
        setSending(false)
      }
      return
    }
    // done → start a fresh message
    draft.current = { message: text, name: draft.current.name, phone: draft.current.phone }
    setFlow('askName')
    say({ from: 'bot', text: 'Thanks! May I have your name so our team can follow up?' })
  }

  const actions = [
    ...(tawkId
      ? [
          {
            icon: MessagesSquare,
            title: 'CHAT LIVE NOW',
            sub: 'Talk with our team in real time',
            primary: true,
            onClick: openLiveChat,
          },
        ]
      : []),
    {
      icon: MessageSquareText,
      title: 'GET INSTANT QUOTE',
      sub: 'Get a quote in just a few steps',
      primary: !tawkId,
      onClick: () => go('/quote'),
    },
    { icon: Calendar, title: 'BOOK A RIDE', sub: 'Reserve your ride now', onClick: () => go('/book') },
    {
      icon: Phone,
      title: `CALL ${biz.phone}`,
      sub: 'Speak with our team',
      onClick: () => { window.location.href = telHref(biz.phone) },
    },
    {
      icon: MessagesSquare,
      title: 'TEXT US',
      sub: 'Send us a text message',
      onClick: () => { window.location.href = `sms:+1${biz.phone.replace(/[^\d]/g, '')}` },
    },
  ]

  return (
    <>
      {/* Floating launcher — draggable */}
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? 'Close chat' : 'Chat with Bereket'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
        className="fixed bottom-5 right-5 z-[80] flex h-14 w-14 touch-none items-center justify-center rounded-full bg-gold-gradient text-brand-black shadow-xl shadow-brand-gold/30 transition hover:brightness-110 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-black bg-green-400" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Bereket, your luxury quote assistant"
          className="fixed inset-x-3 bottom-24 z-[79] mx-auto flex max-h-[78vh] w-auto flex-col overflow-hidden rounded-2xl border border-brand-gold/40 bg-brand-black shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-5 sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b-2 border-brand-gold/60 bg-brand-charcoal px-4 py-3">
            <div className="flex items-center gap-3">
              <BereketAvatar src={founderSrc} className="h-10 w-10 shrink-0 rounded-full" />
              <div className="border-l border-brand-gold/40 pl-3">
                <p className="font-display text-lg leading-tight text-brand-gold-light">Bereket,</p>
                <p className="text-xs text-white/75">Your Luxury Quote Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                aria-label="Restart chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Conversation + actions */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <p className="mx-auto w-fit rounded-full border border-white/15 px-3 py-1 text-[10px] tracking-wider text-white/50">
              Today
            </p>
            {bubbles.map((b, i) => (
              <div key={i} className={`flex items-end gap-2 ${b.from === 'user' ? 'justify-end' : ''}`}>
                {b.from === 'bot' && (
                  <BereketAvatar src={founderSrc} className="h-8 w-8 shrink-0 rounded-full" />
                )}
                <p
                  className={`max-w-[80%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    b.from === 'bot'
                      ? 'border border-white/10 bg-brand-surface text-white/85'
                      : 'bg-gold-gradient text-brand-black'
                  }`}
                >
                  {b.text}
                </p>
              </div>
            ))}

            {/* Quick actions (shown until the user starts typing a message flow) */}
            {flow === 'idle' && (
              <div className="space-y-2.5 pt-1">
                {actions.map((a) => (
                  <button
                    key={a.title}
                    type="button"
                    onClick={a.onClick}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition active:scale-[0.99] ${
                      a.primary
                        ? 'bg-gold-gradient text-brand-black shadow-md shadow-brand-gold/25 hover:brightness-110'
                        : 'border border-brand-gold/40 text-brand-gold-light hover:bg-brand-gold/10'
                    }`}
                  >
                    <a.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">
                      <span className="block text-sm font-bold tracking-wide">{a.title}</span>
                      <span className={`block text-xs ${a.primary ? 'text-brand-black/70' : 'text-white/55'}`}>
                        {a.sub}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-brand-gold/25" />
                  <span className="text-[10px] tracking-widest text-brand-gold/70">OR</span>
                  <span className="h-px flex-1 bg-brand-gold/25" />
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-left text-white/75 transition hover:bg-white/5 active:scale-[0.99]"
                >
                  <Clock className="h-5 w-5 shrink-0 text-brand-gold-light" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold tracking-wide">MAYBE LATER</span>
                    <span className="block text-xs text-white/50">I&rsquo;ll come back later</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* Privacy + input */}
          <div className="border-t border-brand-gold/25 bg-brand-charcoal px-4 pb-4 pt-3">
            <p className="flex items-start gap-2 text-[11px] leading-snug text-white/55">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold-light" />
              <span>
                <span className="text-brand-gold-light">Your privacy is important to us.</span>{' '}
                Your information will only be used for your quote request.
              </span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder={
                  flow === 'askName'
                    ? 'Your name…'
                    : flow === 'askPhone'
                      ? 'Your phone (or "skip")…'
                      : flow === 'askEmail'
                        ? 'Your email…'
                        : 'Type a message…'
                }
                aria-label="Type a message"
                className="w-full rounded-full border border-white/15 bg-brand-black px-4 py-2.5 text-sm text-white outline-none transition focus:border-brand-gold/60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-brand-black transition hover:brightness-110 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
