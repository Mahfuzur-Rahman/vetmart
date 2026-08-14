// app/[locale]/products/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { ProductCard } from '@/components/storefront/ProductCard';
import { searchCatalog, type SortOption } from '@/lib/services/search';
import { SPECIES } from '@/lib/services/species';
import { listCategories } from '@/lib/services/categories';
import { MOCK_PRODUCTS, searchProducts } from '@/lib/mock-data/products';
import { MOCK_CATEGORIES } from '@/lib/mock-data/categories';
import { isDemoMode } from '@/lib/demo';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

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

  // Fetch search results with mock fallback
  let searchResult = {
    items: MOCK_PRODUCTS,
    totalCount: MOCK_PRODUCTS.length,
    page: 1,
    pageSize: 24,
    totalPages: 1,
  };

  if (isDemoMode()) {
    // Skip DB entirely in demo mode for instant response
    let filtered = query ? searchProducts(query) : MOCK_PRODUCTS;
    if (speciesFilter) {
      filtered = filtered.filter((p) => p.targetSpecies.includes(speciesFilter));
    }
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.categorySlug === categoryFilter);
    }
    searchResult = {
      items: filtered,
      totalCount: filtered.length,
      page: 1,
      pageSize: 24,
      totalPages: 1,
    };
  } else {
    try {
      const fetched = await searchCatalog({
        q: query,
        species: speciesFilter,
        categorySlug: categoryFilter,
        sort: sortOption,
        page,
        pageSize: 24,
      });
      if (fetched && fetched.items) {
        searchResult = fetched as any;
      }
    } catch (e) {
      let filtered = query ? searchProducts(query) : MOCK_PRODUCTS;
      if (speciesFilter) {
        filtered = filtered.filter((p) => p.targetSpecies.includes(speciesFilter));
      }
      if (categoryFilter) {
        filtered = filtered.filter((p) => p.categorySlug === categoryFilter);
      }
      searchResult = {
        items: filtered,
        totalCount: filtered.length,
        page: 1,
        pageSize: 24,
        totalPages: 1,
      };
    }
  }

  // Fetch categories for sidebar filter
  let categories = MOCK_CATEGORIES;
  if (!isDemoMode()) {
    try {
      const fetchedCats = await listCategories();
      if (fetchedCats && fetchedCats.length > 0) {
        categories = fetchedCats as any;
      }
    } catch (e) {
      categories = MOCK_CATEGORIES as any;
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Search Summary */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {query
              ? loc === 'bn'
                ? `"${query}" এর অনুসন্ধান ফলাফল`
                : `Search results for "${query}"`
              : loc === 'bn'
              ? 'সকল ভেটেরিনারি ওষুধ ও পণ্য'
              : 'All Veterinary Medicines & Products'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loc === 'bn'
              ? `মোট ${searchResult.totalCount}টি পণ্য পাওয়া গেছে`
              : `Found ${searchResult.totalCount} products`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <aside className="space-y-6">
            {/* Species Filter Panel */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                {loc === 'bn' ? 'প্রজাতি অনুযায়ী ফিল্টার' : 'Filter by Species'}
              </h3>
              <div className="space-y-1 text-sm">
                <Link
                  href="/products"
                  className={`block px-3 py-1.5 rounded-lg transition-colors ${
                    !speciesFilter
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'hover:bg-secondary text-muted-foreground'
                  }`}
                >
                  {loc === 'bn' ? 'সকল প্রজাতি' : 'All Species'}
                </Link>
                {SPECIES.map((s) => (
                  <Link
                    key={s.key}
                    href={`/products?species=${s.key}${query ? `&q=${query}` : ''}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                      speciesFilter === s.key
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{loc === 'bn' ? s.nameBn : s.nameEn}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Category Filter Panel */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                {loc === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </h3>
              <div className="space-y-1 text-sm">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}${query ? `&q=${query}` : ''}`}
                    className={`block px-3 py-1.5 rounded-lg transition-colors ${
                      categoryFilter === c.slug
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    {loc === 'bn' ? c.nameBn : c.nameEn}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Product Grid Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sort & View Options */}
            <div className="flex items-center justify-between pb-4 border-b border-border text-sm">
              <span className="text-muted-foreground text-xs">
                Page {searchResult.page} of {searchResult.totalPages || 1}
              </span>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {loc === 'bn' ? 'সর্ট করুন:' : 'Sort by:'}
                </span>
                <select
                  defaultValue={sortOption}
                  className="bg-card border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="relevance">{loc === 'bn' ? 'প্রাসঙ্গিকতা' : 'Relevance'}</option>
                  <option value="price_asc">{loc === 'bn' ? 'কম দাম থেকে বেশি' : 'Price: Low to High'}</option>
                  <option value="price_desc">{loc === 'bn' ? 'বেশি দাম থেকে কম' : 'Price: High to Low'}</option>
                  <option value="newest">{loc === 'bn' ? 'নতুন সংযুক্ত' : 'Newest'}</option>
                </select>
              </div>
            </div>

            {/* Product Cards Grid */}
            {searchResult.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResult.items.map((product) => (
                  <ProductCard key={product.id} locale={loc} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4 border border-dashed border-border rounded-3xl bg-card/50">
                <div className="text-4xl">🔍</div>
                <h3 className="font-bold text-lg text-foreground">
                  {loc === 'bn' ? 'কোনো ওষুধ পাওয়া যায়নি' : 'No products found'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {loc === 'bn'
                    ? 'আপনার সার্চ ফিল্টার পরিবর্তন করুন অথবা অন্য জেনেরিক নাম দিয়ে চেষ্টা করুন।'
                    : 'Try adjusting your search query or removing filters.'}
                </p>
                <Link
                  href="/products"
                  className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs"
                >
                  {loc === 'bn' ? 'সকল ফিল্টার মুছুন' : 'Reset All Filters'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer locale={loc} />
    </div>
  );
}
