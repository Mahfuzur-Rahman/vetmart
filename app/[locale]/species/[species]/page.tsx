// app/[locale]/species/[species]/page.tsx
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductCard } from '@/components/storefront/ProductCard';
import { getSpeciesBySlug, speciesSlugToKey } from '@/lib/services/species';
import { searchCatalog } from '@/lib/services/search';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';
import { isDemoMode } from '@/lib/demo';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; species: string }>;
};

export default async function SpeciesPage({ params }: Props) {
  const { locale, species: speciesSlug } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  const speciesInfo = getSpeciesBySlug(speciesSlug);
  const speciesKey = speciesSlugToKey(speciesSlug);

  if (!speciesInfo || !speciesKey) {
    notFound();
  }

  // Fetch products for this target species with mock fallback
  let searchResult = {
    items: MOCK_PRODUCTS.filter((p) => p.targetSpecies.includes(speciesKey)),
    totalCount: MOCK_PRODUCTS.filter((p) => p.targetSpecies.includes(speciesKey)).length,
  };

  if (!isDemoMode()) {
    try {
      const fetched = await searchCatalog({
        species: speciesKey,
        pageSize: 36,
      });
      if (fetched && fetched.items) {
        searchResult = fetched as any;
      }
    } catch (e) {
      const filtered = MOCK_PRODUCTS.filter((p) => p.targetSpecies.includes(speciesKey));
      searchResult = {
        items: filtered,
        totalCount: filtered.length,
      };
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Species Header Banner */}
        <section className="relative rounded-3xl border border-border bg-card p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{speciesInfo.emoji}</span>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {loc === 'bn' ? speciesInfo.nameBn : speciesInfo.nameEn}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {speciesInfo.description ? (loc === 'bn' ? speciesInfo.description.bn : speciesInfo.description.en) : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            {loc === 'bn' ? `${searchResult.totalCount}টি তালিকাভুক্ত ওষুধ` : `${searchResult.totalCount} Listed Products`}
          </div>
        </section>

        {/* Product Grid */}
        <section>
          {searchResult.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResult.items.map((product) => (
                <ProductCard key={product.id} locale={loc} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3 border border-dashed border-border rounded-3xl bg-card">
              <div className="text-4xl">{speciesInfo.emoji}</div>
              <h3 className="font-bold text-base">
                {loc === 'bn' ? 'বর্তমানে এই প্রজাতির ওষুধ উপলব্ধ নেই' : 'No products available for this species'}
              </h3>
            </div>
          )}
        </section>
      </main>

      <Footer locale={loc} />
    </div>
  );
}
