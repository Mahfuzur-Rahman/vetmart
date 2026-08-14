'use client';

import { useState } from 'react';
import { MOCK_PRODUCTS, type MockProduct } from '@/lib/mock-data/products';

interface Props {
  locale: string;
}

export function AdminProductsTable({ locale }: Props) {
  const isBn = locale === 'bn';
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchesQuery =
      p.nameEn.toLowerCase().includes(query.toLowerCase()) ||
      p.nameBn.toLowerCase().includes(query.toLowerCase()) ||
      p.genericName.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'rx' && p.requiresPrescription) ||
      (typeFilter === 'otc' && !p.requiresPrescription) ||
      (typeFilter === 'cold' && p.coldChain);

    return matchesQuery && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-[#EAEAEA] bg-white shadow-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isBn ? 'SKU, নাম বা জেনেরিক নাম দিয়ে খুঁজুন...' : 'Search SKU, name or generic...'}
          className="flex-1 min-w-48 px-3.5 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#9AA0A6] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 font-mono"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">{isBn ? 'সকল ধরন' : 'All Products'}</option>
          <option value="rx">Rx Required</option>
          <option value="otc">OTC Products</option>
          <option value="cold">❄️ Cold Chain</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">SKU</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'পণ্যের নাম' : 'Product Name'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'জেনেরিক' : 'Generic'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">MRP (৳)</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'বিক্রয়মূল্য' : 'Sale (৳)'}</th>
                <th className="px-5 py-3.5 font-semibold text-center">{isBn ? 'স্টক' : 'Stock'}</th>
                <th className="px-5 py-3.5 font-semibold text-center">{isBn ? 'ব্যাচ ও মেয়াদ' : 'Batch & Exp'}</th>
                <th className="px-5 py-3.5 font-semibold text-center">{isBn ? 'ফ্ল্যাগ' : 'Flags'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#F9F9F8] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-emerald-700">
                    {prod.sku}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#2F3437] text-xs">{isBn ? prod.nameBn : prod.nameEn}</div>
                    <div className="text-[10px] text-[#787774]">{prod.manufacturerName}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-emerald-800">
                    {prod.genericName}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs text-[#787774]">
                    ৳{(prod.mrp / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-[#2F3437]">
                    ৳{(prod.salePrice / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                      {prod.stockQty}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-[#787774]">
                    <div className="text-[#2F3437] font-bold">{prod.batchNo}</div>
                    <div className="text-[10px] text-[#787774]">Exp: {prod.expiryDate}</div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {prod.requiresPrescription && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Rx
                        </span>
                      )}
                      {prod.coldChain && (
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                          ❄️
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
