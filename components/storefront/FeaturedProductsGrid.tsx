'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/storefront/ProductCard';
import {
  getStoredProducts,
  PRODUCTS_UPDATED_EVENT,
  type MockProduct,
} from '@/lib/mock-data/products';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  initialProducts: any[];
}

export function FeaturedProductsGrid({ locale, initialProducts }: Props) {
  const [products, setProducts] = useState<any[]>(initialProducts);

  useEffect(() => {
    // If server passed DB products, use them
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts.slice(0, 8));
    } else {
      const stored = getStoredProducts();
      setProducts(stored.slice(0, 8));
    }

    const syncProducts = () => {
      // Re-fetch from API or fallback to storage
      fetch('/api/v1/products?pageSize=8')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setProducts(json.data);
          } else {
            setProducts(getStoredProducts().slice(0, 8));
          }
        })
        .catch(() => {
          setProducts(getStoredProducts().slice(0, 8));
        });
    };

    // Listen to custom updates (e.g. admin table add/delete) and cross-tab storage changes
    window.addEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
    window.addEventListener('storage', syncProducts);

    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, syncProducts);
      window.removeEventListener('storage', syncProducts);
    };
  }, [initialProducts]);


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
