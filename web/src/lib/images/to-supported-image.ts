const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIM = 1600;        // longest edge after downscale
const JPEG_QUALITY = 0.85;
const RESIZE_ABOVE = 4 * 1024 * 1024; // re-encode anything bigger than this too

/**
 * Normalize a user-picked image for upload/AI:
 *  1. Convert iPhone HEIC/HEIF to JPEG (browser-side) so phone photos work.
 *  2. Downscale very large photos (phone cameras produce 4–12 MB files) to a
 *     reasonable JPEG so they fit under the 5 MB API limit and the AI scan is
 *     fast — this is the usual cause of "File too large" / failed scans.
 *
 * Already-small supported images pass through untouched. Throws
 * `UNSUPPORTED_IMAGE` for formats we can't handle so callers can show a clear
 * message. The heavy HEIC decoder is imported only when needed.
 */
export async function toSupportedImage(file: File): Promise<File> {
  let working = file;

  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import('heic2any')).default as (
      opts: { blob: Blob; toType?: string; quality?: number },
    ) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    working = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } else if (!SUPPORTED.includes(file.type)) {
    throw new Error('UNSUPPORTED_IMAGE');
  }

  try {
    const resized = await downscale(working);
    if (resized) return resized;
  } catch {
    /* fall back to the (possibly converted) original */
  }
  return working;
}

async function downscale(file: File): Promise<File | null> {
  if (typeof document === 'undefined') return null;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  // Nothing to do for small images that are also small on disk.
  if (scale === 1 && file.size <= RESIZE_ABOVE) return null;

  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return null;

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
