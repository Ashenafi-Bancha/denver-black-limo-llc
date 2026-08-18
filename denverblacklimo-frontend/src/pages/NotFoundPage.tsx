import { Link } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import { PHONE, PHONE_HREF } from '../constants'

/**
 * Catch-all for URLs that match no route. RouteSeo already titles it
 * "Page Not Found" and marks it noindex; this gives the visitor somewhere
 * to go instead of a homepage that pretends the bad link worked.
 */
export function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-brand-black px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold-light">Error 404</p>
        <h1 className="mt-4 font-serif text-4xl text-white sm:text-5xl">This page took a wrong turn</h1>
        <p className="mt-4 text-white/70">
          The address you followed does not exist on our site. Our chauffeurs never get lost — let us
          get you back on the road.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] text-brand-black transition hover:brightness-110"
          >
            BACK TO HOME <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/book"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-brand-gold/50 px-8 text-[13px] font-bold tracking-[0.18em] text-brand-gold-light transition hover:bg-brand-gold/10"
          >
            BOOK A RIDE
          </Link>
        </div>
        <a
          href={PHONE_HREF}
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-brand-gold-light"
        >
          <Phone className="h-4 w-4" /> {PHONE}
        </a>
      </div>
    </section>
  )
}
