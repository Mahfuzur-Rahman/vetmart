'use client';

import { useState, useRef, useEffect } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { fmtMoney, fmtNumber } from '@/lib/i18n/number';
import { useCart } from '@/lib/context/CartContext';
import { isValidBdPhone, sanitizeBdPhone } from '@/lib/validation/phone';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
}

export function CheckoutForm({ locale }: Props) {
  const isBn = locale === 'bn';
  const { items, subtotal, estDeliveryFee, grandTotal, clearCart, isHydrated } =
    useCart();

  // Contact & Shipping Form State — only Phone, Name, Address collected from customer.
  // Division, district, upazila, and payment method kept as defaults; admins fill in later.
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash_direct' | 'sslcommerz'>('cod');
  
  // Submission & Lead Capture State
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [leadDraftId, setLeadDraftId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved'>('idle');

  const idempotencyKeyRef = useRef<string | null>(null);
  const lastSyncHash = useRef<string>('');

  const deliveryFee = estDeliveryFee;
  const totalAmount = grandTotal;

  // Real-time Incomplete Order / Abandoned Cart Capture to PostgreSQL
  useEffect(() => {
    const cleanedPhone = sanitizeBdPhone(phone);
    if (!isValidBdPhone(cleanedPhone) || items.length === 0) {
      return;
    }

    const currentHash = `${cleanedPhone}|${name}|${address}|${items.map(i => `${i.product.id}:${i.qty}`).join(',')}`;
    if (currentHash === lastSyncHash.current) return;

    setSyncStatus('syncing');

    const timer = setTimeout(async () => {
      lastSyncHash.current = currentHash;

      const leadItems = items.map((item) => ({
        productId: item.product.id,
        productSlug: item.product.slug,
        productNameEn: item.product.nameEn,
        productNameBn: item.product.nameBn,
        unitPrice: item.product.salePrice,
        quantity: item.qty,
        totalPrice: item.product.salePrice * item.qty,
        packSize: item.product.packSize ?? null,
        imageUrl: item.product.imageUrl ?? null,
      }));

      const leadPayload = {
        id: leadDraftId || undefined,
        phone: cleanedPhone,
        name: name.trim() || null,
        address: address.trim() || null,
        division: 'Dhaka',
        district: 'Dhaka',
        items: leadItems,
        subtotal,
        deliveryFee,
        totalAmount,
        utmSource: 'storefront_cart',
        utmMedium: 'checkout_form',
      };

      try {
        const res = await fetch('/api/v1/incomplete-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload),
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.data?.leadId) {
            setLeadDraftId(json.data.leadId);
          }
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 3500);
        }
      } catch (err) {
        console.error('Anonymous cart lead capture failed:', err);
        setSyncStatus('idle');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [phone, name, address, items, subtotal, deliveryFee, totalAmount, leadDraftId]);

  /**
   * Place the order through genuine PostgreSQL express orders endpoint.
   */
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setOrderError(isBn ? 'আপনার কার্ট খালি।' : 'Your cart is empty.');
      return;
    }

    const cleanedPhone = sanitizeBdPhone(phone);
    if (!isValidBdPhone(cleanedPhone)) {
      setOrderError(
        isBn
          ? 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01712345678)'
          : 'Please enter a valid 11-digit mobile number (e.g. 01712345678)'
      );
      return;
    }

    setIsPlacing(true);
    setOrderError(null);

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
          items: items.map((i) => {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.product.id);
            return {
              ...(isUuid ? { productId: i.product.id } : {}),
              slug: i.product.slug,
              qty: i.qty,
            };
          }),
          recipientName: name.trim() || 'Valued Customer',
          phone: cleanedPhone,
          addressLine: address.trim(),
          paymentMethod: paymentMethod,
          sourceChannel: 'storefront_checkout',
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

      setPlacedOrder(json.data.orderNo);
      clearCart();
    } catch (err) {
      console.error('Checkout failed:', err);
      setOrderError(isBn ? 'সার্ভারের সাথে সংযোগ করা যায়নি।' : 'Could not reach the server.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-12 text-center space-y-6 shadow-lg max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-4xl mx-auto border border-emerald-500/40">
          ✓
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            {isBn ? 'অর্ডার সফলভাবে প্রাপ্ত হয়েছে' : 'Order Placed Successfully'}
          </span>
          <h2 className="text-2xl font-extrabold text-foreground font-display">
            {isBn ? 'আপনার অর্ডারের জন্য ধন্যবাদ!' : 'Thank you for your order!'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isBn
              ? `অর্ডার নম্বর: #${placedOrder} — আমাদের ডেলিভারি টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।`
              : `Order Number: #${placedOrder} — Our dispatch team will confirm your order via SMS.`}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-left text-xs space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'প্রাপক:' : 'Recipient:'}</span>
            <span className="font-bold text-foreground">{name || 'Customer'} ({phone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'ডেলিভারি ঠিকানা:' : 'Address:'}</span>
            <span className="font-bold text-foreground">{address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
            <span className="font-bold text-emerald-600 uppercase">
              {paymentMethod === 'cod' ? 'COD' : paymentMethod === 'bkash_direct' ? 'bKash' : 'SSLCommerz'}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
            <span>{isBn ? 'মোট পরিশোধিত:' : 'Total Amount:'}</span>
            <span className="text-emerald-600 font-display">{fmtMoney(totalAmount, locale)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/products"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all"
          >
            {isBn ? 'আরও কেনাকাটা করুন →' : 'Continue Shopping →'}
          </Link>
          <Link
            href="/admin/orders"
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm border border-zinc-700 transition-colors"
          >
            {isBn ? 'অ্যাডমিনে অর্ডারটি দেখুন ⚙️' : 'View in Admin Panel ⚙️'}
          </Link>
        </div>
      </div>
    );
  }

  const isPhoneValid = isValidBdPhone(sanitizeBdPhone(phone));

  return (
    <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Shipping & Payment Info */}
      <div className="md:col-span-2 space-y-6">
        
        {/* 1. Top Priority Mobile Number Card (Mandatory / First Field) */}
        <div className="rounded-3xl border-2 border-emerald-500/40 bg-card p-5 sm:p-6 space-y-3 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">
                  {isBn ? 'মোবাইল নম্বর' : 'Mobile Phone Number'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isBn ? 'অর্ডার কনফার্মেশন ও ডেলিভারি আপডেটের জন্য' : 'For order confirmation and SMS updates'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold tracking-wide border border-emerald-500/30 uppercase">
              {isBn ? 'বাধ্যতামূলক' : 'Required'}
            </span>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground border-r border-border pr-2.5">
              <span>🇧🇩</span>
              <span>+880</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              required
              className={`w-full pl-24 pr-10 py-3.5 rounded-2xl border ${
                isPhoneValid
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  : 'border-input focus:ring-2 focus:ring-primary/40'
              } bg-background font-mono text-foreground font-bold text-base transition-all`}
            />
            {isPhoneValid && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                ✓
              </div>
            )}
          </div>

          {/* Auto-save sync status feedback */}
          {syncStatus === 'syncing' && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <span className="w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>{isBn ? 'ড্রাফট আপডেট হচ্ছে...' : 'Saving draft order...'}</span>
            </div>
          )}
          {syncStatus === 'saved' && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-0.5">
              <span>✓</span>
              <span>{isBn ? 'ড্রাফট সংরক্ষিত হয়েছে' : 'Draft auto-saved securely'}</span>
            </div>
          )}
        </div>

        {/* 2. Recipient & Delivery Address Box */}
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>📍</span>
              <span>{isBn ? 'প্রাপকের নাম ও ডেলিভারি ঠিকানা' : 'Recipient Name & Delivery Address'}</span>
            </h2>
          </div>

          <div className="text-sm">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isBn ? 'আপনার নাম' : 'Your Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBn ? 'উদা: মোঃ রফিকুল ইসলাম' : 'e.g. Rafiqul Islam'}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-input bg-background font-medium text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isBn ? 'পূর্ণাঙ্গ ঠিকানা (গ্রাম/পাড়া/রোড/জেলা/বিভাগসহ)' : 'Full Address (Village, Road, District, Division)'}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isBn ? 'উদা: চৌধুরী বাড়ি, জয়দেবপুর, গাজীপুর, ঢাকা' : 'e.g. Chowdhury Bari, Joydebpur, Gazipur, Dhaka'}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-input bg-background font-medium text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="border-t border-border pt-4 mt-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              {isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-border bg-background hover:bg-secondary/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="accent-emerald-600 w-4 h-4" />
                  <span className="font-bold text-sm">COD</span>
                </div>
                <span className="text-xs text-muted-foreground pl-6 leading-tight">
                  {isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
                </span>
              </label>

              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'bkash_direct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-border bg-background hover:bg-secondary/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="paymentMethod" value="bkash_direct" checked={paymentMethod === 'bkash_direct'} onChange={() => setPaymentMethod('bkash_direct')} className="accent-emerald-600 w-4 h-4" />
                  <span className="font-bold text-sm">bKash</span>
                </div>
                <span className="text-xs text-muted-foreground pl-6 leading-tight">
                  {isBn ? 'বিকাশ অনলাইন পেমেন্ট' : 'Secure Mobile Pay'}
                </span>
              </label>

              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'sslcommerz' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-border bg-background hover:bg-secondary/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="paymentMethod" value="sslcommerz" checked={paymentMethod === 'sslcommerz'} onChange={() => setPaymentMethod('sslcommerz')} className="accent-emerald-600 w-4 h-4" />
                  <span className="font-bold text-sm">Card / Net</span>
                </div>
                <span className="text-xs text-muted-foreground pl-6 leading-tight">
                  {isBn ? 'ডেবিট/ক্রেডিট কার্ড' : 'SSLCommerz'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary Side Panel */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-xs h-fit sticky top-24">
          <h3 className="font-bold text-base text-foreground border-b border-border pb-3">
            {isBn ? 'অর্ডার সামারি' : 'Order Summary'}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {isBn
                  ? `ওষুধের মূল্য (${fmtNumber(items.length, locale)} টি পণ্য)`
                  : `Subtotal (${items.length} ${items.length === 1 ? 'item' : 'items'})`}
              </span>
              <span className="font-semibold text-foreground font-display">{fmtMoney(subtotal, locale)}</span>
            </div>

            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{isBn ? 'ডেলিভারি চার্জ' : 'Shipping Fee'}</span>
              <span className={`font-semibold font-display ${deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {deliveryFee === 0 ? (isBn ? '🎉 ফ্রি!' : '🎉 Free!') : fmtMoney(deliveryFee, locale)}
              </span>
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-foreground">
              <span>{isBn ? 'সর্বমোট' : 'Total Payable'}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-display">
                {fmtMoney(totalAmount, locale)}
              </span>
            </div>
          </div>

          {orderError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs leading-relaxed"
            >
              {orderError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPlacing || !isHydrated || items.length === 0}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all text-center cursor-pointer"
          >
            {isPlacing
              ? isBn
                ? 'অর্ডার প্রসেসিং হচ্ছে...'
                : 'Processing Order...'
              : isBn
              ? 'অর্ডার নিশ্চিত করুন →'
              : 'Place Order Now →'}
          </button>

          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {isBn ? 'অর্ডারে যেকোনো সহায়তায় কল করুন:' : 'Need help with your order?'}{' '}
              <a href="tel:01353920501" className="font-bold text-emerald-600 hover:underline">
                {isBn ? '০১৩৫৩৯২০৫০১' : '01353920501'}
              </a>
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
