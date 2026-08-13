/**
 * Fallbacks for the price estimator.
 *
 * The rate card itself is NOT here. It lives in the database and is edited in
 * the admin under Content, in the three "Estimator" sections. `fromSettings.js`
 * reads it from there and builds the config the engine prices with.
 *
 * This file only holds values that are not a business decision, so that a
 * missing row cannot leave the engine without, say, a currency symbol. Editing
 * anything here will not change a single price on the website.
 */
const FALLBACKS = {
  currency: '$',
  roundTo: 5,
  marketAdjustment: 1,
  /** No discount may push a price below this share of the rate card. */
  marketAdjustmentFloor: 0.75,
  bands: { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 },
  limits: { maxAutoQuoteMiles: 250, maxServiceMiles: 500 },
};

module.exports = { CONFIG: FALLBACKS, FALLBACKS };
