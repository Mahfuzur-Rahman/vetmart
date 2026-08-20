'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { fmtMoney, fmtNumber } from '@/lib/i18n/number';
import {
  type IncompleteOrder,
  INCOMPLETE_ORDERS_STORAGE_KEY,
  isValidBdPhone,
  sanitizeBdPhone,
  getStoredIncompleteOrders,
  saveStoredIncompleteOrders,
} from '@/lib/mock-data/incomplete-orders';
import type { Locale } from '@/lib/i18n/config';

export interface ExpressProduct {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  genericName?: string | null;
  dosageForm?: string | null;
  packSize?: string | null;
  packUnit?: string | null;
  mrp: number; // in paisa
  salePrice: number; // in paisa
  requiresPrescription?: boolean;
  requiresColdChain?: boolean;
  coldChain?: boolean;
  imageUrl?: string | null;
  stock?: number;
  manufacturerName?: string | null;
  withdrawalMeatDays?: number;
  withdrawalMilkHours?: number;
}

interface Props {
  locale: Locale;
  product: ExpressProduct;
  allProducts?: ExpressProduct[];
}

export function ExpressOrderView({ locale, product: initialProduct, allProducts = [] }: Props) {
  const isBn = locale === 'bn';
  const searchParams = useSearchParams();

  // Selected product (if user switches on general /order page)
  const [selectedProduct, setSelectedProduct] = useState<ExpressProduct>(initialProduct);
  const [syncedFromProduct, setSyncedFromProduct] = useState<ExpressProduct>(initialProduct);
  const [quantity, setQuantity] = useState<number>(1);

  // Customer Delivery Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');

  // The product is resolved server-side from the database. It is never merged
  // with localStorage: a device-local override here would let one browser order
  // against a price or stock figure no other device (or the server) agrees with.
  //
  // Re-synced during render rather than through an effect.
  if (initialProduct !== syncedFromProduct) {
    setSyncedFromProduct(initialProduct);
    setSelectedProduct(initialProduct);
  }


  // Lead capture and order submission states
  const [leadDraftId, setLeadDraftId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved'>('idle');
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  // Marketing attribution from query string
  const utmSource = searchParams?.get('utm_source') || searchParams?.get('source') || 'social_campaign';
  const utmCampaign = searchParams?.get('utm_campaign') || searchParams?.get('campaign') || 'direct_order';
  const utmMedium = searchParams?.get('utm_medium') || searchParams?.get('medium') || 'cpc';

  // Financial calculations
  const unitPrice = selectedProduct.salePrice;
  const subtotal = unitPrice * quantity;
  const isCold = selectedProduct.requiresColdChain || selectedProduct.coldChain;
  const coldChainFee = isCold ? 3000 : 0; // ৳30
  const deliveryFee = division === 'Dhaka' ? 7000 : 13000; // ৳70 inside Dhaka, ৳130 outside
  const totalAmount = subtotal + coldChainFee + deliveryFee;
  const savings = Math.max(0, (selectedProduct.mrp - selectedProduct.salePrice) * quantity);

  // Ref to track last captured state to avoid redundant syncs
  const lastSyncHash = useRef<string>('');

  // ⚡ Live Incomplete Order Lead Capture Trigger
  useEffect(() => {
    const cleanedPhone = sanitizeBdPhone(phone);
    if (!isValidBdPhone(cleanedPhone)) return;

    const currentHash = `${cleanedPhone}-${name}-${address}-${district}-${selectedProduct.id}-${quantity}-${totalAmount}`;
    if (currentHash === lastSyncHash.current) return;

    setSyncStatus('syncing');

    const timer = setTimeout(async () => {
      lastSyncHash.current = currentHash;
      const draftId = leadDraftId || `inc-ord-${Date.now()}`;

      const leadItem = {
        productId: selectedProduct.id,
        productSlug: selectedProduct.slug,
        productNameEn: selectedProduct.nameEn,
        productNameBn: selectedProduct.nameBn,
        unitPrice: selectedProduct.salePrice,
        quantity,
        totalPrice: selectedProduct.salePrice * quantity,
        packSize: selectedProduct.packSize,
        imageUrl: selectedProduct.imageUrl,
      };

      const leadData: IncompleteOrder = {
        id: draftId,
        phone: cleanedPhone,
        name: name.trim() || null,
        address: address.trim() || null,
        division,
        district,
        upazila: upazila.trim() || null,
        items: [leadItem],
        subtotal,
        deliveryFee,
        totalAmount,
        utmSource,
        utmCampaign,
        utmMedium,
        status: 'incomplete',
        adminNotes: 'Captured automatically from Social Media Express Order Landing.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save to client localStorage for immediate admin board availability
      try {
        const storedLeads = getStoredIncompleteOrders();
        const existingIdx = storedLeads.findIndex((l) => l.phone === cleanedPhone || l.id === draftId);
        if (existingIdx > -1) {
          storedLeads[existingIdx] = {
            ...storedLeads[existingIdx],
            ...leadData,
            createdAt: storedLeads[existingIdx].createdAt,
          };
          saveStoredIncompleteOrders(storedLeads);
        } else {
          saveStoredIncompleteOrders([leadData, ...storedLeads]);
        }
        setLeadDraftId(draftId);
      } catch (err) {
        console.error('Storage sync error', err);
      }

      // 2. Fire background API sync
      try {
        await fetch('/api/v1/incomplete-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
      } catch {
        // Continue silently on offline/mock mode
      }

      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 600);

    return () => clearTimeout(timer);
  }, [phone, name, address, division, district, upazila, selectedProduct, quantity, totalAmount, leadDraftId, utmSource, utmCampaign, utmMedium]);

  // Autofill demo for quick testing
  const handleAutofillDemo = () => {
    setName('Dr. Anisur Rahman');
    setPhone('01711223344');
    setDivision('Dhaka');
    setDistrict('Gazipur');
    setUpazila('Joydebpur');
    setAddress('Rahman Dairy & Poultry Complex, Joydebpur Bus Stand Road');
  };

  // Submit Final Express Order
  //
  // This used to fabricate an order object and push it into localStorage under
  // 'vetmart_mock_orders'. The server never heard about it, so the order was
  // invisible to the admin on every other device and stock was never
  // decremented. It now goes through POST /api/v1/orders/express, which
  // allocates batches FEFO and writes the stock ledger.
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !isValidBdPhone(phone)) {
      setOrderError(
        isBn
          ? 'অনুগ্রহ করে সঠিক ১১-সংখ্যার মোবাইল নম্বর দিন'
          : 'Please provide a valid 11-digit mobile number'
      );
      return;
    }

    setIsPlacing(true);
    setOrderError(null);

    // §9: a stable key per attempt, so a retry over flaky mobile data replays
    // the original order instead of creating a duplicate.
    const key = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = key;

    try {
      const res = await fetch('/api/v1/orders/express', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          items: [{ productId: selectedProduct.id, slug: selectedProduct.slug, qty: quantity }],
          recipientName: name.trim() || (isBn ? 'সম্মানিত খামারি' : 'Valued Customer'),
          phone,
          division,
          district,
          upazila,
          addressLine: address,
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'sslcommerz',
          sourceChannel: 'social_direct_order',
          utmSource,
          utmCampaign,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setOrderError(
          json?.error?.message ??
            (isBn ? 'অর্ডার সম্পন্ন করা যায়নি।' : 'Could not place the order.')
        );
        return;
      }

      setPlacedOrder({
        orderNumber: json.data.orderNo,
        totalAmount: json.data.total,
        customerName: name.trim(),
        customerPhone: phone,
        recipientAddress: address,
        district,
        division,
        paymentMethod,
        items: [
          {
            productNameEn: selectedProduct.nameEn,
            productNameBn: selectedProduct.nameBn,
            unitPrice: selectedProduct.salePrice,
            quantity,
            totalPrice: selectedProduct.salePrice * quantity,
          },
        ],
      });
    } catch (err) {
      console.error('Express order failed:', err);
      setOrderError(
        isBn ? 'সার্ভারের সাথে সংযোগ করা যায়নি।' : 'Could not reach the server.'
      );
    } finally {
      setIsPlacing(false);
    }
  };

  // 🎉 ORDER SUCCESS CONFIRMATION RECEIPT
  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/30 bg-card p-6 sm:p-10 text-center space-y-6 shadow-xl animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-4xl mx-auto border border-emerald-500/40 shadow-inner">
          ✓
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <span>🎉</span>
            <span>{isBn ? 'অর্ডার সফলভাবে প্রাপ্ত হয়েছে' : 'Order Placed Successfully'}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {isBn ? 'আপনার অর্ডারের জন্য ধন্যবাদ!' : 'Thank you for your order!'}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isBn
              ? `অর্ডার আইডি: #${placedOrder.orderNumber} — আমাদের টিম শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করে ওষুধ ডেলিভারির ব্যবস্থা করবে।`
              : `Order ID: #${placedOrder.orderNumber} — Our dispatch team will confirm your delivery shortly.`}
          </p>
        </div>

        {/* Order Details Receipt Box */}
        <div className="p-5 rounded-2xl bg-secondary/50 border border-border text-left text-xs space-y-3 font-mono">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-muted-foreground">{isBn ? 'অর্ডার নম্বর:' : 'Order No:'}</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">#{placedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{isBn ? 'ওষুধ:' : 'Item:'}</span>
            <span className="font-bold text-foreground text-right">
              {isBn ? selectedProduct.nameBn : selectedProduct.nameEn} ({quantity} {isBn ? 'টি' : 'units'})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{isBn ? 'প্রাপকের নাম ও ফোন:' : 'Customer:'}</span>
            <span className="font-bold text-foreground">{placedOrder.customerName} ({placedOrder.customerPhone})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{isBn ? 'ডেলিভারি ঠিকানা:' : 'Address:'}</span>
            <span className="font-bold text-foreground text-right max-w-[240px] truncate">
              {placedOrder.recipientAddress}, {placedOrder.district}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
            <span className="font-bold text-emerald-600 uppercase">
              {paymentMethod === 'cod' ? (isBn ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery') : paymentMethod}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-border pt-2 text-sm font-extrabold">
            <span>{isBn ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'}</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-base">{fmtMoney(totalAmount, locale)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/products"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {isBn ? 'আরও ওষুধ দেখুন →' : 'Continue Shopping →'}
          </Link>
          <Link
            href="/admin/orders"
            className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 transition-colors"
          >
            {isBn ? 'অ্যাডমিন প্যানেলে দেখুন ⚙️' : 'View in Admin Panel ⚙️'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Campaign Trust & Urgency Banner */}
      <div className="rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl">🚀</span>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base leading-tight">
              {isBn ? 'সোশ্যাল মিডিয়া স্পেশাল অফার ও দ্রুত ডেলিভারি' : 'Special Campaign Offer & Express Delivery'}
            </h2>
            <p className="text-xs text-emerald-100 opacity-90 mt-0.5">
              {isBn ? 'কোনো লগইন ছাড়াই ১ মিনিটে অর্ডার কনফার্ম করুন' : 'Instant 1-minute order with zero login required'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold tracking-wide">
            ✓ {isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-200 text-xs font-bold hidden sm:inline-block">
            🔒 DGDA Approved
          </span>
        </div>
      </div>

      {/* Main 1-Page Express Order Form */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product Spotlight & Quantity Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Product Showcase Card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-secondary/50 border border-border p-2 flex items-center justify-center shrink-0 overflow-hidden">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.nameEn}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-4xl">💊</span>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                    {selectedProduct.manufacturerName || 'Square Pharmaceuticals Ltd.'}
                  </span>
                  {isCold && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                      ❄️ 2-8°C Cold Chain
                    </span>
                  )}
                </div>

                <h1 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                  {isBn ? selectedProduct.nameBn : selectedProduct.nameEn}
                </h1>

                {selectedProduct.genericName && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Generic: {selectedProduct.genericName}
                  </p>
                )}

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl font-black text-foreground font-display">
                    {fmtMoney(selectedProduct.salePrice, locale)}
                  </span>
                  {selectedProduct.mrp > selectedProduct.salePrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      MRP {fmtMoney(selectedProduct.mrp, locale)}
                    </span>
                  )}
                  {selectedProduct.packSize && (
                    <span className="text-xs text-muted-foreground">({selectedProduct.packSize})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Product Switcher if multiple products available */}
            {allProducts.length > 1 && (
              <div className="space-y-2 pt-3 border-t border-border">
                <label className="block text-xs font-semibold text-muted-foreground">
                  {isBn ? 'অন্য ওষুধ পছন্দ করুন:' : 'Switch Campaign Product:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {allProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className={`p-2 rounded-xl text-left text-xs border transition-all ${
                        selectedProduct.id === p.id
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                          : 'border-border hover:border-emerald-500/50 text-foreground'
                      }`}
                    >
                      <div className="truncate">{isBn ? p.nameBn : p.nameEn}</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                        {fmtMoney(p.salePrice, locale)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Quantity Selector & Quick Presets */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {isBn ? 'পরিমাণ (প্যাক সংখ্যা):' : 'Order Quantity:'}
                </span>
                <span className="text-xs text-emerald-600 font-semibold">
                  {quantity > 1 && savings > 0 ? (
                    isBn ? `সাশ্রয়: ${fmtMoney(savings, locale)}` : `Total Savings: ${fmtMoney(savings, locale)}`
                  ) : (
                    isBn ? 'স্টকে আছে' : 'In Stock'
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Stepper +/- */}
                <div className="flex items-center border border-border rounded-2xl bg-secondary/40 overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center text-base font-bold hover:bg-secondary active:scale-95 transition-colors cursor-pointer text-foreground"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold font-mono text-foreground select-none">
                    {fmtNumber(quantity, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center text-base font-bold hover:bg-secondary active:scale-95 transition-colors cursor-pointer text-foreground"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        quantity === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-card border-border hover:border-emerald-500 text-foreground'
                      }`}
                    >
                      {preset} {isBn ? 'টি' : 'pcs'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Withdrawal Period Notice */}
            {(selectedProduct.withdrawalMeatDays! > 0 || selectedProduct.withdrawalMilkHours! > 0) && (
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <span>⏱️</span>
                  <span>{isBn ? 'উইথড্রয়াল পিরিয়ড নোটিশ:' : 'Withdrawal Period Notice:'}</span>
                </span>
                <p className="text-[11px] opacity-90">
                  {isBn
                    ? `মাংস: ${selectedProduct.withdrawalMeatDays || 0} দিন | দুধ: ${selectedProduct.withdrawalMilkHours || 0} ঘণ্টা। ওষুধ প্রয়োগকালীন প্রাণীর খাদ্য ব্যবহারে সতর্কতা অবলম্বন করুন।`
                    : `Meat: ${selectedProduct.withdrawalMeatDays || 0} days | Milk: ${selectedProduct.withdrawalMilkHours || 0} hrs.`}
                </p>
              </div>
            )}
          </div>

          {/* Delivery & Customer Info Box */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <span>📍</span>
                <span>{isBn ? 'ডেলিভারি ঠিকানা ও ফোন নম্বর' : 'Delivery Details & Phone'}</span>
              </h3>
              <button
                type="button"
                onClick={handleAutofillDemo}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                ⚡ {isBn ? 'ডেমো খামারের ঠিকানা দিন' : 'Autofill Demo Farm'}
              </button>
            </div>

            {/* Real-time Draft Saving Status Indicator */}
            {syncStatus !== 'idle' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {syncStatus === 'syncing'
                    ? isBn
                      ? 'অর্ডার ড্রাফট ও মোবাইল নম্বর সংরক্ষণ হচ্ছে...'
                      : 'Saving order draft...'
                    : isBn
                    ? '✓ মোবাইল নম্বর ও ড্রাফট সংরক্ষিত হয়েছে'
                    : '✓ Phone & draft lead saved'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {isBn ? 'মোবাইল নম্বর (৮৮০...)' : 'Mobile Phone (01...)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background font-mono text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {isBn ? 'ডেলিভারি কনফার্মেশনের জন্য কল করা হবে' : 'We will call this number to confirm delivery'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {isBn ? 'আপনার নাম / খামারের নাম' : 'Full Name / Farm Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? 'উদাঃ ডা. আনিসুর রহমান / আলম পোল্ট্রি' : 'e.g. Dr. Anisur Rahman'}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {isBn ? 'বিভাগ' : 'Division'}
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-bold text-foreground cursor-pointer"
                >
                  <option value="Dhaka">Dhaka (ঢাকা)</option>
                  <option value="Chattogram">Chattogram (চট্টগ্রাম)</option>
                  <option value="Rajshahi">Rajshahi (রাজশাহী)</option>
                  <option value="Khulna">Khulna (খুলনা)</option>
                  <option value="Mymensingh">Mymensingh (ময়মনসিংহ)</option>
                  <option value="Sylhet">Sylhet (সিলেট)</option>
                  <option value="Rangpur">Rangpur (রংপুর)</option>
                  <option value="Barishal">Barishal (বরিশাল)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {isBn ? 'জেলা' : 'District'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={isBn ? 'উদাঃ গাজীপুর, কুমিল্লা' : 'e.g. Gazipur'}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {isBn ? 'উপজেলা / থানা' : 'Upazila / Thana'}
                </label>
                <input
                  type="text"
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  placeholder={isBn ? 'উদাঃ জয়দেবপুর' : 'e.g. Joydebpur'}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {isBn ? 'পূর্ণাঙ্গ ঠিকানা (গ্রাম / সড়ক / বাজার / বাড়ি)' : 'Full Delivery Address'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isBn ? 'উদাঃ মাস্টার পাড়া, রহমান ডেইরি ফার্ম, বাজার সংলগ্ন' : 'e.g. Master Para, Near Central Mosque'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Cost Breakdown, Payment, and Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-xs sticky top-24">
            <h3 className="font-extrabold text-base text-foreground border-b border-border pb-3 flex items-center justify-between">
              <span>{isBn ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary'}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {quantity} {isBn ? 'টি প্যাক' : 'item(s)'}
              </span>
            </h3>

            {/* Line Item Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>{isBn ? 'ওষুধের মূল্য' : 'Medicine Subtotal'}</span>
                <span className="font-bold text-foreground font-display text-sm">{fmtMoney(subtotal, locale)}</span>
              </div>

              {isCold && (
                <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-500/20">
                  <span>{isBn ? '❄️ কোল্ড চেইন কুলার বক্স' : '❄️ Cold Chain Packing'}</span>
                  <span className="font-bold font-display">{fmtMoney(coldChainFee, locale)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-muted-foreground">
                <span>
                  {isBn
                    ? division === 'Dhaka'
                      ? 'ডেলিভারি চার্জ (ঢাকার ভিতরে)'
                      : 'ডেলিভারি চার্জ (ঢাকার বাইরে)'
                    : `Shipping Fee (${division})`}
                </span>
                <span className="font-bold text-foreground font-display">{fmtMoney(deliveryFee, locale)}</span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-foreground block">
                    {isBn ? 'সর্বমোট পরিশোধযোগ্য' : 'Total Payable'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isBn ? '(পণ্য গ্রহণের সময় মূল্য পরিশোধ)' : '(Pay upon delivery)'}
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display">
                  {fmtMoney(totalAmount, locale)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <label className="block text-xs font-bold text-foreground">
                {isBn ? 'পেমেন্ট মাধ্যম বেছে নিন:' : 'Payment Method:'}
              </label>

              <div className="space-y-2">
                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-border hover:border-emerald-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="express_payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      {isBn ? '💵 ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {isBn ? 'পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন' : 'Pay when you receive the product'}
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setPaymentMethod('bkash')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bkash'
                      ? 'border-pink-600 bg-pink-50/50 dark:bg-pink-950/30'
                      : 'border-border hover:border-pink-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="express_payment"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                    className="accent-pink-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      bKash (বিকাশ)
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {isBn ? 'ইনস্ট্যান্ট মোবাইল ওয়ালেট পেমেন্ট' : 'Instant mobile wallet payment'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Server-side rejection: out of stock, unserviceable cold-chain
                zone, prescription required. Shown instead of a fake receipt. */}
            {orderError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm leading-relaxed"
              >
                {orderError}
              </div>
            )}

            {/* Big Express Order Placement CTA */}
            <button
              type="submit"
              disabled={isPlacing}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all text-center cursor-pointer active:scale-98"
            >
              {isPlacing
                ? isBn
                  ? 'অর্ডার প্রক্রিয়াকরণ হচ্ছে...'
                  : 'Placing Your Order...'
                : isBn
                ? 'অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি) →'
                : 'Confirm Express Order (COD) →'}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span>🔒 SSL সিকিউরড</span>
              <span>•</span>
              <span>⚡ ২৪-৪৮ ঘণ্টায় সারা দেশে ডেলিভারি</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
