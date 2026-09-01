// app/[locale]/admin/(dashboard)/admins/page.tsx
// Superadmin Management & Live Role Access Control (§14.1)
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { AdminManagementClient } from '@/components/admin/AdminManagementClient';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminManagementPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  const auth = await getAuthenticatedAdmin();
  if (!auth) {
    redirect(`/${locale}/admin/login`);
  }

  // Strictly require Superadmin (*) or admin.manage
  if (!auth.has('admin.manage')) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-red-200 text-center space-y-3 my-12 max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto font-bold">
          🚫
        </div>
        <h2 className="text-lg font-bold text-[#2F3437]">
          {loc === 'bn' ? 'অনুমতি নেই' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-[#787774] leading-relaxed">
          {loc === 'bn'
            ? 'এই পৃষ্ঠাটি শুধুমাত্র সুপার অ্যাডমিনদের জন্য সংরক্ষিত।'
            : 'This control console is exclusively restricted to Super Admin operators.'}
        </p>
      </div>
    );
  }

  return <AdminManagementClient locale={loc} currentAdminId={auth.admin.id} />;
}
