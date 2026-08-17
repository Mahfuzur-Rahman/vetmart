// app/[locale]/order/[slug]/page.tsx
// 1-Page Express Order Landing for Social Media Ad Campaigns
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ExpressOrderView, type ExpressProduct } from '@/components/storefront/ExpressOrderView';
import { getProductBySlug } from '@/lib/services/products';
import { getProductBySlug as getMockProductBySlug, MOCK_PRODUCTS } from '@/lib/mock-data/products';
import { isDemoMode } from '@/lib/demo';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ExpressProductOrderPage({ params }: Props) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  let rawProduct: any = null;
  if (!isDemoMode()) {
    try {
      rawProduct = await getProductBySlug(slug);
    } catch {
      rawProduct = null;
    }
  }

  const mock = getMockProductBySlug(slug);
  const p = rawProduct || mock;

  if (!p) {
    notFound();
  }

  const product: ExpressProduct = {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    genericName: p.genericName,
    dosageForm: p.dosageForm,
    packSize: p.packSize,
    packUnit: p.packUnit,
    mrp: p.mrp,
    salePrice: p.salePrice,
    requiresPrescription: p.requiresPrescription,
    requiresColdChain: p.coldChain || p.requiresColdChain,
    coldChain: p.coldChain || p.requiresColdChain,
    imageUrl: p.imageUrl,
    stock: p.stockQty ?? p.stock ?? 100,
    manufacturerName: p.manufacturer?.name || p.manufacturerName || 'Square Pharmaceuticals Ltd.',
    withdrawalMeatDays: p.withdrawalMeatDays || 0,
    withdrawalMilkHours: p.withdrawalMilkHours || 0,
  };

  const allProducts: ExpressProduct[] = MOCK_PRODUCTS.slice(0, 6).map((item) => ({
    id: item.id,
    slug: item.slug,
    nameEn: item.nameEn,
    nameBn: item.nameBn,
    genericName: item.genericName,
    dosageForm: item.dosageForm,
    packSize: item.packSize,
    packUnit: item.packUnit,
    mrp: item.mrp,
    salePrice: item.salePrice,
    requiresPrescription: item.requiresPrescription,
    requiresColdChain: item.coldChain || item.requiresColdChain,
    coldChain: item.coldChain || item.requiresColdChain,
    imageUrl: item.imageUrl,
    stock: item.stockQty ?? 100,
    manufacturerName: item.manufacturerName || 'Square Pharmaceuticals Ltd.',
  }));

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ExpressOrderView locale={loc} product={product} allProducts={allProducts} />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
