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
  const { items, subtotal, coldChainFee, estDeliveryFee, grandTotal, clearCart, isHydrated } =
    useCart();

  // Contact & Shipping Form State
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  
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

    const currentHash = `${cleanedPhone}|${name}|${address}|${division}|${district}|${upazila}|${items.map(i => `${i.product.id}:${i.qty}`).join(',')}`;
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
        division,
        district,
        upazila: upazila.trim() || null,
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
  }, [phone, name, address, division, district, upazila, items, subtotal, deliveryFee, totalAmount, leadDraftId]);

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
          items: items.map((i) => ({ productId: i.product.id, slug: i.product.slug, qty: i.qty })),
          recipientName: name.trim() || 'Valued Customer',
          phone: cleanedPhone,
          division,
          district,
          upazila: upazila.trim() || undefined,
          addressLine: address.trim(),
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'sslcommerz',
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
            <span className="font-bold text-foreground">{address}, {district}, {division}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
            <span className="font-bold text-emerald-600 uppercase">{paymentMethod}</span>
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
              {isBn ? 'প্রাপকের নাম / খামারের নাম' : 'Recipient / Farm / Doctor Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBn ? 'উদা: মোঃ রফিকুল ইসলাম / রফিক ডেইরি ফার্ম' : 'e.g. Dr. Rafiqul Islam / Rafiq Dairy Farm'}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-input bg-background font-medium text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {isBn ? 'বিভাগ' : 'Division'}
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {isBn ? 'জেলা' : 'District'}
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={isBn ? 'উদা: গাজীপুর / ময়মনসিংহ' : 'e.g. Gazipur / Mymensingh'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background font-medium text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {isBn ? 'উপজেলা / থানা' : 'Upazila / Thana'}
              </label>
              <input
                type="text"
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                placeholder={isBn ? 'উদা: জয়দেবপুর / ভালুকা' : 'e.g. Joydebpur / Bhaluka'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background font-medium text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isBn ? 'পূর্ণাঙ্গ ঠিকানা (গ্রাম/পাড়া/রোড/বাড়ি নম্বর)' : 'Full Detailed Address'}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isBn ? 'উদা: চৌধুরী বাড়ি পোল্ট্রি খামার, জয়দেবপুর রোড' : 'e.g. Farm name, village, road, ward or landmark'}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-input bg-background font-medium text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* 3. Payment Method Selector */}
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>💳</span>
            <span>{isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <label
              onClick={() => setPaymentMethod('cod')}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'cod'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-border hover:border-emerald-500'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="accent-emerald-600"
              />
              <div>
                <span className="font-bold text-foreground block text-xs">
                  {isBn ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery'}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {isBn ? 'পণ্য পেয়ে মূল্য পরিশোধ' : 'Pay on receipt'}
                </span>
              </div>
            </label>

            <label
              onClick={() => setPaymentMethod('bkash')}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'bkash'
                  ? 'border-pink-600 bg-pink-50/50 dark:bg-pink-950/20'
                  : 'border-border hover:border-pink-500'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'bkash'}
                onChange={() => setPaymentMethod('bkash')}
                className="accent-pink-600"
              />
              <div>
                <span className="font-bold text-foreground block text-xs">bKash (বিকাশ)</span>
                <span className="text-[11px] text-muted-foreground block">
                  {isBn ? 'ইনস্ট্যান্ট পেমেন্ট' : 'Instant mobile wallet'}
                </span>
              </div>
            </label>

            <label
              onClick={() => setPaymentMethod('nagad')}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'nagad'
                  ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-950/20'
                  : 'border-border hover:border-orange-500'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'nagad'}
                onChange={() => setPaymentMethod('nagad')}
                className="accent-orange-600"
              />
              <div>
                <span className="font-bold text-foreground block text-xs">Nagad (নগদ)</span>
                <span className="text-[11px] text-muted-foreground block">
                  {isBn ? 'ডিজিটাল পেমেন্ট' : 'Digital MFS payment'}
                </span>
              </div>
            </label>
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

            {coldChainFee > 0 && (
              <div className="flex justify-between text-blue-600 dark:text-blue-400 text-xs">
                <span>{isBn ? '❄️ কোল্ড চেইন কুলার বক্স' : '❄️ Cold Chain Cooler Box'}</span>
                <span className="font-bold font-display">{fmtMoney(coldChainFee, locale)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{isBn ? 'ডেলিভারি চার্জ' : 'Shipping Fee'}</span>
              <span className="font-semibold text-foreground font-display">{fmtMoney(deliveryFee, locale)}</span>
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
        </div>
      </div>
    </form>
  );
}
