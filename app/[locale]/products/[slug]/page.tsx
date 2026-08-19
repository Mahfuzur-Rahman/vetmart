// app/[locale]/products/[slug]/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductDetailView } from '@/components/storefront/ProductDetailView';
import { getProductBySlug } from '@/lib/services/products';
import { getProductBySlug as getMockProductBySlug } from '@/lib/mock-data/products';
import { isDemoMode } from '@/lib/demo';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  let rawProduct: any = null;
  if (!isDemoMode()) {
    try {
      rawProduct = await getProductBySlug(slug);
    } catch (e) {
      rawProduct = null;
    }
  }

  const mock = getMockProductBySlug(slug);
  const p = rawProduct || mock || null;

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetailView locale={loc} slug={slug} initialProduct={p} />
      </main>

      <Footer locale={loc} />
    </div>
  );
}

