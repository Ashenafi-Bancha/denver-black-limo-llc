/**
 * Centralized image configuration for Denver Black Limo.
 *
 * HOW IT WORKS:
 * - Locally (no env var set): serves optimized WebP images from /public/images/
 * - With Cloudinary (VITE_CLOUDINARY_CLOUD_NAME set): serves images from Cloudinary CDN
 *   with automatic format selection (WebP/AVIF) and quality optimization.
 *
 * TO USE CLOUDINARY:
 * 1. Sign up free at https://cloudinary.com
 * 2. Upload each .webp file from public/images/ to your Cloudinary Media Library
 *    (you can organize them under a folder, e.g., "denver-black-limo/")
 * 3. Add to denverblacklimo-frontend/.env.local:
 *    VITE_CLOUDINARY_CLOUD_NAME="your_cloud_name_here"
 * 4. Update the CLOUDINARY_IDS below to match the public IDs in your Cloudinary account
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined

/** Build a Cloudinary URL with auto format + quality optimization */
function cloudinaryUrl(publicId: string, width?: number): string {
  const transforms = width
    ? `f_auto,q_auto,w_${width},c_limit`
    : `f_auto,q_auto`
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`
}

/**
 * Cloudinary public IDs — update these to match the names you used when
 * uploading to Cloudinary. Format: "folder/filename" (no extension needed).
 */
const CLOUDINARY_IDS = {
  hero1: 'denver-black-limo/hero1',
  hero2: 'denver-black-limo/hero2',
  logo: 'denver-black-limo/logo',
  mucho: 'denver-black-limo/mucho',
}

/** All image URLs used across the site */
export const IMAGES = CLOUD_NAME
  ? {
      // Cloudinary CDN — auto WebP/AVIF, globally cached, resized on the fly
      hero1: cloudinaryUrl(CLOUDINARY_IDS.hero1, 1920),
      hero2: cloudinaryUrl(CLOUDINARY_IDS.hero2, 1920),
      logo: cloudinaryUrl(CLOUDINARY_IDS.logo, 400),
      mucho: cloudinaryUrl(CLOUDINARY_IDS.mucho, 800),
    }
  : {
      // Local files (optimized, served from /public/images/)
      hero1: '/images/hero1.webp',
      hero2: '/images/hero2.webp',
      logo: '/images/logo.png',
      mucho: '/images/mucho.webp',
    }
