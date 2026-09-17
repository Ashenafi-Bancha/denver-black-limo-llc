/**
 * PWA icons, generated from the logo that is already in the repository.
 *
 * The source is public/images/logo-512.png — the real 512px PNG, not
 * public/images/logo.png, which is JPEG data under a .png name and which some
 * tools reject outright.
 *
 * Two shapes are produced because Android uses them differently:
 *
 *   - "any" icons are drawn as supplied. The logo fills the square.
 *   - "maskable" icons are cropped by the launcher to whatever shape the phone
 *     uses — circle, squircle, rounded square. Android guarantees only the
 *     middle 80% survives, so the logo is scaled to 64% of the canvas on the
 *     brand black. Supplying the plain logo as maskable is the usual mistake:
 *     the launcher crops straight through the crest.
 *
 * Run with `npm run icons`. The output is committed, so a normal build and
 * deploy needs neither sharp nor this script.
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(ROOT, '..', 'public')
const SRC = path.join(PUBLIC, 'images', 'logo-512.png')
const OUT = path.join(PUBLIC, 'icons')

/** The brand black the manifest and the splash screen also use. */
const BRAND_BLACK = { r: 10, g: 10, b: 10, alpha: 1 }

if (!fs.existsSync(SRC)) {
  console.error(`Source logo not found at ${SRC}`)
  process.exit(1)
}
fs.mkdirSync(OUT, { recursive: true })

/** The logo at its natural size on the brand ground, for "any" icons. */
async function plain(size, file) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: BRAND_BLACK })
    .flatten({ background: BRAND_BLACK })
    .png()
    .toFile(path.join(OUT, file))
  return file
}

/** Padded so a launcher's mask cannot cut into the crest. */
async function maskable(size, file) {
  const inner = Math.round(size * 0.64)
  const pad = Math.round((size - inner) / 2)
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: BRAND_BLACK }).toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BLACK },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toFile(path.join(OUT, file))
  return file
}

const written = []
written.push(await plain(192, 'icon-192.png'))
written.push(await plain(512, 'icon-512.png'))
written.push(await maskable(192, 'maskable-192.png'))
written.push(await maskable(512, 'maskable-512.png'))
// iOS ignores the manifest and reads apple-touch-icon. It also composites onto
// white when the icon has alpha, so this one is flattened like the rest.
written.push(await plain(180, 'apple-touch-icon.png'))

for (const f of written) {
  const { size } = fs.statSync(path.join(OUT, f))
  console.log(`  ${f.padEnd(24)} ${(size / 1024).toFixed(1)} kB`)
}
console.log(`✔ ${written.length} PWA icons written to public/icons from logo-512.png`)
