// app/[locale]/admin/reconciliation/page.tsx
// Admin Courier & Financial COD Reconciliation Board (§12, §14)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminReconciliationBoard } from '@/components/admin/AdminReconciliationBoard';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminReconciliationPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
          {loc === 'bn' ? 'কুরিয়ার সিওডি রিকনসিলিয়েশন' : 'Courier COD & Financial Reconciliation'}
        </h1>
        <p className="text-sm text-[#787774] mt-0.5">
          {loc === 'bn'
            ? 'Steadfast কুরিয়ার কালেকশন, ব্যাংক ডিপোজিট ও নেট প্রফিট ট্র্যাকিং'
            : 'Track Steadfast collections, corporate bank settlements, and net profit per delivery'}
        </p>
      </div>

      {/* Interactive Reconciliation Board */}
      <AdminReconciliationBoard locale={loc} />
    </div>
  );
}
