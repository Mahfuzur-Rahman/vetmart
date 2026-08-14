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
    <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3] p-4 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
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

      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-3xl mx-auto shadow-lg shadow-emerald-600/20">
            V
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight">
              VetMart<span className="text-emerald-600">BD</span> Admin
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
    </div>
  );
}
