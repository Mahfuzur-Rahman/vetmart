// app/api/v1/admin/upload/route.ts
// Admin media upload endpoint for PC and mobile product images (§4.2, §10)
import { NextRequest } from 'next/server';
import { getStorageDriver, StorageConfigError } from '@/lib/storage';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

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

    // Sanitize filename or generate slug
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1] || 'webp';
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const key = `vetmart/products/prod_${timestamp}_${rand}.${ext}`;

    const storage = getStorageDriver();
    await storage.put(key, buffer, { contentType: file.type });

    const imageUrl = storage.url(key, 'card');

    // `key` is what the caller must send back as imageKey. The DB stores the key,
    // never the URL, so the media migration stays a file copy (§4.2 rule 1, §20).
    return apiSuccess({
      key,
      url: imageUrl,
      fileName: file.name,
      size: file.size,
      contentType: file.type,
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
