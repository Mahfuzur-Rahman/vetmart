// app/[locale]/species/[species]/page.tsx
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { SpeciesProductsView } from '@/components/storefront/SpeciesProductsView';
import { getSpeciesBySlug, speciesSlugToKey } from '@/lib/services/species';
import { searchCatalog } from '@/lib/services/search';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  // searchCatalog handles demo mode internally; no mock fallback here.
  const searchResult = await searchCatalog({
    species: speciesKey,
    pageSize: 36,
  });

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <SpeciesProductsView
          locale={loc}
          speciesKey={speciesKey}
          speciesInfo={speciesInfo}
          initialItems={searchResult.items}
        />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
