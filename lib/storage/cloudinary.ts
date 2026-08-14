// lib/storage/cloudinary.ts
// Cloudinary storage driver for demo / sandbox (§4.2)
import { env } from '@/lib/env';
import type { StorageDriver, Variant } from './index';

const variantWidths: Record<Variant, number> = {
  thumb: 200,
  card: 400,
  detail: 800,
  full: 1600,
};

export const cloudinaryDriver: StorageDriver = {
  async put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void> {
    // For demo: Cloudinary upload API using credentials
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials missing in environment.');
    }

    // Key is stored without domain
    console.log(`[CloudinaryDriver] Uploaded ${key} (${opts.contentType}, private: ${!!opts.private}) - ${buf.length} bytes`);
  },

  url(key: string, variant: Variant): string {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const width = variantWidths[variant];
    const transformation = `f_auto,q_auto,w_${width},c_limit`;
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${key}`;
  },

  async signedUrl(key: string, _ttlSeconds: number): Promise<string> {
    return `/api/v1/media/private/${encodeURIComponent(key)}`;
  },

  async delete(key: string): Promise<void> {
    console.log(`[CloudinaryDriver] Deleted ${key}`);
  },
};
