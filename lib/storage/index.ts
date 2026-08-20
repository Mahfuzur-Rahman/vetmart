// lib/storage/index.ts
// Storage driver interface (§4.3, §10)
import { env } from '@/lib/env';
import { cloudinaryDriver } from './cloudinary';
import { localDriver } from './local';

export type Variant = 'thumb' | 'card' | 'detail' | 'full';

export interface StorageDriver {
  put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void>;
  url(key: string, variant: Variant): string;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/** Thrown when the configured driver cannot work in the current runtime. */
export class StorageConfigError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'StorageConfigError';
  }
}

/**
 * Resolve the storage driver from configuration.
 *
 * STORAGE_DRIVER is authoritative. An earlier version treated the mere presence
 * of Cloudinary credentials as an override, so STORAGE_DRIVER=local silently
 * uploaded to Cloudinary (and vice versa was impossible to express). Both
 * failure modes now throw rather than picking a driver the operator did not ask
 * for — a wrong driver means images that other devices cannot load.
 */
export function getStorageDriver(): StorageDriver {
  if (env.STORAGE_DRIVER === 'cloudinary') {
    const configured = !!(
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    );
    if (!configured) {
      throw new StorageConfigError(
        'CLOUDINARY_NOT_CONFIGURED',
        'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and ' +
          'CLOUDINARY_API_SECRET. Set them in the deployment environment.'
      );
    }
    return cloudinaryDriver;
  }

  // Vercel's filesystem is read-only outside /tmp, and /tmp is per-instance and
  // erased when the lambda recycles. A "successful" local write there produces
  // an image only one instance can serve (§4.3).
  if (process.env.VERCEL === '1') {
    throw new StorageConfigError(
      'LOCAL_STORAGE_ON_SERVERLESS',
      "STORAGE_DRIVER=local cannot be used on Vercel: the filesystem is read-only outside /tmp " +
        'and per-instance. Set STORAGE_DRIVER=cloudinary for serverless deploys.'
    );
  }

  return localDriver;
}
