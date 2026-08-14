// app/[locale]/admin/orders/page.tsx
// Admin Orders Operations Board (§14.1, §5.5)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminOrdersBoard } from '@/components/admin/AdminOrdersBoard';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOrdersPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
          {loc === 'bn' ? 'অর্ডার ম্যানেজমেন্ট' : 'Order Management'}
        </h1>
        <p className="text-sm text-[#787774] mt-0.5">
          {loc === 'bn'
            ? 'placed → processing → shipped → delivered স্ট্যাটাস ট্রানজিশন পরিচালনা'
            : 'Manage order status transitions: placed → processing → shipped → delivered'}
        </p>
      </div>

      {/* Interactive Orders Board */}
      <AdminOrdersBoard locale={loc} />

      {/* Order Lifecycle Documentation */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 space-y-3 shadow-xs">
        <h3 className="font-bold text-sm text-[#2F3437]">
          {loc === 'bn' ? 'অর্ডার লাইফসাইকেল (§5.5)' : 'Order Lifecycle (§5.5)'}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6368]">
          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold">placed</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold">awaiting_rx_review</span>
          <span className="text-[#787774]">(if Rx)</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold">processing</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono font-bold">shipped</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">delivered</span>
        </div>
        <p className="text-[11px] text-[#787774]">
          {loc === 'bn'
            ? 'প্রতিটি স্ট্যাটাস পরিবর্তন order_events টেবিলে অডিট লগ হিসেবে সংরক্ষিত হয়।'
            : 'Each status transition is recorded as an immutable audit event in the order_events table.'}
        </p>
      </div>
    </div>
  );
}
