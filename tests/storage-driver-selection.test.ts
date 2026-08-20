// tests/storage-driver-selection.test.ts
// STORAGE_DRIVER must mean what it says (§4.3). Previously, having Cloudinary
// credentials present silently overrode an explicit STORAGE_DRIVER=local, and
// the local driver's fs.writeFile was reachable on Vercel's read-only disk.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.VERCEL;
  delete process.env.STORAGE_DRIVER;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  vi.resetModules();
  vi.doUnmock('@/lib/env');
}

const CLOUDINARY_CREDS = {
  CLOUDINARY_CLOUD_NAME: 'demo-cloud',
  CLOUDINARY_API_KEY: '123456789',
  CLOUDINARY_API_SECRET: 'secret',
};

describe('getStorageDriver()', () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  it('honours an explicit STORAGE_DRIVER=local even when Cloudinary creds are present', async () => {
    process.env.STORAGE_DRIVER = 'local';
    Object.assign(process.env, CLOUDINARY_CREDS);

    const { getStorageDriver } = await import('@/lib/storage');
    // The local driver serves from a /media path; Cloudinary emits res.cloudinary.com.
    expect(getStorageDriver().url('vetmart/products/x', 'card')).toContain('/media/');
  });

  it('uses Cloudinary when STORAGE_DRIVER=cloudinary', async () => {
    process.env.STORAGE_DRIVER = 'cloudinary';
    Object.assign(process.env, CLOUDINARY_CREDS);

    const { getStorageDriver } = await import('@/lib/storage');
    expect(getStorageDriver().url('vetmart/products/x', 'card')).toContain('res.cloudinary.com');
  });

  // The two cases below are also rejected by lib/env.ts at boot (see
  // tests/env-demo-mode.test.ts). These assert the storage module's own guard,
  // the second layer, so the driver stays safe if it is ever constructed with
  // an env object that skipped validation.

  it('throws a named error when the local driver would be used on Vercel', async () => {
    // Vercel's filesystem is read-only outside /tmp, and /tmp is per-instance.
    // Writing there produces images that only one lambda can see.
    process.env.VERCEL = '1';
    vi.doMock('@/lib/env', () => ({ env: { STORAGE_DRIVER: 'local' } }));

    const { getStorageDriver } = await import('@/lib/storage');
    expect(() => getStorageDriver()).toThrow(/LOCAL_STORAGE_ON_SERVERLESS/);
  });

  it('never silently falls back to the local driver when Cloudinary creds are missing', async () => {
    vi.doMock('@/lib/env', () => ({ env: { STORAGE_DRIVER: 'cloudinary' } }));

    const { getStorageDriver } = await import('@/lib/storage');
    expect(() => getStorageDriver()).toThrow(/CLOUDINARY_NOT_CONFIGURED/);
  });
});
