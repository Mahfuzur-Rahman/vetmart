// app/[locale]/admin/login/page.tsx
// Admin login page — completely segregated from customer auth (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { Link } from '@/lib/i18n/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminLoginPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[#F7F6F3] p-3 sm:p-6 relative">
      
      {/* Top Header Row with Back to Storefront button & Language Toggle */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pt-1 sm:pt-2 gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-emerald-50 border border-[#EAEAEA] hover:border-emerald-300 text-[#2F3437] font-semibold text-xs transition-all shadow-xs group shrink-0"
          title={loc === 'bn' ? 'স্টোরফ্রন্ট হোমপেজে ফিরে যান' : 'Back to Storefront Home'}
        >
          <span className="group-hover:-translate-x-0.5 transition-transform text-sm">←</span>
          <span>{loc === 'bn' ? 'মূল ওয়েবসাইট' : 'Storefront'}</span>
        </Link>

        {/* Language Toggle */}
        <div className="flex items-center bg-white rounded-lg p-0.5 border border-[#EAEAEA] shadow-sm">
          <Link
            href="/admin/login"
            locale="bn"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              loc === 'bn'
                ? 'bg-[#F7F6F3] text-[#2F3437] shadow-sm border border-[#EAEAEA]/50'
                : 'text-[#787774] hover:text-[#2F3437]'
            }`}
          >
            বাংলা
          </Link>
          <Link
            href="/admin/login"
            locale="en"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              loc === 'en'
                ? 'bg-[#F7F6F3] text-[#2F3437] shadow-sm border border-[#EAEAEA]/50'
                : 'text-[#787774] hover:text-[#2F3437]'
            }`}
          >
            EN
          </Link>
        </div>
      </div>

      {/* Center Login Box */}
      <div className="w-full max-w-md mx-auto space-y-8 my-auto py-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block group" title={loc === 'bn' ? 'হোম পেজে ফিরে যান' : 'Go to Homepage'}>
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 group-hover:scale-105 flex items-center justify-center text-white font-extrabold text-3xl mx-auto shadow-lg shadow-emerald-600/20 transition-transform">
              V
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight">
              <Link href="/" className="hover:text-emerald-700 transition-colors">
                VetMart<span className="text-emerald-600">BD</span> Admin
              </Link>
            </h1>
            <p className="text-sm text-[#787774] mt-1">
              {loc === 'bn'
                ? 'অ্যাডমিন কনসোলে লগইন করুন'
                : 'Sign in to the Admin Console'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <AdminLoginForm locale={loc} />

        {/* Security Notice */}
        <div className="text-center text-xs text-[#787774] space-y-1">
          <p>
            {loc === 'bn'
              ? 'এই অ্যাডমিন প্যানেলে সকল লগইন এবং কার্যক্রম অডিট লগে রেকর্ড করা হয়।'
              : 'All login attempts and admin actions are recorded in the immutable audit log.'}
          </p>
          <p className="text-[#A9A9A9]">Admin session is segregated from customer sessions (§14.1)</p>
        </div>
      </div>

      {/* Bottom spacer for balance */}
      <div className="pb-2 text-center text-[11px] text-[#A9A9A9]">
        VetMart BD Security Infrastructure & RBAC
      </div>
    </div>
  );
}
