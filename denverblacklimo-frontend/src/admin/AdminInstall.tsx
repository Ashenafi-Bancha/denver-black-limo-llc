import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, Copy, Download, EllipsisVertical, Monitor, Share, Smartphone, SquarePlus, X,
} from 'lucide-react'

/**
 * "Install the app" — offered wherever it is useful, until it has been done.
 *
 * What installing means differs by platform, and the entry point has to be
 * honest about it:
 *
 *   - Chrome on Android hands us a real install dialog (beforeinstallprompt),
 *     so the button installs in one tap.
 *   - iOS has no install API at all. The only route is Share → Add to Home
 *     Screen, so the button opens those steps rather than pretending.
 *   - On a desktop the point is to get the app onto a phone, so it shows the
 *     address to open there, and offers a desktop install as a side option.
 *
 * It disappears once installed. "Installed" is worked out from every signal a
 * browser will give: running in standalone mode, the appinstalled event, and
 * — on Android — getInstalledRelatedApps, which is the only one that can tell
 * whether an app installed earlier has since been removed.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop'

const INSTALLED_KEY = 'dblAdminInstalled'
/** Hiding the phone strip lasts for this visit only — it is offered, not nagged. */
const STRIP_HIDDEN_KEY = 'dblAdminInstallStripHidden'

// ── A module-level store ───────────────────────────────────────────────────
//
// beforeinstallprompt fires once, early, and whenever Chrome decides — often
// while the sign-in screen is still showing, long before any component that
// wants it has mounted. Listening at module load, rather than in an effect,
// means the event is never missed.

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedThisSession = false
let version = 0
const listeners = new Set<() => void>()

function bump() {
  version += 1
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stops Chrome's own mini-infobar; our entry points replace it.
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    bump()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedThisSession = true
    try {
      localStorage.setItem(INSTALLED_KEY, '1')
    } catch {
      /* private mode — the session flag still covers this visit */
    }
    bump()
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; the touch points give it away.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** True when this page is the installed app rather than a browser tab. */
function isStandalone() {
  if (typeof window === 'undefined') return false
  const modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
  return (
    modes.some((m) => window.matchMedia(`(display-mode: ${m})`).matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function readFlag(key: string, store: 'local' | 'session' = 'local') {
  try {
    return (store === 'local' ? localStorage : sessionStorage).getItem(key) === '1'
  } catch {
    return false
  }
}

export function useInstallState() {
  useSyncExternalStore(subscribe, () => version, () => 0)

  // null = the browser cannot say; true/false = it answered.
  const [relatedInstalled, setRelatedInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
    if (!nav.getInstalledRelatedApps) return
    nav
      .getInstalledRelatedApps()
      .then((apps) => {
        const found = apps.length > 0
        setRelatedInstalled(found)
        // An empty answer is authoritative: the app is not installed, even if
        // it once was. Without this, someone who uninstalled would never be
        // offered it again.
        if (!found) {
          try {
            localStorage.removeItem(INSTALLED_KEY)
          } catch {
            /* nothing to clear */
          }
        }
      })
      .catch(() => {})
  }, [])

  const standalone = isStandalone()
  const installed =
    standalone ||
    installedThisSession ||
    relatedInstalled === true ||
    (relatedInstalled === null && readFlag(INSTALLED_KEY))

  const promptInstall = useCallback(async () => {
    const e = deferredPrompt
    if (!e) return 'unavailable' as const
    // An install prompt can be used exactly once.
    deferredPrompt = null
    bump()
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome
  }, [])

  return {
    installed,
    platform: detectPlatform(),
    canPrompt: Boolean(deferredPrompt),
    promptInstall,
  }
}

/**
 * What tapping "Install" does. Android with a live prompt installs directly;
 * everything else — iOS, a dismissed Android prompt, a desktop — gets the
 * steps that actually work there.
 */
export function useInstallAction() {
  const state = useInstallState()
  const [sheetOpen, setSheetOpen] = useState(false)

  const install = useCallback(async () => {
    if (state.platform === 'android' && state.canPrompt) {
      await state.promptInstall()
      return
    }
    setSheetOpen(true)
  }, [state])

  return { ...state, install, sheetOpen, closeSheet: () => setSheetOpen(false) }
}

// ── Entry points ───────────────────────────────────────────────────────────

/**
 * The permanent entry: bottom of the sidebar, above Logout. Always in view on
 * a desktop, and one tap away inside the drawer on a phone, so it stays
 * findable after the phone strip has been hidden.
 */
export function InstallSidebarCard({ onInstall, platform }: { onInstall: () => void; platform: Platform }) {
  const onPhone = platform !== 'desktop'
  return (
    <div className="mb-3 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3">
      <div className="flex items-center gap-2.5">
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 shrink-0 rounded-md" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{onPhone ? 'Install the app' : 'Get the mobile app'}</p>
          <p className="text-[11px] leading-snug text-white/50">
            {onPhone ? 'Open DBL Admin from your home screen.' : 'Run bookings from your phone.'}
          </p>
        </div>
      </div>
      <button
        onClick={onInstall}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-gradient px-3 py-2 text-xs font-bold uppercase tracking-widest text-brand-black transition hover:opacity-90"
      >
        {onPhone ? <Download className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
        {onPhone ? 'Install app' : 'Install on your phone'}
      </button>
    </div>
  )
}

/**
 * The visible offer on a phone: the first thing on every tab, above the page
 * title. It scrolls away with the page rather than sitting in the sticky
 * header, where it would cost a permanent strip of a small screen. Hiding it
 * lasts for this visit; the sidebar card is still there afterwards.
 */
export function InstallStrip({ onInstall, platform }: { onInstall: () => void; platform: Platform }) {
  const [hidden, setHidden] = useState(() => readFlag(STRIP_HIDDEN_KEY, 'session'))
  if (hidden || platform === 'desktop') return null

  // Two rows rather than one. At 320px a single row leaves the title about
  // 70px once a 44px dismiss target and the button are placed, and it ran
  // underneath the button. A full-width button below is also simply easier to
  // hit, which is the point of the thing.
  return (
    <div className="mb-5 rounded-lg border border-brand-gold/40 bg-gradient-to-r from-brand-gold/15 to-brand-gold/5 p-3 lg:hidden">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-white">Install DBL Admin</p>
          <p className="text-xs leading-snug text-white/60">Open it from your home screen, like any app.</p>
        </div>
        <button
          onClick={() => {
            setHidden(true)
            try {
              sessionStorage.setItem(STRIP_HIDDEN_KEY, '1')
            } catch {
              /* the state change alone is enough */
            }
          }}
          aria-label="Hide for now"
          className="-mr-1 -mt-1 shrink-0 rounded p-1 text-white/40 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={onInstall}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-gradient px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-brand-black"
      >
        <Download className="h-3.5 w-3.5" /> Install app
      </button>
    </div>
  )
}

// ── Instructions ───────────────────────────────────────────────────────────

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 text-xs font-bold text-brand-gold">
        {n}
      </span>
      <div className="min-w-0 pt-0.5 text-sm leading-relaxed text-white/80">
        {children}
        <span className="ml-1.5 inline-flex translate-y-0.5 text-brand-gold/80">{icon}</span>
      </div>
    </li>
  )
}

function IosSteps() {
  return (
    <ol className="space-y-4">
      <Step n={1} icon={<Share className="h-4 w-4" />}>
        Tap the <strong className="text-white">Share</strong> button &mdash; at the bottom of Safari, or the top on an iPad.
      </Step>
      <Step n={2} icon={<SquarePlus className="h-4 w-4" />}>
        Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
      </Step>
      <Step n={3} icon={<Check className="h-4 w-4" />}>
        Tap <strong className="text-white">Add</strong>. DBL Admin appears on your home screen.
      </Step>
    </ol>
  )
}

function AndroidSteps() {
  return (
    <ol className="space-y-4">
      <Step n={1} icon={<EllipsisVertical className="h-4 w-4" />}>
        Tap the <strong className="text-white">menu</strong> in the top-right corner of Chrome.
      </Step>
      <Step n={2} icon={<Download className="h-4 w-4" />}>
        Tap <strong className="text-white">Install app</strong>.
      </Step>
      <Step n={3} icon={<Check className="h-4 w-4" />}>
        Tap <strong className="text-white">Install</strong>. DBL Admin appears on your home screen and in your apps.
      </Step>
    </ol>
  )
}

function CopyAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-brand-black px-3 py-2.5">
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-brand-gold-light">{url.replace(/^https?:\/\//, '')}</span>
      <button
        onClick={() => {
          navigator.clipboard
            ?.writeText(url)
            .then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            })
            .catch(() => {})
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function InstallSheet({
  open,
  onClose,
  platform,
  canPrompt,
  promptInstall,
}: {
  open: boolean
  onClose: () => void
  platform: Platform
  canPrompt: boolean
  promptInstall: () => Promise<string>
}) {
  // Built from the current origin, so a local build points at localhost and
  // production at the live domain without either being written down here.
  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const title =
    platform === 'ios'
      ? 'Install DBL Admin on your iPhone'
      : platform === 'android'
        ? 'Install DBL Admin on your phone'
        : 'Get DBL Admin on your phone'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22 }}
            // A bottom sheet on a phone, where the thumb already is; a centred
            // dialog on anything larger.
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-brand-surface shadow-2xl sm:rounded-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-white/10 p-5">
              <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <h2 id="install-title" className="font-display text-lg leading-tight text-brand-gold">{title}</h2>
                <p className="mt-1 text-xs text-white/50">
                  Opens full screen from your home screen, without the browser bar.
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {platform === 'ios' && (
                <>
                  <IosSteps />
                  <p className="rounded-md border border-white/10 bg-brand-black/40 p-3 text-xs text-white/50">
                    Don&rsquo;t see <strong className="text-white/70">Add to Home Screen</strong>? Open this page in
                    Safari and try again.
                  </p>
                </>
              )}

              {platform === 'android' && <AndroidSteps />}

              {platform === 'desktop' && (
                <>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-gold/80">
                      1. On your phone, open
                    </p>
                    <CopyAddress url={adminUrl} />
                    <p className="mt-2 text-xs text-white/40">Sign in with your usual admin email and password.</p>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-gold/80">
                      2. Then install it
                    </p>
                    <div className="space-y-5">
                      <div>
                        <p className="mb-3 text-sm font-medium text-white">Android &mdash; Chrome</p>
                        <AndroidSteps />
                      </div>
                      <div className="border-t border-white/10 pt-5">
                        <p className="mb-3 text-sm font-medium text-white">iPhone &mdash; Safari</p>
                        <IosSteps />
                      </div>
                    </div>
                  </div>

                  {/* Offered, not pushed: the reason anyone opened this was a phone. */}
                  {canPrompt && (
                    <div className="border-t border-white/10 pt-5">
                      <button
                        onClick={async () => {
                          await promptInstall()
                          onClose()
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-brand-gold/40 hover:text-brand-gold"
                      >
                        <Monitor className="h-4 w-4" /> Or install on this computer
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-md bg-gold-gradient px-4 py-3 text-sm font-bold uppercase tracking-widest text-brand-black"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
