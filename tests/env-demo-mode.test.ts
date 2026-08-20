// tests/env-demo-mode.test.ts
// Guards the two silent-failure mechanisms that hid the Vercel persistence bug:
//   1. demo mode being *inferred* from a misconfigured DATABASE_URL (§4.3)
//   2. a localhost DATABASE_URL surviving into a production deploy (§4.3 fail-fast)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
}

describe('isDemoMode()', () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  it('crashes at boot on Vercel with a localhost DATABASE_URL instead of silently demoing', async () => {
    // This is the exact production misconfiguration that hid the bug. It must
    // surface as a hard boot failure, NOT degrade into demo mode serving mock
    // data while the admin's writes are accepted and dropped.
    process.env.VERCEL = '1';
    process.env.DEMO_MODE = 'false';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/vetmart';

    await expect(import('@/lib/demo')).rejects.toThrow('Invalid environment variables');
  });

  it('is false on Vercel with a valid remote DATABASE_URL and DEMO_MODE=false', async () => {
    process.env.VERCEL = '1';
    process.env.DEMO_MODE = 'false';
    process.env.DB_POOL_MAX = '1';
    process.env.STORAGE_DRIVER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_API_KEY = '123456789';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.DATABASE_URL =
      'postgresql://user:pass@pg-vetmart.aivencloud.com:21456/defaultdb?sslmode=require';

    const { isDemoMode } = await import('@/lib/demo');
    expect(isDemoMode()).toBe(false);
  });

  it('is true only when DEMO_MODE is explicitly set to true', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/vetmart';

    const { isDemoMode } = await import('@/lib/demo');
    expect(isDemoMode()).toBe(true);
  });

  it('stays in demo mode on Vercel even with a localhost DATABASE_URL when DEMO_MODE=true', async () => {
    // Demo mode never touches the database, so the same-host URL is irrelevant.
    // Storage still has to be Cloudinary — Vercel's disk is read-only either way.
    process.env.VERCEL = '1';
    process.env.DEMO_MODE = 'true';
    process.env.DB_POOL_MAX = '1';
    process.env.STORAGE_DRIVER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_API_KEY = '123456789';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/vetmart';

    const { isDemoMode } = await import('@/lib/demo');
    expect(isDemoMode()).toBe(true);
  });
});

describe('envSchema production guard', () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  const AIVEN_URL =
    'postgresql://user:pass@pg-vetmart.aivencloud.com:21456/defaultdb?sslmode=require';

  it('rejects a localhost DATABASE_URL on Vercel with demo mode off', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '1',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vetmart',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'DATABASE_URL')).toBe(true);
    }
  });

  it('rejects a missing DATABASE_URL on Vercel with demo mode off', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '1',
    });

    expect(result.success).toBe(false);
  });

  it('rejects STORAGE_DRIVER=local on Vercel (read-only filesystem)', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '1',
      STORAGE_DRIVER: 'local',
      DATABASE_URL: AIVEN_URL,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'STORAGE_DRIVER')).toBe(true);
    }
  });

  it('rejects a multi-connection pool on Vercel (§4.2 rule 3)', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '20',
      DATABASE_URL: AIVEN_URL,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'DB_POOL_MAX')).toBe(true);
    }
  });

  it('accepts a correctly configured Vercel deploy', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '1',
      STORAGE_DRIVER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: '123456789',
      CLOUDINARY_API_SECRET: 'secret',
      DATABASE_URL: AIVEN_URL,
    });

    expect(result.success).toBe(true);
  });

  it('still allows a same-host DATABASE_URL on the BDIX VPS (§4.1)', async () => {
    // Production on the VPS runs Postgres on the same box by design. The guard
    // must not fire here — only on Vercel, where there is no local Postgres.
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
      DB_POOL_MAX: '20',
      STORAGE_DRIVER: 'local',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vetmart',
    });

    expect(result.success).toBe(true);
  });

  it('still allows a localhost DATABASE_URL in local development', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      NODE_ENV: 'development',
      DEMO_MODE: 'false',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vetmart',
    });

    expect(result.success).toBe(true);
  });
});
