// components/admin/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import { Link, usePathname, useRouter } from '@/lib/i18n/navigation';
import { clearMockAdminSession } from '@/lib/mock-data/auth';
import type { Locale } from '@/lib/i18n/config';

interface AdminSidebarProps {
  locale: Locale;
  adminName: string;
  permissions: string[];
}

interface NavItem {
  label: { en: string; bn: string };
  href: string;
  icon: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
    href: '/admin',
    icon: '📊',
  },
  {
    label: { en: 'Products', bn: 'পণ্য সমূহ' },
    href: '/admin/products',
    icon: '💊',
    permission: 'product.read',
  },
  {
    label: { en: 'Categories & Classifications', bn: 'ক্যাটাগরি ও শ্রেণিবিভাগ' },
    href: '/admin/categories',
    icon: '🏷️',
    permission: 'category.read',
  },


  {
    label: { en: 'Stock & Batches', bn: 'স্টক ও ব্যাচ' },
    href: '/admin/stock',
    icon: '📦',
    permission: 'stock.read',
  },
  {
    label: { en: 'Orders & Dispatch', bn: 'অর্ডার ও কুরিয়ার' },
    href: '/admin/orders',
    icon: '🧾',
    permission: 'order.read',
  },
  {
    label: { en: 'COD Reconciliation', bn: 'সিওডি রিকনসিলিয়েশন' },
    href: '/admin/reconciliation',
    icon: '💰',
    permission: 'order.read',
  },
  {
    label: { en: 'Prescriptions', bn: 'প্রেসক্রিপশন' },
    href: '/admin/prescriptions',
    icon: '📋',
    permission: 'prescription.read',
  },
  {
    label: { en: 'Customers', bn: 'গ্রাহক তালিকা' },
    href: '/admin/customers',
    icon: '👥',
    permission: 'customer.read',
  },
  {
    label: { en: 'Settings', bn: 'সেটিংস' },
    href: '/admin/settings',
    icon: '⚙️',
    permission: 'settings.read',
  },
];

export function AdminSidebar({ locale, adminName, permissions }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    // Clear the real httpOnly session cookie on the server. Clearing only the
    // browser-side demo session would leave the operator still authenticated to
    // every admin API route.
    try {
      await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }

    clearMockAdminSession();
    router.push('/admin/login');
    router.refresh();
  };


  const hasPerm = (perm?: string) => {
    if (!perm) return true;
    if (permissions.includes('*')) return true;
    return permissions.includes(perm);
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin' || pathname === `/${locale}/admin`;
    return pathname.startsWith(href) || pathname.startsWith(`/${locale}${href}`);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-[#EAEAEA] flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            V
          </div>
          <span className="font-display font-bold text-sm text-[#2F3437]">
            VetMart <span className="text-emerald-600">Admin</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-[#787774] hover:text-[#2F3437] hover:bg-[#F7F6F3] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {collapsed && (
        <div
          onClick={() => setCollapsed(false)}
          className="lg:hidden fixed inset-0 z-35 bg-black/50 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 flex flex-col transition-transform duration-250 ease-out bg-[#FBFBFA] border-r border-[#EAEAEA] ${
          collapsed ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#EAEAEA]">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-emerald-600/20">
            V
          </div>
          <div>
            <span className="font-display font-bold text-sm text-[#2F3437] block leading-tight">
              VetMart<span className="text-emerald-600">BD</span>
            </span>
            <span className="text-[10px] text-[#787774] font-medium block leading-tight uppercase tracking-wider">
              Admin Console
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.filter((item) => hasPerm(item.permission)).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setCollapsed(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[#787774] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
                }`}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-500" />
                )}
                <span className="text-base">{item.icon}</span>
                <span>{locale === 'bn' ? item.label.bn : item.label.en}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language Toggle */}
        <div className="px-4 pb-4">
          <div className="flex items-center bg-[#F7F6F3] rounded-lg p-0.5 border border-[#EAEAEA]">
            <Link
              href={pathname === '/' ? '/admin' : pathname}
              locale="bn"
              className={`flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                locale === 'bn'
                  ? 'bg-white text-[#2F3437] shadow-sm border border-[#EAEAEA]/50'
                  : 'text-[#787774] hover:text-[#2F3437]'
              }`}
            >
              বাংলা
            </Link>
            <Link
              href={pathname === '/' ? '/admin' : pathname}
              locale="en"
              className={`flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                locale === 'en'
                  ? 'bg-white text-[#2F3437] shadow-sm border border-[#EAEAEA]/50'
                  : 'text-[#787774] hover:text-[#2F3437]'
              }`}
            >
              EN
            </Link>
          </div>
        </div>

        {/* Admin Profile */}
        <div className="p-4 border-t border-[#EAEAEA]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[#2F3437] block truncate">{adminName}</span>
              <span className="text-[10px] text-[#787774] block">
                {permissions.includes('*')
                  ? 'Super Admin'
                  : locale === 'bn'
                  ? 'অপারেটর'
                  : 'Operator'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto p-1.5 rounded-lg text-[#787774] hover:text-red-600 hover:bg-red-50 transition-colors"
              title={locale === 'bn' ? 'লগআউট' : 'Logout'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(false)}
        />
      )}
    </>
  );
}
