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

export function getStorageDriver(): StorageDriver {
  const isCloudinaryConfigured = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  if (env.STORAGE_DRIVER === 'cloudinary' || isCloudinaryConfigured) {
    return cloudinaryDriver;
  }
  return localDriver;
}


