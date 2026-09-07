'use client';

import { useState, useEffect } from 'react';

interface Props {
  locale: string;
}

export function AdminSettingsForm({ locale }: Props) {
  const isBn = locale === 'bn';

  const [deliveryChargeEnabled, setDeliveryChargeEnabled] = useState(false);
  const [dhakaRate, setDhakaRate] = useState('70');
  const [outsideRate, setOutsideRate] = useState('130');
  const [coldChainFee, setColdChainFee] = useState('30');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch settings from server on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.shipping) {
            const s = json.data.shipping;
            setDeliveryChargeEnabled(Boolean(s.deliveryChargeEnabled));
            setDhakaRate(((s.dhakaRate ?? 7000) / 100).toString());
            setOutsideRate(((s.outsideRate ?? 13000) / 100).toString());
            setColdChainFee(((s.coldChainFee ?? 3000) / 100).toString());
          }
        }
      } catch (err) {
        console.warn('Failed to load initial settings, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      shipping: {
        deliveryChargeEnabled,
        dhakaRate: Math.round(parseFloat(dhakaRate || '0') * 100),
        outsideRate: Math.round(parseFloat(outsideRate || '0') * 100),
        coldChainFee: Math.round(parseFloat(coldChainFee || '0') * 100),
      },
    };

    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Failed with status ${res.status}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error('Save settings error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Delivery Zones & Shipping Configuration */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3.5">
          <div className="space-y-0.5">
            <h2 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
              <span>🚚</span>
              <span>{isBn ? 'ডেলিভারি চার্জ ও রেট সেটিংস' : 'Delivery Charges & Rates'}</span>
            </h2>
            <p className="text-[11px] text-[#787774]">
              {isBn ? 'ডিফল্টভাবে ফ্রি ডেলিভারি সক্রিয় থাকে' : 'Default is free delivery nationwide'}
            </p>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
            {isBn ? 'সম্পাদনাযোগ্য' : 'Live Config'}
          </span>
        </div>

        {/* ON / OFF Toggle for Delivery Charge */}
        <div className={`p-4 rounded-2xl border transition-all ${
          deliveryChargeEnabled
            ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">
                  {isBn ? 'ডেলিভারি চার্জ সক্রিয়করণ (Delivery Charge)' : 'Delivery Charge Status'}
                </span>
                <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                  deliveryChargeEnabled
                    ? 'bg-amber-200/80 text-amber-900'
                    : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {deliveryChargeEnabled
                    ? (isBn ? 'চালু (Active)' : 'ON (Charges Apply)')
                    : (isBn ? 'ফ্রি ডেলিভারি (Free)' : 'OFF (Default: Free)')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {deliveryChargeEnabled
                  ? (isBn
                      ? 'অর্ডার চেকআউটে জোনভিত্তিক ডেলিভারি ফি যুক্ত হবে।'
                      : 'Delivery fee will be calculated at checkout based on the zones below.')
                  : (isBn
                      ? 'সব গ্রাহকের জন্য সারাদেশে ডেলিভারি সম্পূর্ণ ফ্রি (৳০)।'
                      : 'All orders nationwide receive 100% free delivery (৳0 default).')}
              </p>
            </div>

            {/* Switch button */}
            <button
              type="button"
              role="switch"
              aria-checked={deliveryChargeEnabled}
              onClick={() => setDeliveryChargeEnabled(!deliveryChargeEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                deliveryChargeEnabled ? 'bg-amber-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  deliveryChargeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Zone Rate Settings (Active when Delivery Charge is ON) */}
        <div className="space-y-4 text-xs">
          <div className={`p-3.5 rounded-xl border space-y-2 transition-all ${
            deliveryChargeEnabled
              ? 'bg-[#F7F6F3] border-[#EAEAEA]'
              : 'bg-slate-50/60 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex justify-between items-center font-bold text-[#2F3437]">
              <span>Dhaka City Zone (ঢাকা সিটি জোন)</span>
              <span className="text-emerald-700 font-mono">1-2 Days ETA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#787774] font-medium">{isBn ? 'ডেলিভারি চার্জ (৳):' : 'Shipping Fee (৳):'}</span>
              <input
                type="number"
                disabled={!deliveryChargeEnabled}
                value={dhakaRate}
                onChange={(e) => setDhakaRate(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg bg-white border border-[#EAEAEA] font-mono text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-100 disabled:text-slate-400"
              />
              {!deliveryChargeEnabled && (
                <span className="text-[10px] text-emerald-700 font-semibold">
                  ({isBn ? 'বর্তমানে কার্যকর: ফ্রি ৳০' : 'Currently effective: Free ৳0'})
                </span>
              )}
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border space-y-2 transition-all ${
            deliveryChargeEnabled
              ? 'bg-[#F7F6F3] border-[#EAEAEA]'
              : 'bg-slate-50/60 border-slate-200/60 opacity-60'
          }`}>
            <div className="flex justify-between items-center font-bold text-[#2F3437]">
              <span>Outside Dhaka (সারাদেশ জোন)</span>
              <span className="text-sky-700 font-mono">2-4 Days ETA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#787774] font-medium">{isBn ? 'ডেলিভারি চার্জ (৳):' : 'Shipping Fee (৳):'}</span>
              <input
                type="number"
                disabled={!deliveryChargeEnabled}
                value={outsideRate}
                onChange={(e) => setOutsideRate(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg bg-white border border-[#EAEAEA] font-mono text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-100 disabled:text-slate-400"
              />
              {!deliveryChargeEnabled && (
                <span className="text-[10px] text-emerald-700 font-semibold">
                  ({isBn ? 'বর্তমানে কার্যকর: ফ্রি ৳০' : 'Currently effective: Free ৳0'})
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#2F3437]">
              <span>❄️ Cold-Chain Cooler Box Charge</span>
              <span className="text-blue-700 font-mono">2-8°C Temp Control</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#787774] font-medium">{isBn ? 'কুলার বক্স চার্জ (৳):' : 'Packing Fee (৳):'}</span>
              <input
                type="number"
                value={coldChainFee}
                onChange={(e) => setColdChainFee(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg bg-white border border-[#EAEAEA] font-mono text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <span>⏳ {isBn ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving Settings...'}</span>
            ) : saved ? (
              <span>✓ {isBn ? 'সেটিংস সংরক্ষিত হয়েছে!' : 'Settings Saved Successfully!'}</span>
            ) : (
              <span>{isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save System Settings'}</span>
            )}
          </button>
        </div>
      </div>

      {/* System Drivers & Deployment Info */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 space-y-4 shadow-xs">
        <h2 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
          <span>🔌</span>
          <span>{isBn ? 'সিস্টেম ড্রাইভার ও পোর্টাবিলিটি (§3)' : 'System Drivers & Portability (§3)'}</span>
        </h2>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">Delivery Mode:</span>
            <span className={`font-bold ${deliveryChargeEnabled ? 'text-amber-700' : 'text-emerald-700'}`}>
              {deliveryChargeEnabled ? 'Configured Rates Active' : 'Default Free Delivery (৳0)'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">Storage Driver:</span>
            <span className="text-emerald-700 font-bold">local / sharp vector</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">Queue Engine:</span>
            <span className="text-emerald-700 font-bold">in-memory / mock</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">Payment Gateway:</span>
            <span className="text-emerald-700 font-bold">SSLCommerz / COD Mock</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">Courier Integration:</span>
            <span className="text-emerald-700 font-bold">Steadfast BD Driver</span>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between">
            <span className="text-[#2F3437] font-medium">SMS OTP Gateway:</span>
            <span className="text-emerald-700 font-bold">BulkSMS BD Driver</span>
          </div>
        </div>
      </div>
    </form>
  );
}
