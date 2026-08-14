# SP-1: Foundation & Project Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize VetMart as a Next.js 15 project with TypeScript strict, Drizzle ORM, driver interfaces, env validation, i18n with Bangla numerals, and dev tooling.

**Architecture:** Next.js 15 App Router, single process serving storefront + admin + API. All external services behind driver interfaces selected by env. Bangla-first bilingual routing via next-intl.

**Tech Stack:** Next.js 15, TypeScript strict, Drizzle ORM + postgres-js, Tailwind CSS + shadcn/ui, next-intl, Zod, sharp, Valkey

## Global Constraints

- TypeScript `strict: true` — no `any`, no implicit any
- All money as integer paisa (never float), `numeric(12,2)` in Postgres
- All timestamps `timestamptz`, stored UTC, rendered `Asia/Dhaka`
- Bangla is default locale, not a translation layer
- No external service imported directly — everything behind a driver interface
- `pnpm` as package manager
- Node 22+

---

### Task 1: Initialize Next.js 15 Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `.env.local`

**Produces:** Working Next.js 15 project shell with TypeScript strict

- [ ] **Step 1: Initialize Next.js 15 with pnpm**

```bash
pnpm dlx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --use-pnpm
```

Note: If the directory is not empty, we'll need to use `--yes` or handle it. The CLAUDE.md, AGENTS.md, and agent dirs should be preserved.

- [ ] **Step 2: Verify TypeScript strict mode**

Ensure `tsconfig.json` has `"strict": true`. Next.js 15 sets this by default.

- [ ] **Step 3: Configure `next.config.ts` for standalone output**

```ts
// next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Create `.env.example` with all driver vars from §4.3**

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vetmart
DB_POOL_MAX=20

# Drivers (§4.3)
STORAGE_DRIVER=local        # local | cloudinary
QUEUE_DRIVER=bullmq         # bullmq | pg-cron
PDF_DRIVER=playwright       # playwright | html-print
COURIER_DRIVER=mock         # mock | steadfast
SMS_DRIVER=mock             # mock | bulksms
PAYMENT_MODE=sandbox        # sandbox | live

# Demo
DEMO_MODE=false
NODE_ENV=development

# Auth
AUTH_SECRET=
JWT_SECRET=
OTP_TTL_SECONDS=180
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

# Valkey/Redis
VALKEY_URL=redis://localhost:6379

# Cloudinary (demo only)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Steadfast (production only)
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1

# SSLCommerz
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_BASE_URL=

# SMS
SMS_API_KEY=
SMS_SENDER_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
JOBS_DRAIN_SECRET=
```

- [ ] **Step 5: Update `.gitignore`**

Ensure `.env.local`, `node_modules`, `.next`, `.vercel` are ignored. Preserve CLAUDE.md, AGENTS.md.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with TypeScript strict"
```

---

### Task 2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Produces:** All Phase 1 dependencies installed

- [ ] **Step 1: Install production dependencies**

```bash
pnpm add drizzle-orm postgres next-intl zod sharp @auth/core next-auth@beta ioredis bullmq
```

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D drizzle-kit @types/node vitest @vitejs/plugin-react
```

- [ ] **Step 3: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

- [ ] **Step 4: Add pnpm scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx scripts/seed.ts",
    "db:seed:demo": "tsx scripts/seed-demo.ts",
    "db:reset:demo": "tsx scripts/reset-demo.ts",
    "jobs": "tsx lib/jobs/worker.ts"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: install core dependencies and configure scripts"
```

---

### Task 3: Env Validation with Zod

**Files:**
- Create: `lib/env.ts`

**Produces:** `env` object that crashes at boot on any missing/invalid var

- [ ] **Step 1: Create `lib/env.ts`**

```ts
// lib/env.ts
import { z } from 'zod';

const storageDrivers = ['local', 'cloudinary'] as const;
const queueDrivers = ['bullmq', 'pg-cron'] as const;
const pdfDrivers = ['playwright', 'html-print'] as const;
const courierDrivers = ['mock', 'steadfast'] as const;
const smsDrivers = ['mock', 'bulksms'] as const;
const paymentModes = ['sandbox', 'live'] as const;

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),

  // Drivers
  STORAGE_DRIVER: z.enum(storageDrivers).default('local'),
  QUEUE_DRIVER: z.enum(queueDrivers).default('bullmq'),
  PDF_DRIVER: z.enum(pdfDrivers).default('html-print'),
  COURIER_DRIVER: z.enum(courierDrivers).default('mock'),
  SMS_DRIVER: z.enum(smsDrivers).default('mock'),
  PAYMENT_MODE: z.enum(paymentModes).default('sandbox'),

  // Demo
  DEMO_MODE: z.coerce.boolean().default(false),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Auth
  AUTH_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  OTP_TTL_SECONDS: z.coerce.number().int().default(180),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().default(60),

  // Valkey
  VALKEY_URL: z.string().default('redis://localhost:6379'),

  // Cloudinary (required only when STORAGE_DRIVER=cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Steadfast (required only when COURIER_DRIVER=steadfast)
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: z.string().optional(),
  STEADFAST_BASE_URL: z.string().url().default('https://portal.packzy.com/api/v1'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  JOBS_DRAIN_SECRET: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.STORAGE_DRIVER === 'cloudinary') {
    if (!data.CLOUDINARY_CLOUD_NAME) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CLOUDINARY_CLOUD_NAME required when STORAGE_DRIVER=cloudinary', path: ['CLOUDINARY_CLOUD_NAME'] });
    }
  }
  if (data.COURIER_DRIVER === 'steadfast') {
    if (!data.STEADFAST_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'STEADFAST_API_KEY required when COURIER_DRIVER=steadfast', path: ['STEADFAST_API_KEY'] });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See above for details.');
  }
  return result.data;
}

export const env = validateEnv();
```

- [ ] **Step 2: Commit**

```bash
git add lib/env.ts
git commit -m "feat: add Zod-validated env config with driver selection"
```

---

### Task 4: Database Client Setup

**Files:**
- Create: `lib/db/index.ts`, `drizzle.config.ts`

**Consumes:** `env.DATABASE_URL`, `env.DB_POOL_MAX`
**Produces:** `db` Drizzle instance, `sql` postgres-js client

- [ ] **Step 1: Create `lib/db/index.ts`**

```ts
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';

const isServerless = env.QUEUE_DRIVER === 'pg-cron'; // Vercel indicator

const sql = postgres(env.DATABASE_URL, {
  max: isServerless ? 1 : env.DB_POOL_MAX,
  idle_timeout: isServerless ? 20 : 0,
  connect_timeout: 10,
  prepare: isServerless ? false : true, // PgBouncer transaction mode breaks prepared statements
});

export const db = drizzle(sql);
export { sql };
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create schema directory placeholder**

```ts
// lib/db/schema/index.ts
// Schema tables will be defined in SP-2
export {};
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/ drizzle.config.ts
git commit -m "feat: add Drizzle ORM + postgres-js database client"
```

---

### Task 5: Driver Interfaces

**Files:**
- Create: `lib/storage/index.ts`, `lib/queue/index.ts`, `lib/pdf/index.ts`, `lib/courier/index.ts`, `lib/sms/index.ts`
- Create: `lib/sms/mock.ts`, `lib/courier/mock.ts`

**Consumes:** `env.STORAGE_DRIVER`, `env.QUEUE_DRIVER`, etc.
**Produces:** Driver interfaces and mock implementations for demo/dev

- [ ] **Step 1: Create `lib/storage/index.ts`**

```ts
// lib/storage/index.ts
export type Variant = 'thumb' | 'card' | 'detail' | 'full';

export interface StorageDriver {
  put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void>;
  url(key: string, variant: Variant): string;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export function getStorageDriver(): StorageDriver {
  const { env } = require('@/lib/env');
  switch (env.STORAGE_DRIVER) {
    case 'cloudinary':
      return require('@/lib/storage/cloudinary').cloudinaryDriver;
    case 'local':
      return require('@/lib/storage/local').localDriver;
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}
```

- [ ] **Step 2: Create `lib/queue/index.ts`**

```ts
// lib/queue/index.ts
export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface QueueDriver {
  enqueue(job: JobPayload, opts?: { runAt?: Date; maxAttempts?: number }): Promise<string>;
  process(handler: (job: JobPayload) => Promise<void>): Promise<void>;
}

export function getQueueDriver(): QueueDriver {
  const { env } = require('@/lib/env');
  switch (env.QUEUE_DRIVER) {
    case 'bullmq':
      return require('@/lib/queue/bullmq').bullmqDriver;
    case 'pg-cron':
      return require('@/lib/queue/pg-cron').pgCronDriver;
    default:
      throw new Error(`Unknown QUEUE_DRIVER: ${env.QUEUE_DRIVER}`);
  }
}
```

- [ ] **Step 3: Create `lib/pdf/index.ts`**

```ts
// lib/pdf/index.ts
export interface PdfDriver {
  renderHtmlToPdf(html: string): Promise<Buffer>;
}

export function getPdfDriver(): PdfDriver {
  const { env } = require('@/lib/env');
  switch (env.PDF_DRIVER) {
    case 'playwright':
      return require('@/lib/pdf/playwright').playwrightDriver;
    case 'html-print':
      return require('@/lib/pdf/html-print').htmlPrintDriver;
    default:
      throw new Error(`Unknown PDF_DRIVER: ${env.PDF_DRIVER}`);
  }
}
```

- [ ] **Step 4: Create `lib/courier/index.ts` and mock**

```ts
// lib/courier/index.ts
export interface CreateShipmentInput {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number; // paisa
  note?: string;
  itemDescription?: string;
}

export interface ShipmentResult {
  consignmentId: string;
  trackingCode: string;
  status: string;
}

export interface CourierDriver {
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  getStatus(consignmentId: string): Promise<{ status: string; raw: unknown }>;
}

export function getCourierDriver(): CourierDriver {
  const { env } = require('@/lib/env');
  switch (env.COURIER_DRIVER) {
    case 'steadfast':
      return require('@/lib/courier/steadfast').steadfastDriver;
    case 'mock':
      return require('@/lib/courier/mock').mockCourierDriver;
    default:
      throw new Error(`Unknown COURIER_DRIVER: ${env.COURIER_DRIVER}`);
  }
}
```

```ts
// lib/courier/mock.ts
import type { CourierDriver, CreateShipmentInput, ShipmentResult } from './index';

let counter = 1000;

export const mockCourierDriver: CourierDriver = {
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const id = `MOCK-${++counter}`;
    console.log(`[MockCourier] Created shipment ${id} for ${input.recipientName}`);
    return {
      consignmentId: id,
      trackingCode: `TRK-${id}`,
      status: 'pending',
    };
  },
  async getStatus(consignmentId: string) {
    return { status: 'in_transit', raw: { consignmentId, mock: true } };
  },
};
```

- [ ] **Step 5: Create `lib/sms/index.ts` and mock**

```ts
// lib/sms/index.ts
export interface SmsDriver {
  send(phone: string, message: string): Promise<{ success: boolean; messageId?: string }>;
}

export function getSmsDriver(): SmsDriver {
  const { env } = require('@/lib/env');
  switch (env.SMS_DRIVER) {
    case 'bulksms':
      return require('@/lib/sms/bulksms').bulksmsDriver;
    case 'mock':
      return require('@/lib/sms/mock').mockSmsDriver;
    default:
      throw new Error(`Unknown SMS_DRIVER: ${env.SMS_DRIVER}`);
  }
}
```

```ts
// lib/sms/mock.ts
import type { SmsDriver } from './index';

export const mockSmsDriver: SmsDriver = {
  async send(phone: string, message: string) {
    console.log(`[MockSMS] → ${phone}: ${message}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add lib/storage/ lib/queue/ lib/pdf/ lib/courier/ lib/sms/
git commit -m "feat: add driver interfaces for storage, queue, PDF, courier, SMS"
```

---

### Task 6: i18n — Bangla-First Bilingual Setup

**Files:**
- Create: `lib/i18n/config.ts`, `lib/i18n/request.ts`, `lib/i18n/number.ts`, `lib/i18n/navigation.ts`
- Create: `messages/bn.json`, `messages/en.json`
- Create: `middleware.ts`

**Produces:** Working bilingual routing (`/` = Bangla, `/en/` = English), numeral formatting, digit normalization

- [ ] **Step 1: Create `lib/i18n/config.ts`**

```ts
// lib/i18n/config.ts
export const locales = ['bn', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'bn';
```

- [ ] **Step 2: Create `lib/i18n/request.ts`**

```ts
// lib/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './navigation';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create `lib/i18n/navigation.ts`**

```ts
// lib/i18n/navigation.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // no /bn/ prefix for default
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 4: Create `lib/i18n/number.ts` — the ONLY place numbers become strings**

```ts
// lib/i18n/number.ts
import type { Locale } from './config';

/**
 * Format a number with locale-appropriate digits and grouping.
 * Bangla uses ০-৯ digits and lakh/crore grouping.
 */
export function fmtNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(n);
}

/**
 * Format paisa (integer) as Taka currency string.
 * ৳ (U+09F3) is the Taka sign — not Tk, not BDT.
 */
export function fmtMoney(paisa: number, locale: Locale): string {
  const taka = paisa / 100;
  const formatted = new Intl.NumberFormat(
    locale === 'bn' ? 'bn-BD' : 'en-BD',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  ).format(taka);
  return `৳${formatted}`;
}

/**
 * Normalize Bengali (০-৯) and Arabic-Indic (٠-٩) digits to ASCII 0-9.
 * Apply in Zod preprocessors for every numeric and phone field.
 */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalize BD phone number to canonical 8801XXXXXXXXX format.
 * Accepts: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX
 */
export function normalizePhone(raw: string): string {
  const digits = normalizeDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  throw new Error(`Invalid BD phone number: ${raw}`);
}
```

- [ ] **Step 5: Create `middleware.ts`**

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/navigation';

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
```

- [ ] **Step 6: Create initial message files**

```json
// messages/bn.json
{
  "common": {
    "appName": "VetMart",
    "home": "হোম",
    "search": "অনুসন্ধান",
    "cart": "কার্ট",
    "account": "অ্যাকাউন্ট",
    "species": "প্রজাতি",
    "login": "লগইন",
    "logout": "লগআউট",
    "addToCart": "কার্টে যোগ করুন",
    "buyNow": "এখনই কিনুন",
    "outOfStock": "স্টকে নেই",
    "price": "মূল্য",
    "quantity": "পরিমাণ",
    "total": "মোট",
    "subtotal": "সাবটোটাল",
    "shipping": "ডেলিভারি চার্জ",
    "vat": "ভ্যাট",
    "orderNow": "অর্ডার করুন",
    "cashOnDelivery": "ক্যাশ অন ডেলিভারি",
    "loading": "লোড হচ্ছে...",
    "error": "একটি সমস্যা হয়েছে",
    "retry": "আবার চেষ্টা করুন"
  },
  "species": {
    "cattle": "গরু",
    "buffalo": "মহিষ",
    "goat_sheep": "ছাগল/ভেড়া",
    "poultry": "পোল্ট্রি",
    "fish": "মাছ",
    "dog": "কুকুর",
    "cat": "বিড়াল",
    "pigeon": "কবুতর"
  },
  "product": {
    "genericName": "জেনেরিক নাম",
    "manufacturer": "প্রস্তুতকারক",
    "batchNo": "ব্যাচ নম্বর",
    "expiryDate": "মেয়াদ শেষের তারিখ",
    "dosageForm": "ডোজ ফর্ম",
    "packSize": "প্যাক সাইজ",
    "strength": "শক্তি",
    "withdrawalMeat": "মাংসে প্রত্যাহার সময়",
    "withdrawalMilk": "দুধে প্রত্যাহার সময়",
    "storageCondition": "সংরক্ষণ অবস্থা"
  }
}
```

```json
// messages/en.json
{
  "common": {
    "appName": "VetMart",
    "home": "Home",
    "search": "Search",
    "cart": "Cart",
    "account": "Account",
    "species": "Species",
    "login": "Login",
    "logout": "Logout",
    "addToCart": "Add to Cart",
    "buyNow": "Buy Now",
    "outOfStock": "Out of Stock",
    "price": "Price",
    "quantity": "Quantity",
    "total": "Total",
    "subtotal": "Subtotal",
    "shipping": "Delivery Charge",
    "vat": "VAT",
    "orderNow": "Order Now",
    "cashOnDelivery": "Cash on Delivery",
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again"
  },
  "species": {
    "cattle": "Cattle",
    "buffalo": "Buffalo",
    "goat_sheep": "Goat/Sheep",
    "poultry": "Poultry",
    "fish": "Fish",
    "dog": "Dog",
    "cat": "Cat",
    "pigeon": "Pigeon"
  },
  "product": {
    "genericName": "Generic Name",
    "manufacturer": "Manufacturer",
    "batchNo": "Batch No",
    "expiryDate": "Expiry Date",
    "dosageForm": "Dosage Form",
    "packSize": "Pack Size",
    "strength": "Strength",
    "withdrawalMeat": "Meat Withdrawal Period",
    "withdrawalMilk": "Milk Withdrawal Period",
    "storageCondition": "Storage Condition"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/ messages/ middleware.ts
git commit -m "feat: add Bangla-first bilingual i18n with numeral formatting"
```

---

### Task 7: Typography & Tailwind Configuration

**Files:**
- Modify: `tailwind.config.ts`
- Create: `app/fonts/` (font files — self-hosted)
- Modify: `app/globals.css`

**Produces:** Self-hosted Hind Siliguri (bn) + Inter (en), Tailwind with BD breakpoints

- [ ] **Step 1: Install fonts locally**

Download and place in `app/fonts/`:
- `HindSiliguri-Regular.woff2`, `HindSiliguri-Medium.woff2`, `HindSiliguri-SemiBold.woff2`, `HindSiliguri-Bold.woff2`
- Inter is available via `next/font/google` with self-hosting (Next.js downloads at build time)

Alternatively, use `next/font/google` which self-hosts automatically:

```ts
// app/fonts.ts
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const hindSiliguri = localFont({
  src: [
    { path: './fonts/HindSiliguri-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/HindSiliguri-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/HindSiliguri-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/HindSiliguri-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-hind-siliguri',
  display: 'swap',
});
```

- [ ] **Step 2: Update Tailwind config with BD breakpoints**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-hind-siliguri)', 'system-ui', 'sans-serif'],
        bangla: ['var(--font-hind-siliguri)', 'system-ui', 'sans-serif'],
      },
      colors: {
        vetmart: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

- [ ] **Step 3: Update `app/globals.css` with Bangla line-height**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    /* shadcn/ui CSS vars continue here */
  }

  /* Bangla text needs taller line-height for matras and conjuncts */
  [lang="bn"] {
    line-height: 1.8;
  }

  /* Never render Bangla below 15px */
  [lang="bn"] body {
    font-size: max(15px, 1rem);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css app/fonts.ts app/fonts/
git commit -m "feat: configure typography (Hind Siliguri + Inter) and BD Tailwind breakpoints"
```

---

### Task 8: App Layout with Locale Routing

**Files:**
- Create: `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`
- Delete: `app/layout.tsx`, `app/page.tsx` (replace with locale-routed versions)

**Produces:** Working bilingual root layout with font loading and locale detection

- [ ] **Step 1: Create `app/[locale]/layout.tsx`**

```tsx
// app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/i18n/navigation';
import { inter, hindSiliguri } from '@/app/fonts';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VetMart — ভেটেরিনারি মেডিসিন ও পশু স্বাস্থ্য',
    template: '%s | VetMart',
  },
  description: 'বাংলাদেশের সবচেয়ে বড় ভেটেরিনারি ওষুধ ও পশু স্বাস্থ্য ই-কমার্স প্ল্যাটফর্ম',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${hindSiliguri.variable} font-sans antialiased min-h-dvh bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/[locale]/page.tsx` — placeholder homepage**

```tsx
// app/[locale]/page.tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        VetMart
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-[65ch] text-center">
        {locale === 'bn'
          ? 'বাংলাদেশের ভেটেরিনারি মেডিসিন ও পশু স্বাস্থ্য ই-কমার্স'
          : 'Veterinary Medicine & Animal Health E-Commerce for Bangladesh'}
      </p>
      <p className="mt-2 text-sm text-muted-foreground font-mono">
        SP-1 Foundation — scaffold complete
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Remove default `app/layout.tsx` and `app/page.tsx` if they exist**

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add locale-routed layout with bilingual metadata"
```

---

### Task 9: ICU Guard Test

**Files:**
- Create: `lib/i18n/__tests__/number.test.ts`

**Consumes:** `fmtMoney`, `fmtNumber`, `normalizeDigits`, `normalizePhone` from `lib/i18n/number.ts`
**Produces:** CI test that catches ICU regressions (§15.3 rule 1)

- [ ] **Step 1: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Write the ICU guard tests**

```ts
// lib/i18n/__tests__/number.test.ts
import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtNumber, normalizeDigits, normalizePhone } from '../number';

describe('fmtMoney', () => {
  it('formats Bangla taka with Bengali digits and lakh grouping', () => {
    // §15.3 rule 1: this test guards against small-icu Node builds
    expect(fmtMoney(120000_00, 'bn')).toBe('৳১,২০,০০০.০০');
  });

  it('formats English taka with Western digits and lakh grouping', () => {
    expect(fmtMoney(120000_00, 'en')).toBe('৳1,20,000.00');
  });

  it('formats zero correctly', () => {
    expect(fmtMoney(0, 'bn')).toBe('৳০.০০');
    expect(fmtMoney(0, 'en')).toBe('৳0.00');
  });

  it('formats small amounts', () => {
    expect(fmtMoney(50, 'bn')).toBe('৳০.৫০');
    expect(fmtMoney(50, 'en')).toBe('৳0.50');
  });
});

describe('fmtNumber', () => {
  it('formats with Bengali digits', () => {
    expect(fmtNumber(12345, 'bn')).toBe('১২,৩৪৫');
  });

  it('formats with lakh/crore grouping in English', () => {
    expect(fmtNumber(1200000, 'en')).toBe('12,00,000');
  });
});

describe('normalizeDigits', () => {
  it('converts Bengali digits to ASCII', () => {
    expect(normalizeDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
  });

  it('passes ASCII digits through', () => {
    expect(normalizeDigits('01712345678')).toBe('01712345678');
  });

  it('handles mixed scripts', () => {
    expect(normalizeDigits('০1৭1২3')).toBe('017123');
  });
});

describe('normalizePhone', () => {
  it('normalizes 01XXXXXXXXX to 8801XXXXXXXXX', () => {
    expect(normalizePhone('01712345678')).toBe('8801712345678');
  });

  it('normalizes +8801XXXXXXXXX', () => {
    expect(normalizePhone('+8801712345678')).toBe('8801712345678');
  });

  it('normalizes 8801XXXXXXXXX (already canonical)', () => {
    expect(normalizePhone('8801712345678')).toBe('8801712345678');
  });

  it('normalizes Bengali digit phone numbers', () => {
    expect(normalizePhone('০১৭১২৩৪৫৬৭৮')).toBe('8801712345678');
  });

  it('throws on invalid phone', () => {
    expect(() => normalizePhone('123')).toThrow('Invalid BD phone');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts lib/i18n/__tests__/
git commit -m "test: add ICU guard and phone normalization tests"
```

---

### Task 10: Verify & Final Commit

- [ ] **Step 1: Run full check suite**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All must pass.

- [ ] **Step 2: Verify dev server starts**

```bash
pnpm dev
```

Navigate to `http://localhost:3000` — should show the Bangla placeholder homepage.
Navigate to `http://localhost:3000/en` — should show the English version.

- [ ] **Step 3: Final commit and tag**

```bash
git add -A
git commit -m "feat: SP-1 Foundation scaffold complete"
git tag sp1-foundation
```
