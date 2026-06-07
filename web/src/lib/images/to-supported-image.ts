const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Normalize a user-picked image to a format the API/AI accept.
 *
 * iPhone photos (HEIC/HEIF) are converted to JPEG in the browser so uploads
 * "from my phone" work everywhere — not just on iOS Safari (which auto-converts
 * on pick). Already-supported types pass through unchanged. Throws
 * `UNSUPPORTED_IMAGE` for anything we can't handle so the caller can show a
 * clear message.
 *
 * The heavy HEIC decoder is dynamically imported only when actually needed, so
 * it never weighs down the normal JPEG/PNG path or the initial bundle.
 */
export async function toSupportedImage(file: File): Promise<File> {
  if (SUPPORTED.includes(file.type)) return file;

  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import('heic2any')).default as (
      opts: { blob: Blob; toType?: string; quality?: number },
    ) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  }

  throw new Error('UNSUPPORTED_IMAGE');
}
