// app/[locale]/order/page.tsx
// Universal Quick Order Portal for Social Media & Direct Campaigns
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ExpressOrderView, type ExpressProduct } from '@/components/storefront/ExpressOrderView';
import { listProducts } from '@/lib/services/products';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function GenericExpressOrderPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  const dbProducts = await listProducts({ limit: 12 });

  const allProducts: ExpressProduct[] = dbProducts.map((item: any) => ({
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
    requiresColdChain: item.requiresColdChain,
    coldChain: item.requiresColdChain,
    imageUrl: item.imageUrl,
    stock: 100,
    manufacturerName: item.manufacturerName || 'Veterinary Health',
  }));

  const defaultProduct = allProducts[0];

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ExpressOrderView locale={loc} product={defaultProduct} allProducts={allProducts} />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
