import { useState } from 'react'

/**
 * An <img> that walks an ordered list of sources, moving to the next one each
 * time the current source fails to load. Pair with `imageCandidates()`.
 *
 * The list changes underneath us — settings arrive from the API after the
 * first paint — so the attempt counter resets whenever the candidates do.
 * Without that, an image that had already fallen through to the stock photo
 * would stay there after the admin's own upload arrived.
 */
export function FallbackImage({
  candidates,
  alt,
  className,
  loading,
}: {
  candidates: string[]
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  const list = candidates.filter(Boolean)
  const listKey = list.join('|')
  const [attempt, setAttempt] = useState({ listKey, index: 0 })

  // Derive-during-render reset: cheaper and flicker-free next to an effect.
  if (attempt.listKey !== listKey) setAttempt({ listKey, index: 0 })

  const index = attempt.listKey === listKey ? attempt.index : 0

  return (
    <img
      src={list[index]}
      alt={alt}
      loading={loading}
      className={className}
      onError={() =>
        setAttempt((prev) =>
          prev.index + 1 < list.length ? { listKey, index: prev.index + 1 } : prev
        )
      }
    />
  )
}
