'use client';

import { useState, useEffect, useMemo } from 'react';

import { ProductCard } from '@/components/storefront/ProductCard';
import { PRODUCTS_UPDATED_EVENT, type MockProduct } from '@/lib/types/product';
import { SPECIES, type SpeciesInfo } from '@/lib/services/species';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface CategoryItem {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
}

interface Props {
  locale: Locale;
  initialItems: any[];
  initialTotalCount: number;
  initialCategories: CategoryItem[];
  initialSpecies?: SpeciesInfo[];
  query?: string;
  speciesFilter?: string;
  categoryFilter?: string;
  initialSort?: string;
}

export function ProductsCatalogView({
  locale,
  initialItems,
  initialTotalCount,
  initialCategories,
  initialSpecies,
  query,
  speciesFilter,
  categoryFilter,
  initialSort = 'relevance',
}: Props) {
  // Server data is the default; a client refetch overrides it. Derived during
  // render rather than mirrored via an effect.
  const [refetched, setRefetched] = useState<MockProduct[] | null>(null);
  const [syncedFrom, setSyncedFrom] = useState(initialItems);

  if (initialItems !== syncedFrom) {
    setSyncedFrom(initialItems);
    setRefetched(null);
  }

  const allProducts = (refetched ?? (initialItems as MockProduct[]) ?? []) as MockProduct[];
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>(
    initialSpecies && initialSpecies.length > 0
      ? initialSpecies
      : SPECIES.filter((s) => s.showOnHomepage !== false)
  );

  useEffect(() => {
    fetch('/api/v1/species?homepage=true')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setSpeciesList(json.data);
        }
      })
      .catch((e) => console.warn('Could not fetch species for catalog filter:', e));
  }, []);


  useEffect(() => {
    // Re-fetch after an admin write. An empty catalog renders the empty state;
    // it never falls back to this browser's localStorage (that fallback is what
    // made a product visible only on the device that created it).
    const syncProducts = () => {
      fetch('/api/v1/products?pageSize=48')
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json) => {
          if (Array.isArray(json.data)) setRefetched(json.data);
        })
        .catch((err) => {
          console.error('Could not refresh catalog:', err);
        });
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
    return () => window.removeEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
  }, []);


  // Filter and sort products client-side
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Query filter
    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nameEn.toLowerCase().includes(q) ||
          p.nameBn.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.banglishKeywords && p.banglishKeywords.toLowerCase().includes(q))
      );
    }

    // Species filter
    if (speciesFilter) {
      result = result.filter((p) => p.targetSpecies && p.targetSpecies.includes(speciesFilter));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.categorySlug === categoryFilter);
    }

    // Sort
    switch (selectedSort) {
      case 'price_asc':
        result.sort((a, b) => a.salePrice - b.salePrice);
        break;
      case 'price_desc':
        result.sort((a, b) => b.salePrice - a.salePrice);
        break;
      case 'newest':
        // Sort by ID descending or mfgDate
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      default:
        // Relevance / default order
        break;
    }

    return result;
  }, [allProducts, query, speciesFilter, categoryFilter, selectedSort]);

  const totalCount = filteredProducts.length;

  return (
    <div className="space-y-8">
      {/* Page Title & Search Summary */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {query
            ? locale === 'bn'
              ? `"${query}" এর অনুসন্ধান ফলাফল`
              : `Search results for "${query}"`
            : locale === 'bn'
            ? 'সকল ভেটেরিনারি ওষুধ ও পণ্য'
            : 'All Veterinary Medicines & Products'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'bn'
            ? `মোট ${totalCount}টি পণ্য পাওয়া গেছে`
            : `Found ${totalCount} products`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <aside className="space-y-6">
          {/* Species Filter Panel */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              {locale === 'bn' ? 'প্রজাতি অনুযায়ী ফিল্টার' : 'Filter by Species'}
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
                {locale === 'bn' ? 'সকল প্রজাতি' : 'All Species'}
              </Link>
              {speciesList.map((s) => (
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
                  <span>{locale === 'bn' ? s.nameBn : s.nameEn}</span>
                </Link>
              ))}

            </div>
          </div>

          {/* Category Filter Panel */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              {locale === 'bn' ? 'ক্যাটাগরি' : 'Category'}
            </h3>
            <div className="space-y-1 text-sm">
              {initialCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}${query ? `&q=${query}` : ''}`}
                  className={`block px-3 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === c.slug
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'hover:bg-secondary text-muted-foreground'
                  }`}
                >
                  {locale === 'bn' ? c.nameBn : c.nameEn}
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
              {locale === 'bn' ? `${totalCount}টি পণ্য দেখানো হচ্ছে` : `Showing ${totalCount} products`}
            </span>

            {/* Sort selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {locale === 'bn' ? 'সর্ট করুন:' : 'Sort by:'}
              </span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-card border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="relevance">{locale === 'bn' ? 'প্রাসঙ্গিকতা' : 'Relevance'}</option>
                <option value="price_asc">{locale === 'bn' ? 'কম দাম থেকে বেশি' : 'Price: Low to High'}</option>
                <option value="price_desc">{locale === 'bn' ? 'বেশি দাম থেকে কম' : 'Price: High to Low'}</option>
                <option value="newest">{locale === 'bn' ? 'নতুন সংযুক্ত' : 'Newest'}</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} locale={locale} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4 border border-dashed border-border rounded-3xl bg-card/50">
              <div className="text-4xl">🔍</div>
              <h3 className="font-bold text-lg text-foreground">
                {locale === 'bn' ? 'কোনো ওষুধ পাওয়া যায়নি' : 'No products found'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {locale === 'bn'
                  ? 'আপনার সার্চ ফিল্টার পরিবর্তন করুন অথবা অন্য জেনেরিক নাম দিয়ে চেষ্টা করুন।'
                  : 'Try adjusting your search query or removing filters.'}
              </p>
              <Link
                href="/products"
                className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs"
              >
                {locale === 'bn' ? 'সকল ফিল্টার মুছুন' : 'Reset All Filters'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
