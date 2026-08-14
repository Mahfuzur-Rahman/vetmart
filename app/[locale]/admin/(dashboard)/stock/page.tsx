// app/[locale]/admin/stock/page.tsx
// Admin Stock & Batch Management (§2 rule 3, §14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminStockLedger } from '@/components/admin/AdminStockLedger';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminStockPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
            {loc === 'bn' ? 'স্টক ও ব্যাচ ব্যবস্থাপনা' : 'Stock & Batch Management'}
          </h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {loc === 'bn'
              ? 'FEFO বরাদ্দ, ব্যাচ ট্র্যাকিং ও অপরিবর্তনীয় স্টক লেজার (§2 rule 3)'
              : 'FEFO allocation, batch tracking & immutable stock ledger (§2 rule 3)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>{loc === 'bn' ? 'নতুন ব্যাচ রেকর্ড' : 'Record New Batch'}</span>
          </button>
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7F6F3] text-[#2F3437] font-bold text-xs border border-[#EAEAEA] shadow-xs transition-all flex items-center gap-2"
          >
            <span>📥</span>
            <span>{loc === 'bn' ? 'স্টক অ্যাডজাস্ট' : 'Stock Adjust'}</span>
          </button>
        </div>
      </div>

      {/* Immutable Ledger Rules Card */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-800">
          <span className="text-lg">🔒</span>
          <h3 className="font-bold text-sm">
            {loc === 'bn' ? 'অপরিবর্তনীয় স্টক লেজার নিয়ম' : 'Immutable Stock Ledger Rules'}
          </h3>
        </div>
        <ul className="text-xs text-[#787774] space-y-1 list-disc list-inside">
          <li>
            {loc === 'bn'
              ? 'স্টক সরাসরি পরিবর্তন করা যাবে না — সর্বদা stock_ledger-এ delta এন্ট্রি যোগ করুন'
              : 'Never mutate stock directly — always append delta entries to stock_ledger'}
          </li>
          <li>
            {loc === 'bn'
              ? '≤৬০ দিনের মেয়াদ থাকা ব্যাচ স্বয়ংক্রিয়ভাবে বিক্রিযোগ্য স্টক থেকে বাদ (§2 rule 2)'
              : 'Batches with ≤60 days to expiry are auto-excluded from sellable stock (§2 rule 2)'}
          </li>
          <li>
            {loc === 'bn'
              ? 'FEFO (First Expiry, First Out) অনুযায়ী ব্যাচ বরাদ্দ হয়'
              : 'Batches are allocated by FEFO (First Expiry, First Out) ordering'}
          </li>
        </ul>
      </div>

      {/* Interactive Stock Ledger Log */}
      <AdminStockLedger locale={loc} />
    </div>
  );
}
