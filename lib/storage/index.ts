// lib/storage/index.ts
// Storage driver interface (§4.3, §10)
import { env } from '@/lib/env';

export type Variant = 'thumb' | 'card' | 'detail' | 'full';

export interface StorageDriver {
  put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void>;
  url(key: string, variant: Variant): string;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export function getStorageDriver(): StorageDriver {
  switch (env.STORAGE_DRIVER) {
    case 'cloudinary': {
      const { cloudinaryDriver } = require('./cloudinary');
      return cloudinaryDriver;
    }
    case 'local': {
      const { localDriver } = require('./local');
      return localDriver;
    }
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}
