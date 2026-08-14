// lib/i18n/navigation.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // 'as-needed' = no /bn/ prefix for the default locale (§15.1)
  // / and /p/enroflox-100 → Bangla
  // /en/p/enroflox-100 → English
  localePrefix: 'as-needed',
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
