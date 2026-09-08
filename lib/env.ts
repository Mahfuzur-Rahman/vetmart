import { z } from 'zod';

const storageDrivers = ['local', 'cloudinary'] as const;
const queueDrivers = ['bullmq', 'pg-cron'] as const;
const pdfDrivers = ['playwright', 'html-print'] as const;
const courierDrivers = ['mock', 'steadfast'] as const;
const smsDrivers = ['mock', 'bulksms'] as const;
const paymentModes = ['sandbox', 'live'] as const;

/**
 * Matches a DATABASE_URL that can only resolve on the same machine as the app.
 *
 * This is CORRECT on the BDIX VPS (§4.1 — Postgres runs on the same box, over a
 * Unix socket) and always WRONG on Vercel, where a serverless function has no
 * local Postgres. Only the Vercel case is treated as an error below.
 */
export function isSameHostDatabaseUrl(url: string | undefined): boolean {
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('[::1]') ||
    url.startsWith('postgresql:///') ||
    url.startsWith('postgres:///')
  );
}

/**
 * The development fallbacks for the two signing secrets.
 *
 * They are committed to the repository, so anything they protect is public.
 * Booting production with either of them lets anyone forge a customer session
 * cookie — or an admin one, since `setAdminSession` signs `{role:'admin'}` with
 * the same key. The superRefine below refuses to start in that state (§4.3
 * "fails fast — a missing var must crash the build").
 */
export const DEV_AUTH_SECRET = 'dev-auth-secret-super-safe-32-chars-long-vetmart';
export const DEV_JWT_SECRET = 'dev-jwt-secret-super-safe-32-chars-long-vetmart';

export const envSchema = z.object({
  /** Set to "1" by the Vercel build and runtime. Absent locally and on the VPS. */
  VERCEL: z.string().optional(),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/vetmart'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),

  // Drivers (§4.3)
  STORAGE_DRIVER: z.enum(storageDrivers).default('local'),
  QUEUE_DRIVER: z.enum(queueDrivers).default('bullmq'),
  PDF_DRIVER: z.enum(pdfDrivers).default('html-print'),
  COURIER_DRIVER: z.enum(courierDrivers).default('mock'),
  SMS_DRIVER: z.enum(smsDrivers).default('mock'),
  PAYMENT_MODE: z.enum(paymentModes).default('sandbox'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Auth
  AUTH_SECRET: z
    .string()
    .min(1, 'AUTH_SECRET is required')
    .default(DEV_AUTH_SECRET),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET is required')
    .default(DEV_JWT_SECRET),
  OTP_TTL_SECONDS: z.coerce.number().int().default(180),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().default(60),

  // Valkey / Redis
  VALKEY_URL: z.string().default('redis://localhost:6379'),

  // Cloudinary (required only when STORAGE_DRIVER=cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Steadfast (required only when COURIER_DRIVER=steadfast)
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: z.string().optional(),
  STEADFAST_BASE_URL: z
    .string()
    .url()
    .default('https://portal.packzy.com/api/v1'),

  // SSLCommerz
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_BASE_URL: z.string().optional(),

  // SMS
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  JOBS_DRAIN_SECRET: z.string().optional(),

  /**
   * Shared secret the courier must present on its status webhook.
   *
   * Steadfast publishes no request signature, so a secret the caller echoes
   * back is the available control. Without it the webhook is an open endpoint
   * that can move any order to `delivered` or `returned`.
   */
  COURIER_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((data, ctx) => {
  // Refuse to run any non-development deploy on the repository's own signing
  // secrets. A forged `{sub, role:'admin', type:'access'}` JWT is a full admin
  // takeover, and the fallback value is readable by anyone with the source.
  const isDeployed = data.NODE_ENV === 'production' || data.VERCEL === '1';
  if (isDeployed) {
    const secrets: Array<[keyof typeof data, string, string]> = [
      ['AUTH_SECRET', data.AUTH_SECRET, DEV_AUTH_SECRET],
      ['JWT_SECRET', data.JWT_SECRET, DEV_JWT_SECRET],
    ];

    for (const [name, value, devDefault] of secrets) {
      if (value === devDefault) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `${name} is still the development default committed to this repository. ` +
            'Anyone can forge a session — including an admin session — with it. ' +
            `Generate one with \`openssl rand -base64 48\` and set ${name} in the deploy environment.`,
          path: [name as string],
        });
      } else if (value.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} must be at least 32 characters in a deployed environment (got ${value.length}).`,
          path: [name as string],
        });
      }
    }
  }

  // §4.3 fail-fast: a serverless deploy pointed at a same-host database can never
  // connect. Crash instead.
  if (data.VERCEL === '1' && isSameHostDatabaseUrl(data.DATABASE_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'DATABASE_URL points at the same host (localhost/socket) but the app is running on Vercel, ' +
        'where no local Postgres exists. Set DATABASE_URL to the Aiven pooled (PgBouncer) connection ' +
        'string in the Vercel project settings.',
      path: ['DATABASE_URL'],
    });
  }

  // Serverless must use the PgBouncer-friendly pool size (§4.2 rule 3).
  if (data.VERCEL === '1' && data.DB_POOL_MAX > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `DB_POOL_MAX=${data.DB_POOL_MAX} on Vercel will exhaust Aiven's connection cap. ` +
        'Set DB_POOL_MAX=1 for serverless; the pool of 20 is for the VPS only.',
      path: ['DB_POOL_MAX'],
    });
  }

  // Local disk storage cannot work on Vercel's read-only filesystem (§4.3).
  if (data.VERCEL === '1' && data.STORAGE_DRIVER === 'local') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "STORAGE_DRIVER=local writes to disk, but Vercel's filesystem is read-only outside /tmp " +
        'and per-instance. Set STORAGE_DRIVER=cloudinary for the Vercel deploy.',
      path: ['STORAGE_DRIVER'],
    });
  }

  // Cloudinary vars required when using cloudinary driver
  if (data.STORAGE_DRIVER === 'cloudinary') {
    if (!data.CLOUDINARY_CLOUD_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CLOUDINARY_CLOUD_NAME is required when STORAGE_DRIVER=cloudinary',
        path: ['CLOUDINARY_CLOUD_NAME'],
      });
    }
    if (!data.CLOUDINARY_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CLOUDINARY_API_KEY is required when STORAGE_DRIVER=cloudinary',
        path: ['CLOUDINARY_API_KEY'],
      });
    }
    if (!data.CLOUDINARY_API_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CLOUDINARY_API_SECRET is required when STORAGE_DRIVER=cloudinary',
        path: ['CLOUDINARY_API_SECRET'],
      });
    }
  }

  // Steadfast vars required when using steadfast driver
  if (data.COURIER_DRIVER === 'steadfast') {
    if (!data.STEADFAST_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'STEADFAST_API_KEY is required when COURIER_DRIVER=steadfast',
        path: ['STEADFAST_API_KEY'],
      });
    }
    if (!data.STEADFAST_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'STEADFAST_SECRET_KEY is required when COURIER_DRIVER=steadfast',
        path: ['STEADFAST_SECRET_KEY'],
      });
    }
  }

  // A live courier with an unauthenticated status webhook lets anyone flip an
  // order to delivered/returned, which closes COD reconciliation on a lie.
  if (data.COURIER_DRIVER === 'steadfast' && !data.COURIER_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'COURIER_WEBHOOK_SECRET is required when COURIER_DRIVER=steadfast. Configure the same ' +
        'value in the courier portal callback URL (?token=...) or as an x-courier-webhook-secret header.',
      path: ['COURIER_WEBHOOK_SECRET'],
    });
  }

  if (
    data.SMS_DRIVER === 'mock' &&
    data.NODE_ENV === 'production'
  ) {
    console.warn(
      '⚠️ Warning: SMS_DRIVER=mock is running in production. SMS messages will be logged to server console.'
    );
  }
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(
      JSON.stringify(result.error.flatten().fieldErrors, null, 2)
    );
    throw new Error(
      'Invalid environment variables — see above for details. Fix .env.local and restart.'
    );
  }
  return result.data;
}

export const env = validateEnv();
