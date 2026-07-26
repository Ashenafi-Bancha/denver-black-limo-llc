/**
 * Denver Black Limo – Image Optimization Script
 * Converts all images in public/images/ to WebP format using sharp.
 * Run with: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT_DIR = path.join(__dirname, '..', 'public', 'images');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images');

// Conversion settings per image type
const configs = [
  {
    input: 'hero1.jpg',
    output: 'hero1.webp',
    options: { quality: 82, width: 1920 },
  },
  {
    input: 'hero2.jpg',
    output: 'hero2.webp',
    options: { quality: 82, width: 1920 },
  },
  {
    input: 'logo.jpg',
    output: 'logo.webp',
    options: { quality: 90, width: 400 },
  },
  {
    input: 'mucho.jpg',
    output: 'mucho.webp',
    options: { quality: 80, width: 800 },
  },
  // Large architecture PNGs — compress but keep as webp for web use
  {
    input: 'denver sytem architecure.png',
    output: 'architecture.webp',
    options: { quality: 75, width: 1400 },
  },
  {
    input: 'system_architecture.png',
    output: 'system-architecture.webp',
    options: { quality: 75, width: 1400 },
  },
];

async function optimizeImages() {
  console.log('🖼️  Denver Black Limo – Image Optimizer\n');
  let totalSaved = 0;

  for (const cfg of configs) {
    const inputPath = path.join(INPUT_DIR, cfg.input);
    const outputPath = path.join(OUTPUT_DIR, cfg.output);

    if (!fs.existsSync(inputPath)) {
      console.warn(`  ⚠️  Skipping (not found): ${cfg.input}`);
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;

    try {
      await sharp(inputPath)
        .resize({ width: cfg.options.width, withoutEnlargement: true })
        .webp({ quality: cfg.options.quality })
        .toFile(outputPath);

      const newSize = fs.statSync(outputPath).size;
      const saved = originalSize - newSize;
      const savedPct = ((saved / originalSize) * 100).toFixed(1);
      totalSaved += Math.max(0, saved);

      const originalKB = (originalSize / 1024).toFixed(1);
      const newKB = (newSize / 1024).toFixed(1);

      console.log(`  ✅  ${cfg.input}`);
      console.log(`      ${originalKB} KB  →  ${newKB} KB  (${savedPct}% smaller)\n`);
    } catch (err) {
      console.error(`  ❌  Failed: ${cfg.input} — ${err.message}\n`);
    }
  }

  const totalKB = (totalSaved / 1024).toFixed(0);
  console.log(`────────────────────────────────────`);
  console.log(`🎉  Total bandwidth saved: ~${totalKB} KB`);
  console.log(`\nNext step: Upload the .webp files from public/images/ to Cloudinary.`);
}

optimizeImages();
