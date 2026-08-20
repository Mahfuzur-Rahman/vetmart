// app/[locale]/admin/page.tsx
// Admin Dashboard with KPI cards and recent activity (§14.1)
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { listOrdersForAdmin } from '@/lib/services/orders';
import { db } from '@/lib/db';
import { prescriptions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

interface KpiCardProps {
  icon: string;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
}

function KpiCard({ icon, label, value, change, trend }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 space-y-3 hover:border-emerald-600/40 shadow-xs transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {change && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-400'
                : trend === 'down'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-[#232a26] text-[#787774]'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">{value}</p>
        <p className="text-xs text-[#787774] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboard({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  let recentOrders: Awaited<ReturnType<typeof listOrdersForAdmin>> = [];
  let pendingPrescriptions: any[] = [];

  try {
    recentOrders = await listOrdersForAdmin(5);
  } catch (err) {
    console.error('Error fetching recent orders for dashboard:', err);
  }

  try {
    pendingPrescriptions = await db
      .select({
        id: prescriptions.id,
        vetName: prescriptions.vetName,
        vetBvcRegNo: prescriptions.vetBvcRegNo,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .where(eq(prescriptions.status, 'pending'))
      .orderBy(desc(prescriptions.createdAt))
      .limit(5);
  } catch (err) {
    console.warn('Error fetching pending prescriptions:', err);
  }

  const totalRevenuePaisa = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight">
            {loc === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
          </h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {loc === 'bn'
              ? 'আজকের ব্যবসায়িক সারসংক্ষেপ ও কার্যক্রম'
              : "Today's business overview and recent activity"}
          </p>
        </div>
        <div className="text-xs text-[#787774] font-mono">
          {new Date().toLocaleDateString(loc === 'bn' ? 'bn-BD' : 'en-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="🧾"
          label={loc === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}
          value={String(recentOrders.length)}
          change="Real-time"
          trend="up"
        />
        <KpiCard
          icon="💰"
          label={loc === 'bn' ? 'মোট রাজস্ব (৳)' : 'Revenue (৳)'}
          value={`৳${(totalRevenuePaisa / 100).toFixed(2)}`}
          change="Real-time"
          trend="up"
        />
        <KpiCard
          icon="📦"
          label={loc === 'bn' ? 'পেন্ডিং শিপমেন্ট' : 'Pending Shipments'}
          value={String(recentOrders.filter(o => o.status === 'pending' || o.status === 'pharmacist_review').length)}
          change="Dispatch"
          trend="flat"
        />
        <KpiCard
          icon="📋"
          label={loc === 'bn' ? 'পেন্ডিং প্রেসক্রিপশন' : 'Pending Rx'}
          value={String(pendingPrescriptions.length)}
          change="Action required"
          trend={pendingPrescriptions.length > 0 ? 'down' : 'flat'}
        />
      </div>

      {/* Two Column: Recent Orders + Rx Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <div className="rounded-2xl border border-[#EAEAEA] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#2F3437]">
              {loc === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent Orders'}
            </h2>
            <a
              href={`/${loc}/admin/orders`}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              {loc === 'bn' ? 'সব দেখুন →' : 'View All →'}
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                  <th className="px-5 py-3 font-semibold">Order #</th>
                  <th className="px-5 py-3 font-semibold">{loc === 'bn' ? 'গ্রাহক' : 'Customer'}</th>
                  <th className="px-5 py-3 font-semibold">{loc === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="px-5 py-3 font-semibold text-right">{loc === 'bn' ? 'মোট' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#787774]">
                      {loc === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি।' : 'No orders recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#F9F9F8] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-emerald-700">
                        {ord.orderNumber}
                      </td>
                      <td className="px-5 py-3 text-xs text-[#2F3437]">
                        {ord.customerName}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ord.status === 'dispatched'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : ord.status === 'pharmacist_review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-[#F7F6F3] text-[#5F6368] border-[#EAEAEA]'
                          }`}
                        >
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-[#2F3437] text-xs">
                        ৳{(ord.totalAmount / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prescription Review Queue */}
        <div className="rounded-2xl border border-[#EAEAEA] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#2F3437] flex items-center gap-2">
              <span>📋</span>
              {loc === 'bn' ? 'প্রেসক্রিপশন রিভিউ কিউ' : 'Rx Review Queue'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
              {pendingPrescriptions.length} {loc === 'bn' ? 'পেন্ডিং' : 'pending'}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {pendingPrescriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#787774]">
                {loc === 'bn' ? 'কোনো পেন্ডিং প্রেসক্রিপশন নেই।' : 'No pending prescriptions.'}
              </div>
            ) : (
              pendingPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-3 rounded-xl bg-[#FBFBFA] border border-[#EAEAEA] flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-[#2F3437]">{rx.vetName || 'Prescription Request'}</div>
                    <div className="text-emerald-700 font-mono text-[11px] font-bold">{rx.vetBvcRegNo || 'ID: ' + rx.id.slice(0, 8)}</div>
                  </div>

                  <a
                    href={`/${loc}/admin/prescriptions`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    {loc === 'bn' ? 'রিভিউ করুন →' : 'Review Rx →'}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expiry Alert Section */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <h3 className="font-bold text-sm text-amber-800">
            {loc === 'bn' ? 'ব্যাচ মেয়াদ সতর্কতা (৬০ দিনের মধ্যে)' : 'Batch Expiry Alert (Within 60 Days)'}
          </h3>
        </div>
        <p className="text-xs text-[#787774]">
          {loc === 'bn'
            ? 'FEFO অনুযায়ী নিকটবর্তী মেয়াদোত্তীর্ণ ব্যাচ গুলো এখানে তালিকাভুক্ত হবে। ৬০ দিনের কম মেয়াদ থাকা ব্যাচ স্বয়ংক্রিয়ভাবে বিক্রি থেকে বাদ পড়বে (§2 rule 2)।'
            : 'Batches approaching expiry will be listed here. Batches with ≤60 days to expiry are automatically excluded from sale allocation (§2 rule 2).'}
        </p>
      </div>
    </div>
  );
}
