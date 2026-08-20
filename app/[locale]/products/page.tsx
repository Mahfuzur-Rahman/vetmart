// app/[locale]/products/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductsCatalogView } from '@/components/storefront/ProductsCatalogView';
import { searchCatalog, type SortOption } from '@/lib/services/search';
import { listCategories } from '@/lib/services/categories';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sParams = await searchParams;
  const loc = locale as Locale;
  setRequestLocale(loc);

  const query = sParams.q || undefined;
  const speciesFilter = sParams.species || undefined;
  const categoryFilter = sParams.category || undefined;
  const sortOption = (sParams.sort as SortOption) || 'relevance';
  const page = parseInt(sParams.page || '1', 10);

  const searchResult = await searchCatalog({
    q: query,
    species: speciesFilter,
    categorySlug: categoryFilter,
    sort: sortOption,
    page,
    pageSize: 24,
  });

  const categories = await listCategories();

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductsCatalogView
          locale={loc}
          initialItems={searchResult.items}
          initialTotalCount={searchResult.totalCount}
          initialCategories={categories}
          query={query}
          speciesFilter={speciesFilter}
          categoryFilter={categoryFilter}
          initialSort={sortOption}
        />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
