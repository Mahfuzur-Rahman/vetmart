'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/storefront/ProductCard';
import { PRODUCTS_UPDATED_EVENT } from '@/lib/mock-data/products';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  initialProducts: any[];
}

export function FeaturedProductsGrid({ locale, initialProducts }: Props) {
  // Server data is the default; a client refetch overrides it. Derived during
  // render rather than mirrored via an effect (React's "adjusting state when a
  // prop changes" pattern), so there is no setState-in-effect cascade.
  const [refetched, setRefetched] = useState<any[] | null>(null);
  const [syncedFrom, setSyncedFrom] = useState(initialProducts);

  if (initialProducts !== syncedFrom) {
    setSyncedFrom(initialProducts);
    setRefetched(null);
  }

  const products = (refetched ?? initialProducts ?? []).slice(0, 8);

  useEffect(() => {
    // Re-fetch after an admin write. The catalog is server state: an empty
    // response means the catalog is empty, never a cue to read this browser's
    // localStorage, which is what made products device-local.
    const syncProducts = () => {
      fetch('/api/v1/products?pageSize=8')
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json) => {
          if (Array.isArray(json.data)) setRefetched(json.data);
        })
        .catch((err) => {
          // Keep the server-rendered list rather than substituting other data.
          console.error('Could not refresh featured products:', err);
        });
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
    return () => window.removeEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
  }, []);


  if (products.length === 0) {
    return (
      <div className="text-center py-16 px-4 space-y-4 border border-dashed border-border rounded-3xl bg-card/60">
        <div className="text-4xl">📦</div>
        <h3 className="font-bold text-lg text-foreground">
          {locale === 'bn' ? 'বর্তমানে কোনো ওষুধ প্রদর্শিত নেই' : 'No featured products available'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {locale === 'bn'
            ? 'অ্যাডমিন প্যানেল থেকে নতুন পণ্য যোগ করুন অথবা ফিল্টার পরিবর্তন করুন।'
            : 'Add products from the admin panel or refresh to view items.'}
        </p>
        <Link
          href="/products"
          className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
        >
          {locale === 'bn' ? 'সকল ওষুধ ব্রাউজ করুন' : 'Browse All Products'}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} locale={locale} product={product} />
      ))}
    </div>
  );
}
