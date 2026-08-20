// tests/env-demo-mode.test.ts
// Guards fail-fast environment validation and deployment constraints
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
}

describe('envSchema production guard', () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  const AIVEN_URL =
    'postgresql://user:pass@pg-vetmart.aivencloud.com:21456/defaultdb?sslmode=require';

  it('rejects a localhost DATABASE_URL on Vercel', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DB_POOL_MAX: '1',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vetmart',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'DATABASE_URL')).toBe(true);
    }
  });

  it('rejects a missing DATABASE_URL on Vercel', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
      DB_POOL_MAX: '1',
      DATABASE_URL: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects STORAGE_DRIVER=local on Vercel (read-only filesystem)', async () => {
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      VERCEL: '1',
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
    const { envSchema } = await import('@/lib/env');

    const result = envSchema.safeParse({
      NODE_ENV: 'production',
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
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vetmart',
    });

    expect(result.success).toBe(true);
  });
});
