'use client';

import { useState, useEffect } from 'react';
import { fmtMoney } from '@/lib/i18n/number';
import { getSpeciesName } from '@/lib/services/species';
import { ProductDetailAddToCart } from '@/components/storefront/ProductDetailAddToCart';
import { ProductReviewsSection } from '@/components/storefront/ProductReviewsSection';
import {
  getStoredProductBySlug,
  isProductDeleted,
  PRODUCTS_UPDATED_EVENT,
  type MockProduct,
} from '@/lib/mock-data/products';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  slug: string;
  initialProduct: any | null;
}

export function ProductDetailView({ locale, slug, initialProduct }: Props) {
  const [productData, setProductData] = useState<any | null>(initialProduct);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);

  useEffect(() => {
    if (initialProduct) {
      setProductData(initialProduct);
      setIsDeleted(false);
    } else {
      const stored = getStoredProductBySlug(slug);
      if (stored) {
        setProductData(stored);
        setIsDeleted(false);
      } else {
        setIsDeleted(true);
      }
    }

    const syncProduct = () => {
      fetch(`/api/v1/products/${slug}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setProductData(json.data);
            setIsDeleted(false);
          } else {
            const stored = getStoredProductBySlug(slug);
            if (stored) {
              setProductData(stored);
              setIsDeleted(false);
            } else {
              setIsDeleted(true);
            }
          }
        })
        .catch(() => {
          const stored = getStoredProductBySlug(slug);
          if (stored) {
            setProductData(stored);
            setIsDeleted(false);
          }
        });
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, syncProduct);
    window.addEventListener('storage', syncProduct);

    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, syncProduct);
      window.removeEventListener('storage', syncProduct);
    };
  }, [slug, initialProduct]);


  if (isDeleted || !productData) {
    return (
      <div className="text-center py-20 px-4 space-y-4 border border-dashed border-border rounded-3xl bg-card max-w-2xl mx-auto my-12">
        <div className="text-5xl">📦</div>
        <h2 className="text-2xl font-bold text-foreground">
          {locale === 'bn' ? 'পণ্যটি খুঁজে পাওয়া যায়নি' : 'Product Not Found'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {locale === 'bn'
            ? 'এই পণ্যটি হয়তো মুছে ফেলা হয়েছে অথবা বর্তমানে আমাদের ক্যাটালগে নেই।'
            : 'This product may have been removed or is no longer available in the catalog.'}
        </p>
        <Link
          href="/products"
          className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          {locale === 'bn' ? 'সকল ওষুধ দেখুন' : 'Browse All Products'}
        </Link>
      </div>
    );
  }

  const p = productData;
  const product = {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameBn: p.nameBn || p.nameEn,
    genericName: p.genericName,
    manufacturer: p.manufacturer || { name: p.manufacturerName || 'Veterinary Formulary', country: 'Bangladesh' },
    mrp: p.mrp,
    salePrice: p.salePrice,
    requiresPrescription: p.requiresPrescription,
    requiresColdChain: p.coldChain || p.requiresColdChain,
    isAntimicrobial: p.isAntimicrobial,
    isOutOfStock: (p.stockQty ?? p.stock ?? 1) <= 0,
    stock: p.stockQty ?? p.stock ?? 100,
    sellableStock: p.stockQty ?? p.stock ?? 100,
    withdrawalMeatDays: p.withdrawalMeatDays || 0,
    withdrawalMilkHours: p.withdrawalMilkHours || 0,
    targetSpecies: p.targetSpecies || [],
    strength: p.strength,
    dosageForm: p.dosageForm,
    packSize: p.packSize,
    dgdaRegistrationNo: p.dgdaRegNo || p.dgdaRegistrationNo || 'DAR-024-118-059',
    imageUrl: p.imageUrl,
    descriptionEn: p.descriptionEn || 'High quality veterinary formulary product.',
    descriptionBn: p.descriptionBn || 'উচ্চমানের ভেটেরিনারি ফর্মুলারি ওষুধ।',
  };

  const isOutOfStock = product.isOutOfStock;
  const isDiscounted = product.mrp > product.salePrice;

  return (
    <div className="space-y-10">
      {/* Main Product Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
        {/* Left: Product Image & Badges */}
        <div className="space-y-4">
          <div className="w-full h-80 rounded-2xl bg-secondary/40 flex items-center justify-center text-muted-foreground relative overflow-hidden border border-border">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-contain p-4" />
            ) : (
              <div className="text-6xl">💊</div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {product.requiresPrescription && (
              <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold uppercase">
                ⚠️ Rx Prescription Required
              </span>
            )}
            {product.requiresColdChain && (
              <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold uppercase">
                ❄️ Cold-Chain Storage (2-8°C)
              </span>
            )}
            {product.isAntimicrobial && (
              <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold uppercase">
                🧬 Antimicrobial
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Details & Add to Cart */}
        <div className="space-y-6">
          {/* Manufacturer & Title */}
          <div>
            {product.manufacturer && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {product.manufacturer.name} ({product.manufacturer.country})
              </span>
            )}

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
              {locale === 'bn' ? product.nameBn : product.nameEn}
            </h1>

            {/* Star Rating Quick Preview */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <a
                href="#customer-reviews"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <span className="flex items-center text-amber-400 text-xs sm:text-sm">★★★★★</span>
                <span className="font-extrabold text-foreground">4.9</span>
                <span>•</span>
                <span className="underline underline-offset-2">
                  {locale === 'bn' ? 'ক্রেতাদের রিভিউ দেখুন' : 'Customer Reviews'}
                </span>
              </a>
              <span className="text-muted-foreground/50 hidden sm:inline">•</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                ✓ {locale === 'bn' ? '১০০% অরিজিনাল ওষুধ' : '100% DGDA Genuine'}
              </span>
            </div>

            {product.genericName && (
              <p className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                Generic: {product.genericName}
              </p>
            )}
          </div>

          {/* Pricing Section */}
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-baseline justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">
                {locale === 'bn' ? 'বিক্রয় মূল্য' : 'Sale Price'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">
                  {fmtMoney(product.salePrice, locale)}
                </span>
                {isDiscounted && (
                  <span className="text-sm text-muted-foreground line-through">
                    MRP {fmtMoney(product.mrp, locale)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block text-right">
                {locale === 'bn' ? 'স্টক অবস্থা' : 'Stock Status'}
              </span>
              <span
                className={`text-sm font-bold block text-right ${
                  isOutOfStock ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isOutOfStock
                  ? locale === 'bn'
                    ? 'স্টকে নেই'
                    : 'Out of Stock'
                  : locale === 'bn'
                  ? `স্টকে আছে (${product.stock} টি)`
                  : `In Stock (${product.stock})`}
              </span>
            </div>
          </div>

          {/* Interactive Multi-Quantity Selector & Add to Cart Controller */}
          <ProductDetailAddToCart locale={locale} product={product} />

          {/* Withdrawal Period Safety Box */}
          {(product.withdrawalMeatDays! > 0 || product.withdrawalMilkHours! > 0) && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                <span>⏱️</span>
                <span>
                  {locale === 'bn' ? 'উইথড্রয়াল পিরিয়ড (মাংস ও দুধের নিরাপত্তা সতর্কতা)' : 'Withdrawal Period Warning'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-amber-950 dark:text-amber-200">
                <div>
                  <span className="text-muted-foreground block">{locale === 'bn' ? 'মাংসে প্রত্যাহার' : 'Meat Withdrawal'}:</span>
                  <span className="font-bold text-sm">{product.withdrawalMeatDays} {locale === 'bn' ? 'দিন' : 'Days'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{locale === 'bn' ? 'দুধে প্রত্যাহার' : 'Milk Withdrawal'}:</span>
                  <span className="font-bold text-sm">{product.withdrawalMilkHours} {locale === 'bn' ? 'ঘণ্টা' : 'Hours'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Target Species List */}
          {product.targetSpecies && product.targetSpecies.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {locale === 'bn' ? 'ব্যবহারযোগ্য প্রজাতি' : 'Target Species'}
              </span>
              <div className="flex flex-wrap gap-2">
                {product.targetSpecies.map((spec: string) => (
                  <span
                    key={spec}
                    className="px-3 py-1 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
                  >
                    {getSpeciesName(spec, locale)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technical Specifications Grid */}
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-xs">
            {product.strength && (
              <div>
                <span className="text-muted-foreground block">{locale === 'bn' ? 'শক্তি (Strength)' : 'Strength'}:</span>
                <span className="font-semibold text-foreground">{product.strength}</span>
              </div>
            )}
            {product.dosageForm && (
              <div>
                <span className="text-muted-foreground block">{locale === 'bn' ? 'ডোজ ফর্ম' : 'Dosage Form'}:</span>
                <span className="font-semibold text-foreground">{product.dosageForm}</span>
              </div>
            )}
            {product.packSize && (
              <div>
                <span className="text-muted-foreground block">{locale === 'bn' ? 'প্যাক সাইজ' : 'Pack Size'}:</span>
                <span className="font-semibold text-foreground">{product.packSize}</span>
              </div>
            )}
            {product.dgdaRegistrationNo && (
              <div>
                <span className="text-muted-foreground block">{locale === 'bn' ? 'ডিজিডিএ রেজি নম্বর' : 'DGDA Reg. No'}:</span>
                <span className="font-mono font-semibold text-foreground">{product.dgdaRegistrationNo}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews & Rating Hub */}
      <ProductReviewsSection
        locale={locale}
        productId={product.id}
        productSlug={product.slug}
        productName={locale === 'bn' ? product.nameBn : product.nameEn}
      />
    </div>
  );
}
