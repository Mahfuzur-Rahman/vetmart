'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { fmtMoney } from '@/lib/i18n/number';
import type { Locale } from '@/lib/i18n/config';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';

interface Props {
  locale: Locale;
}

export function CartView({ locale }: Props) {
  const isBn = locale === 'bn';

  const [cartItems, setCartItems] = useState([
    {
      product: MOCK_PRODUCTS[0], // Renaflox 100ml
      qty: 2,
    },
    {
      product: MOCK_PRODUCTS[1], // Rena-WS 100g
      qty: 5,
    },
  ]);

  const updateQty = (index: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.salePrice * item.qty,
    0
  );

  const hasColdChain = cartItems.some((item) => item.product.coldChain);
  const coldChainFee = hasColdChain ? 3000 : 0; // ৳30.00 cold chain packing
  const estDeliveryFee = 7000; // ৳70.00 Inside Dhaka
  const grandTotal = subtotal + coldChainFee + estDeliveryFee;

  if (cartItems.length === 0) {
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
          className="inline-block px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
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
        {cartItems.map((item, index) => (
          <div
            key={item.product.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-border bg-card gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {item.product.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.nameEn}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <span className="text-2xl">💊</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.product.requiresPrescription && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Rx Required
                    </span>
                  )}
                  {item.product.coldChain && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                      ❄️ Cold Chain
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-foreground">
                  {isBn ? item.product.nameBn : item.product.nameEn}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                  {item.product.genericName}
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {fmtMoney(item.product.salePrice, locale)} / {item.product.packUnit}
                </p>
              </div>
            </div>

            {/* Quantity Controls & Price */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-border">
              <div className="flex items-center border border-border rounded-xl bg-secondary/50">
                <button
                  type="button"
                  onClick={() => updateQty(index, -1)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-secondary rounded-l-xl transition-colors"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-bold font-mono">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(index, 1)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-secondary rounded-r-xl transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-foreground block">
                  {fmtMoney(item.product.salePrice * item.qty, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  {isBn ? 'সরিয়ে ফেলুন' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary Card */}
      <div className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-xs h-fit">
        <h2 className="font-extrabold text-lg text-foreground border-b border-border pb-3">
          {isBn ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary'}
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{isBn ? 'পণ্যের মোট মূল' : 'Subtotal'}</span>
            <span className="font-bold text-foreground">{fmtMoney(subtotal, locale)}</span>
          </div>

          {hasColdChain && (
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs">
              <span>{isBn ? '❄️ কোল্ড চেইন কুলার প্যাক' : '❄️ Cold Chain Packing'}</span>
              <span className="font-bold">{fmtMoney(coldChainFee, locale)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isBn ? 'আনুমানিক ডেলিভারি ফি (ঢাকা)' : 'Est. Delivery Fee'}</span>
            <span className="font-bold text-foreground">{fmtMoney(estDeliveryFee, locale)}</span>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between text-base font-extrabold text-foreground">
            <span>{isBn ? 'সর্বমোট' : 'Grand Total'}</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {fmtMoney(grandTotal, locale)}
            </span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all text-center block"
        >
          {isBn ? 'চেকআউটে যান →' : 'Proceed to Checkout →'}
        </Link>
      </div>
    </div>
  );
}
