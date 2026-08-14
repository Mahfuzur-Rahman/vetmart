// app/[locale]/admin/settings/page.tsx
// Admin Settings, Delivery Zones & System Configuration (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminSettingsForm } from '@/components/admin/AdminSettingsForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
          {loc === 'bn' ? 'সিস্টেম সেটিংস' : 'System Settings'}
        </h1>
        <p className="text-sm text-[#787774] mt-0.5">
          {loc === 'bn'
            ? 'ডেলিভারি জোন রেট, এসএমএস গেটওয়ে কনফিগ ও প্ল্যাটফর্ম সিস্টেম সেটিংস'
            : 'Delivery zone rates, SMS gateway config, and platform system settings'}
        </p>
      </div>

      {/* Interactive Settings Form */}
      <AdminSettingsForm locale={loc} />
    </div>
  );
}
