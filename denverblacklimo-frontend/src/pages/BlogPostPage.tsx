import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { GoldButton, OutlineButton } from '../components/ui'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { posts as defaultPosts, type Post } from '../data/posts'

/** Renders the light post markup: "## heading", "- bullet", blank-line paragraphs. */
function PostBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="pt-3 font-display text-2xl text-brand-gold-light md:text-[28px]">
              {block.replace(/^##\s+/, '')}
            </h2>
          )
        }

        if (block.split('\n').every((line) => line.trim().startsWith('- '))) {
          return (
            <ul key={i} className="space-y-2.5">
              {block.split('\n').map((line, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/75">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand-gold-light" />
                  <span>{line.replace(/^-\s+/, '')}</span>
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={i} className="text-[15px] leading-relaxed text-white/75 md:text-base">
            {block}
          </p>
        )
      })}
    </div>
  )
}

export function BlogPostPage() {
  const { slug } = useParams()
  const { get } = useSiteSettings()
  const posts = get<Post[]>('posts', defaultPosts)
  const post = posts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl text-white">Article not found</h1>
        <Link to="/blog" className="mt-4 inline-block text-brand-gold-light">
          Back to all articles
        </Link>
      </div>
    )
  }

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 2)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={post.image}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              if (t.dataset.fb) return
              t.dataset.fb = '1'
              t.src = IMAGES.hero1
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/85 to-brand-black/45" />
        </div>
        <motion.div
          className="relative mx-auto max-w-3xl px-4 pb-12 pt-28 md:px-6 md:py-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-brand-gold-light hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ALL ARTICLES
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="rounded-full border border-brand-gold/40 px-3 py-1 text-brand-gold-light">
              {post.tag}
            </span>
            <span>{post.date}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-white md:text-[42px]">
            {post.title}
          </h1>
        </motion.div>
      </section>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <p className="border-l-2 border-brand-gold/50 pl-5 text-base italic leading-relaxed text-white/60 md:text-lg">
          {post.excerpt}
        </p>
        <div className="mt-10">
          <PostBody content={post.content} />
        </div>

        {/* In-article CTA */}
        <div className="mt-12 rounded-xl border border-brand-gold/30 bg-brand-surface/40 p-6 text-center md:p-8">
          <h2 className="font-display text-xl text-white md:text-2xl">
            Let us handle the drive
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/65">
            Professional chauffeurs, immaculate vehicles, and a price confirmed before you ride.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <GoldButton to="/book">BOOK NOW</GoldButton>
            <OutlineButton to="/quote">GET A QUOTE</OutlineButton>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-brand-gold/15 bg-brand-charcoal py-14">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <h2 className="mb-8 text-center font-display text-2xl text-brand-gold-light">
              Keep Reading
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="group flex gap-4 overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-black/50 p-4 transition hover:border-brand-gold/60"
                >
                  <img
                    src={r.image}
                    alt={r.title}
                    loading="lazy"
                    className="h-24 w-32 shrink-0 rounded-lg object-cover"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (t.dataset.fb) return
                      t.dataset.fb = '1'
                      t.src = IMAGES.hero2
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-widest text-brand-gold-light">{r.tag}</p>
                    <h3 className="mt-1 font-display text-lg leading-snug text-white transition-colors group-hover:text-brand-gold-light">
                      {r.title}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold tracking-widest text-brand-gold-light">
                      READ <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABanner />
    </>
  )
}
