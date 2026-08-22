import { CreditCard, Plane, CalendarX, Phone } from 'lucide-react'
import { PageHero } from '../components/ui'
import { IMAGES } from '../config/images'
import { PHONE, PHONE_HREF } from '../constants'
import {
  CANCELLATION_WINDOWS,
  PAYMENT_SCHEDULE,
  PREAMBLE,
  SECTIONS,
  type TermsBlock,
} from '../content/terms'

/**
 * The reservation agreement every booking email carries, published in full so
 * a customer can read it before they book and find it again afterwards.
 *
 * Three things people actually look for come first as cards: when they pay,
 * how cancellation works, and where to meet the chauffeur at the airport.
 * The complete legal text follows, section by section, with anchor links.
 */

function Block({ block }: { block: TermsBlock }) {
  if (block.type === 'p') {
    return <p className="text-[15px] leading-relaxed text-white/75">{block.text}</p>
  }
  if (block.type === 'sub') {
    return (
      <p className="text-[15px] leading-relaxed text-white/75">
        <span className="font-semibold text-white">{block.title}</span>
        {block.text ? <> &ndash; {block.text}</> : null}
      </p>
    )
  }
  if (block.type === 'bullets') {
    return (
      <ul className="space-y-2 pl-5 text-[15px] leading-relaxed text-white/75 marker:text-brand-gold-light">
        {block.items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-xl border-collapse overflow-hidden rounded-lg text-left text-sm">
        <thead>
          <tr className="bg-brand-surface text-brand-gold-light">
            {block.head.map((h) => (
              <th key={h} className="border border-brand-gold/25 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map(([a, b]) => (
            <tr key={a} className="odd:bg-white/[0.02]">
              <td className="border border-brand-gold/20 px-4 py-2.5 text-white/85">{a}</td>
              <td className="border border-brand-gold/20 px-4 py-2.5 font-medium text-white">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QuickCard({
  icon: Icon,
  title,
  rows,
  note,
}: {
  icon: typeof CreditCard
  title: string
  rows: [string, string][]
  note: string
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-brand-gold/30 bg-brand-surface/40 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <h2 className="font-display text-xl tracking-wide text-white">{title}</h2>
      </div>
      <dl className="mt-5 divide-y divide-brand-gold/15 border-y border-brand-gold/15">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
            <dt className="text-white/70">{k}</dt>
            <dd className="shrink-0 font-semibold text-brand-gold-light">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-white/65">{note}</p>
    </div>
  )
}

export function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="RESERVATION AGREEMENT"
        title="Terms, Conditions and Cancellation Policies"
        subtitle="Every reservation request receipt we send carries this agreement. Receipt of it constitutes acceptance, so please read it before your trip."
        image="/images/about-hero.jpg"
        fallback={IMAGES.hero1}
      />

      {/* The three things people look for, up front */}
      <section className="border-b border-brand-gold/15 bg-brand-black">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-3 md:px-6 md:py-16">
          <QuickCard
            icon={CreditCard}
            title="Payment"
            rows={PAYMENT_SCHEDULE}
            note="Airport and FBO pick-ups are paid in full at booking; all other reservations take a 50% deposit at booking. Deposits are non-refundable, and the quoted rate plus any additional time, stops, tolls, parking and damages are charged to the card on file."
          />
          <QuickCard
            icon={CalendarX}
            title="Cancellation"
            rows={CANCELLATION_WINDOWS}
            note="Late cancellations and no-shows are charged in full. If we cannot reach you within 30 minutes of the scheduled pick-up time, the vehicle is released and the full charge applies."
          />
          <div className="flex flex-col rounded-2xl border border-brand-gold/30 bg-brand-surface/40 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                <Plane className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <h2 className="font-display text-xl tracking-wide text-white">Airport pick-up</h2>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-white/70">
              <li>We track your flight and adjust the pick-up to the actual arrival.</li>
              <li>After landing, your chauffeur texts you. Follow the signs to Main Terminal and Baggage Claim.</li>
              <li>
                <span className="font-semibold text-white">DEN meeting points, Island 2:</span> West Terminal Door 506
                (Baggage Claim 16) or East Terminal Door 511 (Baggage Claim 6). Your chauffeur holds a sign with your name.
              </li>
              <li>Free waiting: 30 minutes after gate arrival (domestic), 60 minutes (international).</li>
            </ul>
            <a
              href={PHONE_HREF}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-gold-light"
            >
              <Phone className="h-4 w-4" /> Dispatch {PHONE}, 24/7
            </a>
          </div>
        </div>
      </section>

      {/* The full agreement */}
      <section className="bg-brand-charcoal">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
          <nav aria-label="Sections" className="mb-10 lg:sticky lg:top-28 lg:mb-0 lg:self-start">
            <p className="text-xs font-bold tracking-[0.3em] text-brand-gold-light">CONTENTS</p>
            <ol className="mt-4 space-y-2 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 text-white/70 transition hover:text-brand-gold-light">
                    <span className="w-5 shrink-0 text-brand-gold-light/70">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-3xl">
            <h2 className="font-display text-3xl tracking-wide text-white">
              Reservation Agreement, Terms, Conditions and Cancellation Policies
            </h2>
            <div className="mt-6 space-y-4">
              {PREAMBLE.map((p) => (
                <p key={p.slice(0, 40)} className="text-[15px] leading-relaxed text-white/75">
                  {p}
                </p>
              ))}
            </div>

            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="mt-12 scroll-mt-28">
                <h3 className="flex items-baseline gap-3 font-display text-2xl tracking-wide text-white">
                  <span className="text-base text-brand-gold-light">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h3>
                <div className="mt-5 space-y-4 border-l border-brand-gold/25 pl-5">
                  {s.blocks.map((b, j) => (
                    <Block key={j} block={b} />
                  ))}
                </div>
              </section>
            ))}

            <p className="mt-14 border-t border-brand-gold/20 pt-6 text-sm text-white/55">
              Questions about any of these terms? Call or text{' '}
              <a href={PHONE_HREF} className="font-semibold text-brand-gold-light">
                {PHONE}
              </a>{' '}
              any time.
            </p>
          </article>
        </div>
      </section>
    </>
  )
}
