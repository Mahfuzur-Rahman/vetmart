// app/[locale]/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { getProductBySlug } from '@/lib/services/products';
import { getProductBySlug as getMockProductBySlug } from '@/lib/mock-data/products';
import { isDemoMode } from '@/lib/demo';
import { fmtMoney } from '@/lib/i18n/number';
import { getSpeciesName } from '@/lib/services/species';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

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
  const p = rawProduct || mock;

  if (!p) {
    notFound();
  }

  const product = {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    genericName: p.genericName,
    manufacturer: p.manufacturer || { name: p.manufacturerName, country: 'Bangladesh' },
    mrp: p.mrp,
    salePrice: p.salePrice,
    requiresPrescription: p.requiresPrescription,
    requiresColdChain: p.coldChain || p.requiresColdChain,
    isAntimicrobial: p.isAntimicrobial,
    isOutOfStock: (p.stockQty ?? p.stock ?? 1) <= 0,
    stock: p.stockQty ?? p.stock ?? 100,
    withdrawalMeatDays: p.withdrawalMeatDays || 0,
    withdrawalMilkHours: p.withdrawalMilkHours || 0,
    targetSpecies: p.targetSpecies || [],
    strength: p.strength,
    dosageForm: p.dosageForm,
    packSize: p.packSize,
    dgdaRegistrationNo: p.dgdaRegNo || p.dgdaRegistrationNo || 'DAR-024-118-059',
    imageUrl: p.imageUrl,
    descriptionEn: p.descriptionEn || 'High quality veterinary formulary product.',
    descriptionBn: p.descriptionBn || 'উচ্চমানের ভেটেরিনারি ফর্মুলারি ওষুধ।',
  };

  const isOutOfStock = product.isOutOfStock;
  const isDiscounted = product.mrp > product.salePrice;

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Main Product Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
          {/* Left: Product Image & Badges */}
          <div className="space-y-4">
            <div className="w-full h-80 rounded-2xl bg-secondary/40 flex items-center justify-center text-muted-foreground relative overflow-hidden border border-border">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-6xl">💊</div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {product.requiresPrescription && (
                <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold uppercase">
                  ⚠️ Rx Prescription Required
                </span>
              )}
              {product.requiresColdChain && (
                <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold uppercase">
                  ❄️ Cold-Chain Storage (2-8°C)
                </span>
              )}
              {product.isAntimicrobial && (
                <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold uppercase">
                  🧬 Antimicrobial
                </span>
              )}
            </div>
          </div>

          {/* Right: Product Details & Add to Cart */}
          <div className="space-y-6">
            {/* Manufacturer & Title */}
            <div>
              {product.manufacturer && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  {product.manufacturer.name} ({product.manufacturer.country})
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
                {loc === 'bn' ? product.nameBn : product.nameEn}
              </h1>

              {product.genericName && (
                <p className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                  Generic: {product.genericName}
                </p>
              )}
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-baseline justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">
                  {loc === 'bn' ? 'বিক্রয় মূল্য' : 'Sale Price'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {fmtMoney(product.salePrice, loc)}
                  </span>
                  {isDiscounted && (
                    <span className="text-sm text-muted-foreground line-through">
                      MRP {fmtMoney(product.mrp, loc)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block text-right">
                  {loc === 'bn' ? 'স্টক অবস্থা' : 'Stock Status'}
                </span>
                <span
                  className={`text-sm font-bold block text-right ${
                    isOutOfStock ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {isOutOfStock
                    ? loc === 'bn'
                      ? 'স্টকে নেই'
                      : 'Out of Stock'
                    : loc === 'bn'
                    ? `স্টকে আছে (${product.stock} টি)`
                    : `In Stock (${product.stock})`}
                </span>
              </div>
            </div>

            {/* Withdrawal Period Safety Box (§5.2, §11) */}
            {(product.withdrawalMeatDays! > 0 || product.withdrawalMilkHours! > 0) && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <span>⏱️</span>
                  <span>
                    {loc === 'bn' ? 'উইথড্রয়াল পিরিয়ড (মাংস ও দুধের নিরাপত্তা সতর্কতা)' : 'Withdrawal Period Warning'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-amber-950 dark:text-amber-200">
                  <div>
                    <span className="text-muted-foreground block">{loc === 'bn' ? 'মাংসে প্রত্যাহার' : 'Meat Withdrawal'}:</span>
                    <span className="font-bold text-sm">{product.withdrawalMeatDays} {loc === 'bn' ? 'দিন' : 'Days'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{loc === 'bn' ? 'দুধে প্রত্যাহার' : 'Milk Withdrawal'}:</span>
                    <span className="font-bold text-sm">{product.withdrawalMilkHours} {loc === 'bn' ? 'ঘণ্টা' : 'Hours'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Species List */}
            {product.targetSpecies && product.targetSpecies.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {loc === 'bn' ? 'ব্যবহারযোগ্য প্রজাতি' : 'Target Species'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.targetSpecies.map((spec: string) => (
                    <span
                      key={spec}
                      className="px-3 py-1 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
                    >
                      {getSpeciesName(spec, loc)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Specifications Grid */}
            <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-xs">
              {product.strength && (
                <div>
                  <span className="text-muted-foreground block">{loc === 'bn' ? 'শক্তি (Strength)' : 'Strength'}:</span>
                  <span className="font-semibold text-foreground">{product.strength}</span>
                </div>
              )}
              {product.dosageForm && (
                <div>
                  <span className="text-muted-foreground block">{loc === 'bn' ? 'ডোজ ফর্ম' : 'Dosage Form'}:</span>
                  <span className="font-semibold text-foreground">{product.dosageForm}</span>
                </div>
              )}
              {product.packSize && (
                <div>
                  <span className="text-muted-foreground block">{loc === 'bn' ? 'প্যাক সাইজ' : 'Pack Size'}:</span>
                  <span className="font-semibold text-foreground">{product.packSize}</span>
                </div>
              )}
              {product.dgdaRegistrationNo && (
                <div>
                  <span className="text-muted-foreground block">{loc === 'bn' ? 'ডিজিডিএ রেজি নম্বর' : 'DGDA Reg. No'}:</span>
                  <span className="font-mono font-semibold text-foreground">{product.dgdaRegistrationNo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer locale={loc} />
    </div>
  );
}
