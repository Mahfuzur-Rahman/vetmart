// app/[locale]/admin/products/page.tsx
// Admin Products Management Table (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminProductsTable } from '@/components/admin/AdminProductsTable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return <AdminProductsTable locale={loc} />;
}
