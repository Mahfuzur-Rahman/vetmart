// app/[locale]/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { SpeciesGrid } from '@/components/storefront/SpeciesGrid';
import { HeroCarousel } from '@/components/storefront/HeroCarousel';
import { FeaturedProductsGrid } from '@/components/storefront/FeaturedProductsGrid';
import { listProducts } from '@/lib/services/products';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';
import { isDemoMode } from '@/lib/demo';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  // Fetch featured products with mock fallback
  let products = MOCK_PRODUCTS;
  if (!isDemoMode()) {
    try {
      const fetched = await listProducts({ limit: 8 });
      if (fetched && fetched.length > 0) {
        products = fetched as any;
      }
    } catch (e) {
      products = MOCK_PRODUCTS as any;
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1">
        {/* ═══ HERO CAROUSEL SECTION (10 SLIDES) ═══ */}
        <HeroCarousel locale={loc} />

        {/* ═══ TRUST BADGES ROW ═══ */}
        <section className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: '🛡️', labelEn: 'DGDA registered', labelBn: 'ডিজিডিএ নিবন্ধিত' },
                { icon: '🚚', labelEn: 'Cash on delivery', labelBn: 'ক্যাশ অন ডেলিভারি' },
                { icon: '❄️', labelEn: 'Cold chain shipping', labelBn: 'কোল্ড চেইন শিপিং' },
                { icon: '📞', labelEn: '24/7 vet helpline', labelBn: '২৪/৭ ভেট হেল্পলাইন' },
              ].map((badge) => (
                <div key={badge.labelEn} className="flex items-center gap-3">
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground">
                    {loc === 'bn' ? badge.labelBn : badge.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-14">
          {/* ═══ SPECIES NAVIGATION ═══ */}
          <SpeciesGrid locale={loc} />

          {/* ═══ FEATURED PRODUCTS ═══ */}
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {loc === 'bn' ? 'জনপ্রিয় প্রয়োজনীয় ওষুধ' : 'Featured essentials'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                  {loc === 'bn'
                    ? 'খামার ও পশুর চিকিৎসায় বহুল ব্যবহৃত নিবন্ধিত ওষুধ'
                    : 'Widely used registered medicines for farm & animal treatment'}
                </p>
              </div>

              <Link
                href="/products"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4 transition-colors"
              >
                {loc === 'bn' ? 'সব দেখুন' : 'View all'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Product Grid */}
            <FeaturedProductsGrid locale={loc} initialProducts={products} />

            {/* Mobile view all link */}
            <div className="sm:hidden text-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                {loc === 'bn' ? 'সব ওষুধ দেখুন →' : 'View all products →'}
              </Link>
            </div>
          </section>

          {/* ═══ AMR AWARENESS BANNER ═══ */}
          <section className="rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
              🛡️
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-foreground">
                {loc === 'bn'
                  ? 'সঠিক ড্রাগ ব্যবহার ও AMR সচেতনতা'
                  : 'Responsible drug usage & AMR awareness'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {loc === 'bn'
                  ? 'গবাদিপশু ও পোল্ট্রির দুগ্ধ ও মাংসে অবশিষ্ট ওষুধ প্রতিরোধে উইথড্রয়াল পিরিয়ড কঠোরভাবে মেনে চলুন। নিবন্ধিত ভেটেরিনারি সার্জনের পরামর্শ ছাড়া কোনো অ্যান্টিবায়োটিক প্রয়োগ করবেন না।'
                  : 'Strictly adhere to withdrawal periods to prevent drug residue in meat and milk. Never administer antibiotics without consulting a registered veterinary surgeon.'}
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer locale={loc} />
    </div>
  );
}
