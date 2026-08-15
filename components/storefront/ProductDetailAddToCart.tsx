'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { fmtMoney, fmtNumber } from '@/lib/i18n/number';
import { useCart, type CartProduct } from '@/lib/context/CartContext';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  product: CartProduct & {
    isOutOfStock?: boolean;
  };
}

export function ProductDetailAddToCart({ locale, product }: Props) {
  const router = useRouter();
  const { getItemQty, addToCart, updateQty } = useCart();
  const isBn = locale === 'bn';

  const inCartQty = getItemQty(product.id);
  const isOutOfStock = product.isOutOfStock || (product.sellableStock ?? product.stock ?? 1) <= 0;
  const maxStock = product.sellableStock ?? product.stock ?? 999;

  const [qty, setQty] = useState<number>(inCartQty > 0 ? inCartQty : 1);
  const [justAdded, setJustAdded] = useState(false);

  // Sync with cart if changed elsewhere
  useEffect(() => {
    if (inCartQty > 0) {
      setQty(inCartQty);
    }
  }, [inCartQty]);

  const handleDecrement = () => {
    if (qty > 1) {
      setQty((prev) => prev - 1);
    }
  };

  const handleIncrement = () => {
    if (qty < maxStock) {
      setQty((prev) => prev + 1);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val <= 0) {
      setQty(1);
    } else if (val > maxStock) {
      setQty(maxStock);
    } else {
      setQty(val);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (inCartQty > 0) {
      updateQty(product.id, qty);
    } else {
      addToCart(product, qty);
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (inCartQty > 0) {
      updateQty(product.id, qty);
    } else {
      addToCart(product, qty);
    }
    router.push('/checkout');
  };

  const totalPrice = product.salePrice * qty;
  const totalMrp = product.mrp * qty;
  const totalSavings = totalMrp > totalPrice ? totalMrp - totalPrice : 0;

  // Farm bulk quick quantity pills
  const quickPills = [1, 5, 10, 25, 50].filter((pill) => pill <= maxStock);

  return (
    <div className="rounded-2xl border border-border/80 bg-secondary/30 dark:bg-secondary/15 p-5 space-y-5">
      {/* Quantity Selector Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            {isBn ? 'পরিমাণ নির্বাচন করুন' : 'Select Quantity'}
          </label>
          {inCartQty > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
              {isBn ? `বর্তমানে কার্টে আছে: ${fmtNumber(inCartQty, locale)} টি` : `In cart: ${inCartQty}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stepper with direct input */}
          <div className="inline-flex items-center border-2 border-border bg-card rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={qty <= 1 || isOutOfStock}
              aria-label={isBn ? 'কমান' : 'Decrease'}
              className="w-10 h-10 flex items-center justify-center font-bold text-base hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground cursor-pointer"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxStock}
              value={qty}
              onChange={handleManualChange}
              disabled={isOutOfStock}
              className="w-14 h-10 text-center font-extrabold text-sm sm:text-base font-mono bg-transparent text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={qty >= maxStock || isOutOfStock}
              aria-label={isBn ? 'বাড়ান' : 'Increase'}
              className="w-10 h-10 flex items-center justify-center font-bold text-base hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-foreground cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Quick pills for bulk / farm buyers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setQty(pill)}
                disabled={isOutOfStock}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qty === pill
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {fmtNumber(pill, locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtotal Preview */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground font-medium block">
            {isBn ? `${fmtNumber(qty, locale)} টির মোট মূল্য:` : `Total for ${qty} ${qty > 1 ? 'units' : 'unit'}:`}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground font-display">
              {fmtMoney(totalPrice, locale)}
            </span>
            {totalSavings > 0 && (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {isBn ? `(সাশ্রয় ${fmtMoney(totalSavings, locale)})` : `(Save ${fmtMoney(totalSavings, locale)})`}
              </span>
            )}
          </div>
        </div>

        {product.requiresPrescription && (
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
            {isBn ? '⚠️ প্রেসক্রিপশন প্রয়োজন' : '⚠️ Rx Required'}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : justAdded
              ? 'bg-emerald-700 text-white scale-98 shadow-emerald-700/30'
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-emerald-600/20'
          }`}
        >
          {justAdded ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{isBn ? 'কার্টে যোগ হয়েছে!' : 'Added to Cart!'}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              <span>{isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : 'bg-foreground text-background hover:opacity-90 active:scale-98 shadow-sm'
          }`}
        >
          <span>⚡</span>
          <span>{isBn ? 'সরাসরি অর্ডার করুন' : 'Buy Now'}</span>
        </button>
      </div>
    </div>
  );
}
