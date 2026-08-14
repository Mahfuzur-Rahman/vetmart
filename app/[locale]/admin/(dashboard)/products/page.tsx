// app/[locale]/admin/products/page.tsx
// Admin Products Management Table (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminProductsTable } from '@/components/admin/AdminProductsTable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
            {loc === 'bn' ? 'পণ্য ব্যবস্থাপনা' : 'Product Management'}
          </h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {loc === 'bn' ? 'DGDA নিবন্ধিত ওষুধ ও পশু স্বাস্থ্য পণ্য পরিচালনা' : 'Manage DGDA-registered drugs and animal health products'}
          </p>
        </div>

        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
        >
          <span>+</span>
          <span>{loc === 'bn' ? 'নতুন পণ্য যোগ করুন' : 'Add New Product'}</span>
        </button>
      </div>

      {/* Interactive Products Table */}
      <AdminProductsTable locale={loc} />
    </div>
  );
}
