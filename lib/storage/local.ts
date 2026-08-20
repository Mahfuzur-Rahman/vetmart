// lib/storage/local.ts
// Local disk storage driver for production BDIX VPS (§4.1, §10)
import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageDriver, Variant } from './index';

const MEDIA_ROOT = process.env.LOCAL_MEDIA_PATH || path.join(process.cwd(), 'public', 'media');

export const localDriver: StorageDriver = {
  async put(key: string, buf: Buffer, _opts: { contentType: string; private?: boolean }): Promise<void> {
    const fullPath = path.join(/*turbopackIgnore: true*/ MEDIA_ROOT, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buf);
  },

  url(key: string, variant: Variant): string {
    // For local files served by Caddy/Next.js public
    return `/media/${key}/${variant}.webp`;
  },

  async signedUrl(key: string, _ttlSeconds: number): Promise<string> {
    // Local private storage signed token URL placeholder
    return `/api/v1/media/private/${encodeURIComponent(key)}`;
  },

  async delete(key: string): Promise<void> {
    const fullPath = path.join(/*turbopackIgnore: true*/ MEDIA_ROOT, key);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Ignored if already deleted
    }
  },
};
