// app/[locale]/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { SpeciesGrid } from '@/components/storefront/SpeciesGrid';
import { HeroCarousel } from '@/components/storefront/HeroCarousel';
import { FeaturedProductsGrid } from '@/components/storefront/FeaturedProductsGrid';
import { searchCatalog } from '@/lib/services/search';
import { listSpecies } from '@/lib/services/species-server';
import { listDrugClassifications } from '@/lib/services/drug-classifications-server';
import { pickFeatured, FEATURED_FETCH_SIZE } from '@/lib/catalog/featured';

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

  // Featured products come from the catalog search, which only ever returns
  // active rows. No mock fallback: an empty homepage must mean an empty
  // catalog, not a hidden query failure.
  //
  // Sorted newest-first and widened past the rail size so pickFeatured can
  // demote out-of-stock rows (§16.1) — see lib/catalog/featured.ts for why the
  // default alphabetical order was the wrong choice here.
  const [homepageSpecies, menuPharma, featured] = await Promise.all([
    listSpecies({ showOnHomepage: true, isActive: true }),
    listDrugClassifications({ showOnMenu: true, isActive: true }),
    searchCatalog({ pageSize: FEATURED_FETCH_SIZE, sort: 'newest' }),
  ]);
  const products = pickFeatured(featured.items);

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} initialSpecies={homepageSpecies} initialDrugClassifications={menuPharma} />



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
          <SpeciesGrid locale={loc} initialSpecies={homepageSpecies} />


          {/* ═══ FEATURED PRODUCTS ═══ */}
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {loc === 'bn' ? 'জনপ্রিয় প্রয়োজনীয় পণ্য' : 'Featured essentials'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                  {loc === 'bn'
                    ? 'খামার ও পশু পালনে বহুল ব্যবহৃত পণ্য ও সাপ্লিমেন্ট'
                    : 'Widely used supplies and supplements for farm & animal care'}
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
                {loc === 'bn' ? 'সব পণ্য দেখুন →' : 'View all products →'}
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
                  ? 'সঠিক খামার ব্যবস্থাপনা ও হাইজিন সচেতনতা'
                  : 'Responsible farm management & hygiene awareness'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {loc === 'bn'
                  ? 'খামারের সর্বোচ্চ উৎপাদনশীলতা ও পশুর সুস্বাস্থ্য নিশ্চিতে সর্বদা ফিড অ্যাডিটিভস এবং সাপ্লিমেন্টের সঠিক নির্দেশিকা অনুসরণ করুন।'
                  : 'Always follow recommended guidelines for feed additives and supplements to ensure optimal animal health and farm productivity.'}
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer locale={loc} />
    </div>
  );
}
