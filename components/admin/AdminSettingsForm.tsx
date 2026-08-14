'use client';

import { useState } from 'react';

interface Props {
  locale: string;
}

export function AdminSettingsForm({ locale }: Props) {
  const isBn = locale === 'bn';

  const [dhakaRate, setDhakaRate] = useState('70');
  const [outsideRate, setOutsideRate] = useState('130');
  const [coldChainFee, setColdChainFee] = useState('30');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Delivery Zones Configuration */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
          <h2 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
            <span>🚚</span>
            <span>{isBn ? 'ডেলিভারি জোন ও রেট সেটিংস' : 'Delivery Zones & Rates'}</span>
          </h2>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
            {isBn ? 'সম্পাদনাযোগ্য' : 'Editable'}
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#2F3437]">
              <span>Dhaka City Zone (ঢাকা সিটি জোন)</span>
              <span className="text-emerald-700 font-mono">1-2 Days ETA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#787774] font-medium">{isBn ? 'ডেলিভারি চার্জ (৳):' : 'Shipping Fee (৳):'}</span>
              <input
                type="number"
                value={dhakaRate}
                onChange={(e) => setDhakaRate(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg bg-white border border-[#EAEAEA] font-mono text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#2F3437]">
              <span>Outside Dhaka (সারাদেশ জোন)</span>
              <span className="text-sky-700 font-mono">2-4 Days ETA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#787774] font-medium">{isBn ? 'ডেলিভারি চার্জ (৳):' : 'Shipping Fee (৳):'}</span>
              <input
                type="number"
                value={outsideRate}
                onChange={(e) => setOutsideRate(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-lg bg-white border border-[#EAEAEA] font-mono text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
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

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {saved ? (
              <span>✓ {isBn ? 'সেটিংস সংরক্ষিত হয়েছে!' : 'Settings Saved!'}</span>
            ) : (
              <span>{isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save System Settings'}</span>
            )}
          </button>
        </div>
      </div>

      {/* System Drivers */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 space-y-4 shadow-xs">
        <h2 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
          <span>🔌</span>
          <span>{isBn ? 'সিস্টেম ড্রাইভার ও পোর্টাবিলিটি (§3)' : 'System Drivers & Portability (§3)'}</span>
        </h2>

        <div className="space-y-2 text-xs font-mono">
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
