// app/[locale]/admin/prescriptions/page.tsx
// Admin Prescription Review & Approval Queue (§5.5, §14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminPrescriptionsQueue } from '@/components/admin/AdminPrescriptionsQueue';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPrescriptionsPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
          {loc === 'bn' ? 'প্রেসক্রিপশন রিভিউ ও অনুমোদন' : 'Prescription Review & Approval'}
        </h1>
        <p className="text-sm text-[#787774] mt-0.5">
          {loc === 'bn'
            ? 'Rx-required অর্ডারের জন্য নিবন্ধিত ভেটেরিনারি সার্জনের প্রেসক্রিপশন যাচাই'
            : 'Verify prescriptions from registered veterinary surgeons for Rx-required orders'}
        </p>
      </div>

      {/* DGDA Compliance Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="text-lg">⚠️</span>
          <h3 className="font-bold text-sm">
            {loc === 'bn' ? 'ডিজিডিএ বিধিমালা অনুযায়ী আবশ্যক' : 'DGDA Regulatory Requirement'}
          </h3>
        </div>
        <p className="text-xs text-[#787774] leading-relaxed">
          {loc === 'bn'
            ? 'সকল ভেটেরিনারি অ্যান্টিবায়োটিক, নির্দেশিত ইনজেকশন ও Rx-flagged ওষুধের ক্ষেত্রে গ্রাহকের আপলোড করা প্রেসক্রিপশন বৈধ কিনা যাচাই করুন। প্রেসক্রিপশনে অবশ্যই নিবন্ধিত ভেটেরিনারি সার্জনের নাম, BVC রেজিস্ট্রেশন নম্বর ও স্বাক্ষর থাকতে হবে।'
            : 'Verify uploaded prescriptions for all veterinary antibiotics, controlled injections, and Rx-flagged drugs. Each prescription must include the registered veterinary surgeon name, BVC registration number, and signature.'}
        </p>
      </div>

      {/* Interactive Prescriptions Queue */}
      <AdminPrescriptionsQueue locale={loc} />
    </div>
  );
}
