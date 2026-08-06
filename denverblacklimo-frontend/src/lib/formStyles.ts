/**
 * Shared styling for native form controls on the dark brand background.
 *
 * `<option>` needs an explicit background colour. Left transparent, the native
 * dropdown is painted by the browser: Chromium uses the select's own background
 * (so black options on a black field disappear), while other browsers use the
 * system popup colour (so white options on a white popup disappear). Setting both
 * colours removes the guesswork.
 */
export const OPTION_CLASS = 'bg-brand-surface text-white'

/** Same, for the "nothing selected yet" placeholder row. */
export const OPTION_PLACEHOLDER_CLASS = 'bg-brand-surface text-white/60'
