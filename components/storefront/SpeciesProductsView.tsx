'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/storefront/ProductCard';
import { PRODUCTS_UPDATED_EVENT } from '@/lib/mock-data/products';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  speciesKey: string;
  speciesInfo: {
    emoji: string;
    nameEn: string;
    nameBn: string;
    description?: { en: string; bn: string };
  };
  initialItems: any[];
}

export function SpeciesProductsView({
  locale,
  speciesKey,
  speciesInfo,
  initialItems,
}: Props) {
  const [products, setProducts] = useState<any[]>(initialItems);

  useEffect(() => {
    setProducts(initialItems ?? []);
  }, [initialItems]);

  useEffect(() => {
    // Species filtering happens in the query, not in the client, so an empty
    // result genuinely means no product targets this species.
    const syncProducts = () => {
      fetch(`/api/v1/products?species=${encodeURIComponent(speciesKey)}&pageSize=48`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json) => {
          if (Array.isArray(json.data)) setProducts(json.data);
        })
        .catch((err) => {
          console.error(`Could not refresh products for species "${speciesKey}":`, err);
        });
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
    return () => window.removeEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
  }, [speciesKey]);


  return (
    <div className="space-y-8">
      {/* Species Header Banner */}
      <section className="relative rounded-3xl border border-border bg-card p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{speciesInfo.emoji}</span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {locale === 'bn' ? speciesInfo.nameBn : speciesInfo.nameEn}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {speciesInfo.description
                  ? locale === 'bn'
                    ? speciesInfo.description.bn
                    : speciesInfo.description.en
                  : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          {locale === 'bn'
            ? `${products.length}টি তালিকাভুক্ত ওষুধ`
            : `${products.length} Listed Products`}
        </div>
      </section>

      {/* Product Grid */}
      <section>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} locale={locale} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3 border border-dashed border-border rounded-3xl bg-card">
            <div className="text-4xl">{speciesInfo.emoji}</div>
            <h3 className="font-bold text-base text-foreground">
              {locale === 'bn'
                ? 'বর্তমানে এই প্রজাতির ওষুধ উপলব্ধ নেই'
                : 'No products available for this species'}
            </h3>
            <Link
              href="/products"
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs"
            >
              {locale === 'bn' ? 'সকল ওষুধ দেখুন' : 'View All Products'}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
