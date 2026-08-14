/**
 * Turns a picked address into a zone name, so fixed route prices can fire.
 *
 * The estimator UI sends coordinates and a label; the rate card prices routes
 * by zone name ("DIA to Downtown Denver"). Something has to connect the two,
 * and it cannot be the customer — nobody should have to know our zone map.
 *
 * The gazetteer below anchors each zone the rate card references to a point
 * and a radius. Matching prefers the most specific (smallest-radius) zone
 * whose circle contains the point, so a pin at the airport resolves to DIA
 * rather than to the broad Denver circle that also contains it.
 *
 * Adding a fixed price for a brand-new place in the admin therefore needs a
 * matching anchor here. `unknownZoneNames()` reports rate-card zones that have
 * no anchor, and the admin readiness check surfaces that, so the mismatch is
 * loud rather than a silently-never-matching price.
 */

/** [name, lat, lng, radiusMiles] — smallest radius wins on overlap. */
const ANCHORS = [
  // Airports first: small, specific circles.
  ['DIA', 39.8561, -104.6737, 4],
  ['Centennial Airport', 39.5701, -104.8493, 2],
  ['Rocky Mountain Metro', 39.9088, -105.1172, 2],
  ['Eagle County Airport', 39.6426, -106.9177, 3],

  // Denver metro districts.
  ['Downtown Denver', 39.7439, -104.9925, 3],
  ['Denver Tech Center', 39.6478, -104.8936, 3.5],
  ['Cherry Creek', 39.7186, -104.9535, 1.5],
  ['Aurora', 39.7108, -104.8197, 6],
  ['Littleton', 39.6133, -105.0166, 4],
  ['Highlands Ranch', 39.5539, -104.9689, 4],
  ['Lakewood', 39.7047, -105.0814, 4],
  ['Golden', 39.7555, -105.2211, 3],
  ['Westminster', 39.8367, -105.0372, 4],
  ['Broomfield', 39.9205, -105.0867, 4],
  ['Thornton', 39.8681, -104.9719, 4],
  ['Boulder', 40.015, -105.2705, 5],
  ['Castle Rock', 39.3722, -104.8561, 4],
  ['Colorado Springs', 38.8339, -104.8214, 8],
  ['Fort Collins', 40.5853, -105.0844, 6],

  // Mountain resorts.
  ['Vail', 39.6403, -106.3742, 4],
  ['Beaver Creek', 39.6042, -106.5165, 3],
  ['Breckenridge', 39.4817, -106.0384, 4],
  ['Keystone', 39.5792, -105.9347, 3],
  ['Copper Mountain', 39.5022, -106.1497, 3],
  ['Winter Park', 39.8917, -105.7631, 4],
  ['Arapahoe Basin', 39.6425, -105.8719, 2],
  ['Loveland Ski Area', 39.68, -105.8979, 2],
  ['Aspen', 39.1911, -106.8175, 5],
  ['Snowmass', 39.213, -106.9378, 3],
  ['Steamboat Springs', 40.485, -106.8317, 5],
  ['Estes Park', 40.3772, -105.5217, 4],

  // The broad metro circle LAST in specificity: it exists so a rate card row
  // like "Denver to Vail" matches a pickup anywhere around the city. Radius
  // covers the metro but stops short of Boulder and Castle Rock.
  ['Denver', 39.7392, -104.9903, 14],
];

/**
 * Names that mean the same anchor. Labels come from the geocoder, rate-card
 * zone names come from a person typing; both get normalised through here.
 */
const ALIASES = {
  'denver international airport': 'DIA',
  'den airport': 'DIA',
  'den': 'DIA',
  'denver airport': 'DIA',
  'downtown': 'Downtown Denver',
  'dtc': 'Denver Tech Center',
  'greenwood village': 'Denver Tech Center',
  'a-basin': 'Arapahoe Basin',
  'a basin': 'Arapahoe Basin',
};

/**
 * Containment: a pin in Downtown Denver is also, for pricing purposes, in
 * Denver. Without this a rate-card row like "Denver to Vail" would never match
 * a pickup at a downtown hotel, because inference returns the most specific
 * zone. Mountain operators price metro-to-resort, so the metro districts and
 * suburbs — and the airport — all roll up to Denver.
 */
const PARENTS = {
  'DIA': 'Denver',
  'Downtown Denver': 'Denver',
  'Denver Tech Center': 'Denver',
  'Cherry Creek': 'Denver',
  'Aurora': 'Denver',
  'Littleton': 'Denver',
  'Highlands Ranch': 'Denver',
  'Lakewood': 'Denver',
  'Golden': 'Denver',
  'Westminster': 'Denver',
  'Broomfield': 'Denver',
  'Thornton': 'Denver',
  'Snowmass': 'Aspen',
};

const R_EARTH_MILES = 3958.8;

function haversineMiles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_MILES * Math.asin(Math.sqrt(h));
}

const norm = (s) => String(s || '').trim().toLowerCase();

/** Canonical anchor name for a typed zone name, or null if we know no anchor. */
function canonicalZoneName(name) {
  const n = norm(name);
  if (!n) return null;
  if (ALIASES[n]) return ALIASES[n];
  const hit = ANCHORS.find(([anchor]) => norm(anchor) === n);
  return hit ? hit[0] : null;
}

/**
 * Which zone a picked place falls in.
 *
 * The label is only a tie-break hint for the airport, where it is unambiguous;
 * coordinates decide everything else. Most-specific (smallest radius) wins.
 */
function inferZone(place) {
  if (!place) return null;

  const label = norm(place.label);
  if (label.includes('denver international airport') || /\bdia\b/.test(label)) {
    return 'DIA';
  }

  const lat = Number(place.lat);
  const lng = Number(place.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let best = null;
  for (const [name, aLat, aLng, radius] of ANCHORS) {
    const d = haversineMiles({ lat, lng }, { lat: aLat, lng: aLng });
    if (d > radius) continue;
    if (!best || radius < best.radius) best = { name, radius, distance: d };
  }
  return best ? best.name : null;
}

/**
 * The zone and its ancestors, most specific first: a Union Station pin gives
 * ['Downtown Denver', 'Denver']. Rate matching walks this chain, preferring
 * the most specific row that fits, so DIA-to-Downtown beats a broader
 * Denver-level row when both exist.
 */
function zoneChain(place) {
  const zone = inferZone(place);
  if (!zone) return [];
  const chain = [zone];
  let cursor = zone;
  while (PARENTS[cursor] && !chain.includes(PARENTS[cursor])) {
    cursor = PARENTS[cursor];
    chain.push(cursor);
  }
  return chain;
}

/**
 * Zone names used in the rate card that no anchor recognises. Surfaced by the
 * admin readiness check: a fixed price for an unknown zone would sit in the
 * card looking configured and never match a single trip.
 */
function unknownZoneNames(config) {
  const names = new Set();
  for (const group of ['airport', 'mountain']) {
    for (const z of (config.zones && config.zones[group]) || []) {
      for (const n of z.match || []) {
        if (!canonicalZoneName(n)) names.add(n);
      }
    }
  }
  return [...names];
}

module.exports = { inferZone, zoneChain, canonicalZoneName, unknownZoneNames, haversineMiles, ANCHORS };
