'use client';

import { Link } from '@/lib/i18n/navigation';
import { fmtMoney, fmtNumber } from '@/lib/i18n/number';
import { useCart } from '@/lib/context/CartContext';
import type { Locale } from '@/lib/i18n/config';

export interface ProductCardProps {
  locale: Locale;
  product: {
    id: string;
    slug: string;
    nameEn: string;
    nameBn: string;
    genericName?: string | null;
    dosageForm?: string | null;
    packSize?: string | null;
    mrp: number; // in paisa
    salePrice: number; // in paisa
    requiresPrescription: boolean;
    requiresColdChain: boolean;
    withdrawalMeatDays?: number | null;
    withdrawalMilkHours?: number | null;
    sellableStock?: number;
    categoryNameEn?: string | null;
    categoryNameBn?: string | null;
    manufacturerName?: string | null;
    imageUrl?: string | null;
  };
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ locale, product, onAddToCart }: ProductCardProps) {
  const { getItemQty, addToCart, updateQty } = useCart();
  const cartQty = getItemQty(product.id);
  const isOutOfStock = (product.sellableStock ?? 1) <= 0;
  const maxStock = product.sellableStock ?? 999;
  const isDiscounted = product.mrp > product.salePrice;
  const discountPct = isDiscounted
    ? Math.round(((product.mrp - product.salePrice) / product.mrp) * 100)
    : 0;

  const handleAddFirst = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    if (onAddToCart) onAddToCart(product.id);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQty >= maxStock) return;
    updateQty(product.id, cartQty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQty(product.id, cartQty - 1);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-250 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      {/* Image area */}
      <Link href={`/products/${product.slug}`} className="relative block">
        <div className="w-full aspect-[4/3] bg-secondary/40 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.nameEn}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
              💊
            </div>
          )}
        </div>

        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.requiresPrescription && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
              Rx
            </span>
          )}
          {product.requiresColdChain && (
            <span className="px-2 py-0.5 rounded-md bg-sky-500/90 text-white text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
              ❄️ Cold
            </span>
          )}
        </div>

        {/* Discount badge */}
        {isDiscounted && discountPct > 0 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold">
            -{discountPct}%
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-2 rounded-xl bg-foreground/80 text-background text-xs font-bold">
              {locale === 'bn' ? 'স্টকে নেই' : 'Out of stock'}
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 pt-3 space-y-2">
        {/* Manufacturer */}
        {product.manufacturerName && (
          <span className="text-[11px] font-medium text-muted-foreground line-clamp-1">
            {product.manufacturerName}
          </span>
        )}

        {/* Product name */}
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {locale === 'bn' ? product.nameBn : product.nameEn}
          </h3>
        </Link>

        {/* Generic name */}
        {product.genericName && (
          <p className="text-xs text-primary/70 font-mono font-medium line-clamp-1">
            {product.genericName}
          </p>
        )}

        {/* Pack info */}
        {(product.dosageForm || product.packSize) && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {[product.dosageForm, product.packSize].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + CTA row — always pinned to bottom */}
        <div className="pt-3 mt-auto border-t border-border/60 flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-bold text-foreground font-display">
              {fmtMoney(product.salePrice, locale)}
            </span>
            {isDiscounted && (
              <span className="text-[11px] text-muted-foreground line-through ml-1.5">
                {fmtMoney(product.mrp, locale)}
              </span>
            )}
          </div>

          {/* Dynamic Add to Cart / Multi-Quantity Stepper */}
          {cartQty > 0 ? (
            <div
              className="flex items-center rounded-xl bg-emerald-600 text-white shadow-sm overflow-hidden border border-emerald-500/40 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={locale === 'bn' ? 'পরিমাণ কমান' : 'Decrease quantity'}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base hover:bg-emerald-700 active:scale-90 transition-all cursor-pointer"
              >
                −
              </button>
              <span className="min-w-[24px] sm:min-w-[28px] text-center font-extrabold text-xs sm:text-sm font-mono tracking-tight px-0.5 select-none text-white">
                {fmtNumber(cartQty, locale)}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={cartQty >= maxStock}
                aria-label={locale === 'bn' ? 'পরিমাণ বাড়ান' : 'Increase quantity'}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base hover:bg-emerald-700 active:scale-90 transition-all cursor-pointer ${
                  cartQty >= maxStock ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''
                }`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddFirst}
              disabled={isOutOfStock}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1 shadow-xs ${
                isOutOfStock
                  ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95 cursor-pointer'
              }`}
            >
              <span>+ {locale === 'bn' ? 'কার্ট' : 'Cart'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
