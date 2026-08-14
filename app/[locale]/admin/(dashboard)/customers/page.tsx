// app/[locale]/admin/customers/page.tsx
// Admin Customer Management & Tier Assignment (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCustomersPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
          {loc === 'bn' ? 'গ্রাহক তালিকা ও অ্যাকাউন্ট টায়ার' : 'Customer Directory & Account Tiers'}
        </h1>
        <p className="text-sm text-[#787774] mt-0.5">
          {loc === 'bn'
            ? 'খামারি, ভেটেরিনারি সার্জন ও রিটেইল গ্রাহকদের অ্যাকাউন্ট প্রোফাইল'
            : 'Account profiles for farmers, veterinary surgeons, and retail customers'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-[#EAEAEA] bg-white shadow-xs">
        <input
          type="text"
          placeholder={loc === 'bn' ? 'ফোন নম্বর বা নাম খুঁজুন...' : 'Search phone number or name...'}
          className="flex-1 min-w-48 px-3.5 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#9AA0A6] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <select className="px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
          <option value="">{loc === 'bn' ? 'সকল টায়ার (Tiers)' : 'All Tiers'}</option>
          <option value="retail">Retail (সাধারণ)</option>
          <option value="farmer">Farmer (খামারি)</option>
          <option value="vet_surgeon">Vet Surgeon (ভেটেরিনারি সার্জন)</option>
          <option value="dealer">Dealer (ডিলার/পাইকারি)</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">{loc === 'bn' ? 'মোবাইল নম্বর' : 'Phone'}</th>
                <th className="px-5 py-3.5 font-semibold">{loc === 'bn' ? 'নাম' : 'Name'}</th>
                <th className="px-5 py-3.5 font-semibold">{loc === 'bn' ? 'অ্যাকাউন্ট টায়ার' : 'Tier'}</th>
                <th className="px-5 py-3.5 font-semibold">{loc === 'bn' ? 'BVC নম্বর' : 'BVC Reg No'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{loc === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}</th>
                <th className="px-5 py-3.5 font-semibold">{loc === 'bn' ? 'নিবন্ধনের তারিখ' : 'Joined'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              <tr className="hover:bg-[#F9F9F8] transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-emerald-700 font-bold">01711000000</td>
                <td className="px-5 py-3.5 font-bold text-xs text-[#2F3437]">Dr. Anisur Rahman, DVM</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    Verified Vet
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-emerald-800 font-bold">BVC-REG-10492</td>
                <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[#2F3437]">14</td>
                <td className="px-5 py-3.5 text-xs text-[#787774]">2026-01-10</td>
              </tr>
              <tr className="hover:bg-[#F9F9F8] transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-emerald-700 font-bold">01812998877</td>
                <td className="px-5 py-3.5 font-bold text-xs text-[#2F3437]">Rahim Poultry & Dairy Farm</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                    Commercial Farm
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-[#787774]">—</td>
                <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[#2F3437]">28</td>
                <td className="px-5 py-3.5 text-xs text-[#787774]">2026-02-01</td>
              </tr>
              <tr className="hover:bg-[#F9F9F8] transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-emerald-700 font-bold">01911223344</td>
                <td className="px-5 py-3.5 font-bold text-xs text-[#2F3437]">Tanvir Ahmed</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F7F6F3] text-[#5F6368] font-bold text-xs border border-[#EAEAEA]">
                    Retail Pet Owner
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-[#787774]">—</td>
                <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[#2F3437]">3</td>
                <td className="px-5 py-3.5 text-xs text-[#787774]">2026-02-14</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
