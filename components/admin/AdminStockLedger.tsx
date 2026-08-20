'use client';

import { useState } from 'react';

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productNameEn: string;
  productNameBn: string;
  batchId: string;
  batchNo: string;
  delta: number;
  reason: 'purchase' | 'customer_order' | 'adjustment' | 'expiry_damage' | string;
  refType: 'initial_seed' | 'order_fulfill' | 'manual_audit' | string;
  refId: string;
  createdAt: string;
  createdByName: string;
}

interface Props {
  locale: string;
  initialEntries?: StockLedgerEntry[];
}

export function AdminStockLedger({ locale, initialEntries = [] }: Props) {
  const isBn = locale === 'bn';
  const [entries, setEntries] = useState<StockLedgerEntry[]>(initialEntries);
  const [query, setQuery] = useState('');

  const filtered = entries.filter(
    (e) =>
      e.batchNo.toLowerCase().includes(query.toLowerCase()) ||
      e.productNameEn.toLowerCase().includes(query.toLowerCase()) ||
      e.refId.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-[#EAEAEA] bg-white shadow-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isBn ? 'ব্যাচ নম্বর, SKU বা রেফারেন্স আইডি খুঁজুন...' : 'Search batch number, SKU or ref ID...'}
          className="flex-1 min-w-48 px-3.5 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#9AA0A6] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
        />
      </div>

      {/* Stock Ledger Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAEAEA] bg-[#FBFBFA] flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#2F3437]">
            {isBn ? 'অপরিবর্তনীয় স্টক লেজার এন্ট্রি' : 'Immutable Stock Ledger Log'}
          </h2>
          <span className="text-xs text-emerald-700 font-mono font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            stock_ledger (§2 rule 3)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'তারিখ' : 'Timestamp'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'পণ্যের নাম' : 'Product Name'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'ব্যাচ নং' : 'Batch #'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'ডেল্টা (Delta)' : 'Delta'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'কারণ' : 'Reason'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'রেফারেন্স আইডি' : 'Reference Ref'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'অপারেটর' : 'Operator'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-[#787774]">
                    {isBn ? 'কোনো স্টক লেজার রেকর্ড পাওয়া যায়নি।' : 'No stock movements recorded yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((stk) => (
                  <tr key={stk.id} className="hover:bg-[#F9F9F8] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-[#787774]">
                      {new Date(stk.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-BD', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-xs text-[#2F3437]">
                      {isBn ? stk.productNameBn : stk.productNameEn}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-emerald-700 font-bold">
                      {stk.batchNo}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-extrabold text-xs">
                      <span className={stk.delta > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {stk.delta > 0 ? `+${stk.delta}` : stk.delta}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#F7F6F3] border border-[#EAEAEA] font-mono text-[#5F6368] text-[10px] uppercase">
                        {stk.reason.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#787774]">
                      {stk.refId}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#787774]">
                      {stk.createdByName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
