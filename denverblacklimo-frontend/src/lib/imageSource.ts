/**
 * Works out which image an item should actually show.
 *
 * Several parts of the site look for the client's own photo at a path derived
 * from the item's number — `/images/fleet/fleet-2.jpeg`, say — and treat the
 * value on the record as a last-resort fallback for when that file is missing.
 * That ordering silently defeats the CMS: those files exist, so an image
 * uploaded in the admin never got a chance to load.
 *
 * Inverting it wholesale would be just as wrong, because the built-in records
 * ship with stock photos; "record value always wins" would replace the
 * client's own numbered banners with stock ones.
 *
 * So the rule is: a value that differs from the built-in default is a
 * deliberate choice by an admin and wins outright. Otherwise nothing has been
 * chosen, and we fall back to the numbered convention and then the stock
 * image — exactly what the site did before.
 */
export function imageCandidates(
  currentValue: string | undefined,
  builtInDefault: string | undefined,
  conventionPaths: string[] = []
): string[] {
  const chosen = (currentValue || '').trim()
  if (chosen && chosen !== builtInDefault) return [chosen]
  // Deduped: when nothing was chosen, `chosen` and the default are the same
  // string, and retrying a source that just failed only delays the fallback.
  return [...new Set([...conventionPaths, builtInDefault || '', chosen])].filter(Boolean)
}

/** Both extensions the client's uploads have historically used. */
export function numberedPaths(dir: string, prefix: string, num: number | undefined): string[] {
  if (!num) return []
  return [`${dir}/${prefix}-${num}.jpeg`, `${dir}/${prefix}-${num}.jpg`]
}
