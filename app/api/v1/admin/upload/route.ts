// app/api/v1/admin/upload/route.ts
// Admin media upload endpoint for PC and mobile product images (§4.2, §10)
import { NextRequest } from 'next/server';
import { getStorageDriver, StorageConfigError } from '@/lib/storage';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

/**
 * SVG is deliberately absent.
 *
 * An SVG is a script-bearing document, and uploads are served back from the
 * app's own origin (`/media/...` behind Caddy, per §10), so accepting one was a
 * stored-XSS upload for anyone holding `product.write`.
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Magic-byte signatures, because §10 requires the real type to be checked and
 * `file.type` is just a client-supplied header — renaming `payload.svg` to
 * `.png` and sending `Content-Type: image/png` passed the old check.
 */
const MAGIC_BYTES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  { mime: 'image/gif', test: (b) => b.subarray(0, 6).toString('latin1').startsWith('GIF8') },
  {
    mime: 'image/webp',
    test: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    // AVIF and other ISO-BMFF images carry the brand in the `ftyp` box.
    mime: 'image/avif',
    test: (b) =>
      b.subarray(4, 8).toString('latin1') === 'ftyp' &&
      /avif|avis|mif1|msf1/.test(b.subarray(8, 20).toString('latin1')),
  },
];

/** The image type the bytes actually are, or null if they are not an image. */
function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 16) return null;
  for (const candidate of MAGIC_BYTES) {
    if (candidate.test(buffer)) return candidate.mime;
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Unauthenticated uploads let anyone fill the Cloudinary account.
  const guard = await requireAdmin('product.write');
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return apiError('MISSING_FILE', 'No image file provided in upload request', 400, 'file');
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError(
        'INVALID_MIME_TYPE',
        `Unsupported file type "${file.type}". Allowed formats: JPEG, PNG, WebP, GIF, AVIF, SVG.`,
        400,
        'file'
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError(
        'FILE_TOO_LARGE',
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit`,
        400,
        'file'
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Trust the bytes, not the declared Content-Type (§10).
    const actualMime = sniffImageMime(buffer);
    if (!actualMime || !ALLOWED_MIME_TYPES.has(actualMime)) {
      return apiError(
        'INVALID_IMAGE_CONTENT',
        'The uploaded file is not a JPEG, PNG, WebP, GIF or AVIF image.',
        400,
        'file'
      );
    }

    // The key's extension follows the sniffed type, so a mislabelled upload
    // cannot be stored under a name that says something else.
    const ext = actualMime === 'image/jpeg' ? 'jpg' : actualMime.split('/')[1];
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const key = `vetmart/products/prod_${timestamp}_${rand}.${ext}`;

    const storage = getStorageDriver();
    await storage.put(key, buffer, { contentType: actualMime });

    const imageUrl = storage.url(key, 'card');

    // `key` is what the caller must send back as imageKey. The DB stores the key,
    // never the URL, so the media migration stays a file copy (§4.2 rule 1, §20).
    return apiSuccess({
      key,
      url: imageUrl,
      fileName: file.name,
      size: file.size,
      contentType: actualMime,
    });
  } catch (err: any) {
    // A misconfigured driver is an operator problem, not a bad request. Say which
    // one, rather than returning a generic 500 the admin UI cannot act on.
    if (err instanceof StorageConfigError) {
      console.error('[Admin Upload API] Storage driver misconfigured:', err);
      return apiError(err.code, err.message, 503);
    }

    console.error('[Admin Upload API] Error uploading file:', err);
    return apiError('UPLOAD_FAILED', err?.message || 'Failed to upload product image', 500);
  }
}
