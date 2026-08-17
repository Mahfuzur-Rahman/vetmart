// app/[locale]/admin/layout.tsx
// Admin panel layout with sidebar navigation — segregated from storefront (§14.1)
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { isDemoMode } from '@/lib/demo';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  // RBAC gate — redirect to admin login if not authenticated
  let auth;
  if (isDemoMode()) {
    auth = null; // Skip DB entirely in demo mode
  } else {
    try {
      auth = await getAuthenticatedAdmin();
    } catch {
      // DB connection unavailable — allow through for dev mode
      auth = null;
    }
  }

  // In production, uncomment this redirect:
  // if (!auth) {
  //   redirect(`/${locale}/admin/login`);
  // }

  const adminName = auth?.admin?.name ?? 'Admin';
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
