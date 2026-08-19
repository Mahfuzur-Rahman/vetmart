// lib/storage/cloudinary.ts
// Cloudinary storage driver for demo / production (§4.2)
import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/lib/env';
import type { StorageDriver, Variant } from './index';

const variantWidths: Record<Variant, number> = {
  thumb: 200,
  card: 400,
  detail: 800,
  full: 1600,
};

function getCloudinaryInstance() {
  const cloud_name = env.CLOUDINARY_CLOUD_NAME;
  const api_key = env.CLOUDINARY_API_KEY;
  const api_secret = env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Cloudinary credentials missing in environment.');
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return cloudinary;
}

export const cloudinaryDriver: StorageDriver = {
  async put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void> {
    const cld = getCloudinaryInstance();

    // Clean key for Cloudinary public_id (strip extension if any)
    const publicId = key.replace(/\.[^/.]+$/, '');

    return new Promise((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          overwrite: true,
          type: opts.private ? 'private' : 'upload',
        },
        (error, result) => {
          if (error) {
            console.error('[CloudinaryDriver] Upload error:', error);
            reject(error);
          } else {
            console.log(`[CloudinaryDriver] Uploaded ${result?.public_id || publicId}`);
            resolve();
          }
        }
      );
      uploadStream.end(buf);
    });
  },

  url(key: string, variant: Variant): string {
    if (!key) return '/images/cal-d-mag.jpg';
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) {
      return key;
    }
    const cloudName = env.CLOUDINARY_CLOUD_NAME || 'gz0m7doe';
    const width = variantWidths[variant] || 800;
    const transformation = `f_auto,q_auto,w_${width},c_limit`;
    const cleanKey = key.replace(/\.[^/.]+$/, '');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${cleanKey}`;
  },


  async signedUrl(key: string, ttlSeconds: number): Promise<string> {
    const cld = getCloudinaryInstance();
    const cleanKey = key.replace(/\.[^/.]+$/, '');
    return cld.utils.private_download_url(cleanKey, 'webp', {
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
  },

  async delete(key: string): Promise<void> {
    const cld = getCloudinaryInstance();
    const cleanKey = key.replace(/\.[^/.]+$/, '');
    try {
      const res = await cld.uploader.destroy(cleanKey, { resource_type: 'image', invalidate: true });
      console.log(`[CloudinaryDriver] Destroyed ${cleanKey}:`, res);
    } catch (err) {
      console.warn(`[CloudinaryDriver] Delete error for ${cleanKey}:`, err);
    }
  },
};
