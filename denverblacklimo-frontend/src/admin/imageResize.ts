/**
 * Shrinks images in the browser before they are uploaded.
 *
 * A photo straight off a phone is routinely 3–6MB and 4000px wide. Stored as-is it
 * displays correctly but makes pages slow, so we redraw it at a sensible size and
 * re-encode it. Doing this client-side means no server dependency, and the visitor
 * never waits on a multi-megabyte upload either.
 *
 * Everything here degrades safely: if anything fails, or the "optimised" version
 * comes out no smaller, the original file is uploaded untouched.
 */

/** Longest edge, in pixels. Comfortably covers a full-width hero on a 2x display. */
const MAX_EDGE = 1920

/** WebP quality. 0.82 is visually indistinguishable from the original for photos. */
const QUALITY = 0.82

/** Below this, an image is already light enough to leave alone. */
const ALREADY_SMALL_BYTES = 300 * 1024

export type PreparedImage = {
  /** The file to upload — either a smaller version or the original. */
  file: File
  /** True when we actually produced a smaller file. */
  optimised: boolean
  originalBytes: number
  finalBytes: number
  /** Pixel dimensions of the uploaded image, when known. */
  width?: number
  height?: number
}

const untouched = (file: File): PreparedImage => ({
  file,
  optimised: false,
  originalBytes: file.size,
  finalBytes: file.size,
})

/** Encodes the canvas, preferring WebP and falling back to JPEG where it isn't supported. */
async function encode(canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: string } | null> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

  const webp = await toBlob('image/webp')
  // A browser without WebP encoding silently hands back a PNG, which is far larger
  // than the source for photos — detect that and use JPEG instead.
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }

  const jpeg = await toBlob('image/jpeg')
  if (jpeg && jpeg.type === 'image/jpeg') return { blob: jpeg, ext: 'jpg' }

  return null
}

function renameTo(name: string, ext: string) {
  return `${name.replace(/\.[^.]+$/, '')}.${ext}`
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  // Animated GIFs would lose their animation when redrawn, and SVG is vector —
  // resizing either one makes it worse, not better.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return untouched(file)
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return untouched(file)

  let bitmap: ImageBitmap | undefined
  try {
    // `from-image` applies the EXIF rotation, otherwise portrait phone photos
    // come out on their side once drawn to a canvas.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const longestEdge = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, MAX_EDGE / longestEdge)

    // Already modest in both dimensions and file size — nothing worth doing.
    if (scale === 1 && file.size <= ALREADY_SMALL_BYTES) {
      return { ...untouched(file), width: bitmap.width, height: bitmap.height }
    }

    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return untouched(file)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    const encoded = await encode(canvas)
    if (!encoded) return untouched(file)

    // Re-encoding can enlarge an already well-compressed file. Keep whichever is smaller.
    if (encoded.blob.size >= file.size) {
      return { ...untouched(file), width: bitmap.width, height: bitmap.height }
    }

    const optimisedFile = new File([encoded.blob], renameTo(file.name, encoded.ext), {
      type: encoded.blob.type,
      lastModified: Date.now(),
    })

    return {
      file: optimisedFile,
      optimised: true,
      originalBytes: file.size,
      finalBytes: optimisedFile.size,
      width,
      height,
    }
  } catch {
    // Corrupt file, unsupported codec, out of memory — upload the original and let
    // the server's own limits have the final say.
    return untouched(file)
  } finally {
    bitmap?.close()
  }
}

/** "4.2MB", "210KB" — for telling the admin what happened. */
export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}
