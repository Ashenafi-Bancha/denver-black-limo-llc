import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { posts as defaultPosts, type Post } from '../data/posts'

export function BlogPage() {
  const { get } = useSiteSettings()
  const posts = get<Post[]>('posts', defaultPosts)
  const [featured, ...rest] = posts

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero/hero-3.jpeg"
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              if (t.dataset.fb) return
              t.dataset.fb = '1'
              t.src = IMAGES.hero1
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/85 to-brand-black/50 md:bg-gradient-to-r md:from-brand-black md:via-brand-black/85 md:to-brand-black/30" />
        </div>
        <motion.div
          className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 md:px-6 md:py-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <p className="text-xs font-bold tracking-[0.35em] text-brand-gold-light">TRAVEL JOURNAL</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Colorado Travel Insights &amp; Guides
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            Practical advice from chauffeurs who drive Denver, the Front Range and the mountains
            every day — airports, events, ski season and everything in between.
          </p>
        </motion.div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to={`/blog/${featured.slug}`}
              className="group grid gap-0 overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-surface/40 transition hover:border-brand-gold/60 lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[340px]">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const t = e.currentTarget
                    if (t.dataset.fb) return
                    t.dataset.fb = '1'
                    t.src = IMAGES.hero2
                  }}
                />
                <span className="absolute left-4 top-4 rounded-full bg-brand-black/80 px-3 py-1 text-[10px] font-bold tracking-widest text-brand-gold-light">
                  FEATURED
                </span>
              </div>
              <div className="flex flex-col justify-center p-6 md:p-9">
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <span className="rounded-full border border-brand-gold/40 px-3 py-1 text-brand-gold-light">
                    {featured.tag}
                  </span>
                  <span>{featured.date}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {featured.readMinutes} min
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl leading-snug text-white transition-colors group-hover:text-brand-gold-light md:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{featured.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-gold-light">
                  READ ARTICLE <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        </section>
      )}

      {/* Remaining posts */}
      {rest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-surface/40 transition hover:-translate-y-0.5 hover:border-brand-gold/60 hover:shadow-lg hover:shadow-brand-gold/10"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (t.dataset.fb) return
                        t.dataset.fb = '1'
                        t.src = IMAGES.hero2
                      }}
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span className="rounded-full border border-brand-gold/40 px-2.5 py-0.5 text-brand-gold-light">
                        {post.tag}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {post.readMinutes} min
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-xl leading-snug text-white transition-colors group-hover:text-brand-gold-light">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{post.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-brand-gold-light">
                      READ MORE <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <CTABanner title="Planning a Trip? Let Us Drive." />
    </>
  )
}
