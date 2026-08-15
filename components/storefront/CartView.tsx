'use client';

import { Link } from '@/lib/i18n/navigation';
import { fmtMoney, fmtNumber } from '@/lib/i18n/number';
import { useCart } from '@/lib/context/CartContext';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
}

export function CartView({ locale }: Props) {
  const isBn = locale === 'bn';
  const {
    items,
    updateQty,
    removeFromCart,
    subtotal,
    hasColdChain,
    coldChainFee,
    estDeliveryFee,
    grandTotal,
    isHydrated,
  } = useCart();

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center space-y-6 shadow-xs">
        <div className="text-6xl">🛒</div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {isBn ? 'আপনার কার্ট এখন খালি' : 'Your Shopping Cart is Empty'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isBn
              ? 'পণ্য ক্যাটালগ থেকে পোল্ট্রি, গবাদিপশু বা পোষা প্রাণীর ওষুধ পছন্দ করুন।'
              : 'Browse our catalog for livestock, poultry, or pet medicine.'}
          </p>
        </div>

        <Link
          href="/products"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          {isBn ? 'ওষুধ ব্রাউজ করুন →' : 'Browse Medicines →'}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          const maxStock = item.product.sellableStock ?? item.product.stock ?? 999;
          const isCold = item.product.requiresColdChain || item.product.coldChain;

          return (
            <div
              key={item.product.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-border bg-card gap-4 shadow-2xs hover:border-border/90 transition-all"
            >
              <div className="flex items-center gap-4">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden border border-border hover:opacity-90 transition-opacity"
                >
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.nameEn}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-2xl">💊</span>
                  )}
                </Link>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.product.requiresPrescription && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        Rx Required
                      </span>
                    )}
                    {isCold && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                        ❄️ Cold Chain
                      </span>
                    )}
                  </div>

                  <Link href={`/products/${item.product.slug}`} className="hover:text-primary transition-colors block">
                    <h3 className="font-bold text-sm text-foreground">
                      {isBn ? item.product.nameBn : item.product.nameEn}
                    </h3>
                  </Link>

                  {item.product.genericName && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                      {item.product.genericName}
                    </p>
                  )}

                  <p className="text-xs font-semibold text-foreground">
                    {fmtMoney(item.product.salePrice, locale)} {item.product.packUnit ? `/ ${item.product.packUnit}` : ''}
                  </p>
                </div>
              </div>

              {/* Quantity Controls & Price */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                <div className="flex items-center border border-border rounded-xl bg-secondary/50 shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, item.qty - 1)}
                    aria-label={isBn ? 'কমান' : 'Decrease quantity'}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-secondary active:scale-90 transition-colors text-foreground cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-xs font-bold font-mono text-foreground select-none">
                    {fmtNumber(item.qty, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.product.id, item.qty + 1)}
                    disabled={item.qty >= maxStock}
                    aria-label={isBn ? 'বাড়ান' : 'Increase quantity'}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-secondary active:scale-90 disabled:opacity-30 transition-colors text-foreground cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[90px]">
                  <span className="text-sm font-extrabold text-foreground block font-display">
                    {fmtMoney(item.product.salePrice * item.qty, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                  >
                    {isBn ? 'সরিয়ে ফেলুন' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary Card */}
      <div className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-xs h-fit sticky top-24">
        <h2 className="font-extrabold text-lg text-foreground border-b border-border pb-3">
          {isBn ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary'}
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{isBn ? 'পণ্যের মোট মূল্য' : 'Subtotal'}</span>
            <span className="font-bold text-foreground font-display">{fmtMoney(subtotal, locale)}</span>
          </div>

          {hasColdChain && (
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-lg">
              <span>{isBn ? '❄️ কোল্ড চেইন কুলার প্যাক' : '❄️ Cold Chain Packing'}</span>
              <span className="font-bold font-display">{fmtMoney(coldChainFee, locale)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isBn ? 'আনুমানিক ডেলিভারি ফি (ঢাকা)' : 'Est. Delivery Fee'}</span>
            <span className="font-bold text-foreground font-display">{fmtMoney(estDeliveryFee, locale)}</span>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between text-base font-extrabold text-foreground">
            <span>{isBn ? 'সর্বমোট' : 'Grand Total'}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-display text-lg">
              {fmtMoney(grandTotal, locale)}
            </span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all text-center block cursor-pointer"
        >
          {isBn ? 'চেকআউটে যান →' : 'Proceed to Checkout →'}
        </Link>
      </div>
    </div>
  );
}
