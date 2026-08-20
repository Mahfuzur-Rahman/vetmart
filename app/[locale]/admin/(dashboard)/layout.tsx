// app/[locale]/admin/layout.tsx
// Admin panel layout with sidebar navigation — segregated from storefront (§14.1)
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { isDemoMode } from '@/lib/demo';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  // RBAC gate. Demo mode has no admins table, and every write path refuses to
  // run in demo mode anyway, so the panel is browsable there without a session.
  let auth = null;

  if (!isDemoMode()) {
    auth = await getAuthenticatedAdmin();

    // This redirect used to be commented out, which left the whole admin panel
    // readable by anyone who knew the URL on a public deployment.
    if (!auth) {
      redirect(`/${locale}/admin/login`);
    }
  }

  const adminName = auth?.admin?.name ?? 'Demo Admin';
  const permissionKeys = auth ? Array.from(auth.permissions) : ['*'];

  return (
    <div className="flex min-h-dvh bg-[#F7F6F3] text-[#2F3437]">
      <AdminSidebar
        locale={loc}
        adminName={adminName}
        permissions={permissionKeys}
      />

      <main className="flex-1 w-full max-w-full overflow-x-hidden ml-0 lg:ml-64 min-h-dvh pt-14 lg:pt-0">
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
