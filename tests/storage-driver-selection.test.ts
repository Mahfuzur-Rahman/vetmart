// tests/storage-driver-selection.test.ts
// STORAGE_DRIVER must mean what it says (§4.3). Previously, having Cloudinary
// credentials present silently overrode an explicit STORAGE_DRIVER=local, and
// the local driver's fs.writeFile was reachable on Vercel's read-only disk.
//
// Every case mocks '@/lib/env' directly rather than setting process.env and
// letting the env singleton re-parse it. Going through the singleton made these
// tests depend on module-load ordering, which made them intermittently fail in
// a full-suite run.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function reset() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.VERCEL;
  vi.resetModules();
  vi.doUnmock('@/lib/env');
}

const CLOUDINARY_CREDS = {
  CLOUDINARY_CLOUD_NAME: 'demo-cloud',
  CLOUDINARY_API_KEY: '123456789',
  CLOUDINARY_API_SECRET: 'secret',
};

/** Load lib/storage with a stubbed env module. */
async function loadStorageWith(env: Record<string, unknown>) {
  vi.doMock('@/lib/env', () => ({ env }));
  return import('@/lib/storage');
}

describe('getStorageDriver()', () => {
  beforeEach(reset);
  afterEach(reset);

  it('honours an explicit STORAGE_DRIVER=local even when Cloudinary creds are present', async () => {
    const { getStorageDriver } = await loadStorageWith({
      STORAGE_DRIVER: 'local',
      ...CLOUDINARY_CREDS,
    });

    // The local driver serves from a /media path; Cloudinary emits res.cloudinary.com.
    expect(getStorageDriver().url('vetmart/products/x', 'card')).toContain('/media/');
  });

  it('uses Cloudinary when STORAGE_DRIVER=cloudinary', async () => {
    const { getStorageDriver } = await loadStorageWith({
      STORAGE_DRIVER: 'cloudinary',
      ...CLOUDINARY_CREDS,
    });

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
    const { getStorageDriver } = await loadStorageWith({ STORAGE_DRIVER: 'local' });

    expect(() => getStorageDriver()).toThrow(/LOCAL_STORAGE_ON_SERVERLESS/);
  });

  it('never silently falls back to the local driver when Cloudinary creds are missing', async () => {
    const { getStorageDriver } = await loadStorageWith({ STORAGE_DRIVER: 'cloudinary' });

    expect(() => getStorageDriver()).toThrow(/CLOUDINARY_NOT_CONFIGURED/);
  });
});
