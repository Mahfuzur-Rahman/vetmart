'use client';

import { useState, useEffect } from 'react';
import { MOCK_PRODUCTS, type MockProduct } from '@/lib/mock-data/products';

interface Props {
  locale: string;
}

const STORAGE_KEY = 'vetmart_custom_products';

export function AdminProductsTable({ locale }: Props) {
  const isBn = locale === 'bn';
  const [products, setProducts] = useState<MockProduct[]>(MOCK_PRODUCTS);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [nameEn, setNameEn] = useState('Beximco Cal-D-Mag Plus Vet Liquid 1L');
  const [nameBn, setNameBn] = useState('বেক্সিমকো ক্যাল-ডি-ম্যাগ প্লাস ভেট লিকুইড ১ লিটার');
  const [genericName, setGenericName] = useState('Calcium + Magnesium + Vitamin D3');
  const [category, setCategory] = useState('vitamins-minerals');
  const [manufacturer, setManufacturer] = useState('Beximco Pharmaceuticals Ltd');
  const [targetSpecies, setTargetSpecies] = useState(['cattle', 'poultry', 'goat-sheep']);
  const [mrp, setMrp] = useState('520');
  const [salePrice, setSalePrice] = useState('475');
  const [batchNo, setBatchNo] = useState('B-BEX-9042');
  const [expiryDate, setExpiryDate] = useState('2027-10-31');
  const [mfgDate, setMfgDate] = useState('2025-10-01');
  const [dgdaRegNo, setDgdaRegNo] = useState('DAR-012-441-098');
  const [initialStock, setInitialStock] = useState('60');
  const [requiresRx, setRequiresRx] = useState(false);
  const [coldChain, setColdChain] = useState(false);
  const [imageUrl, setImageUrl] = useState('/images/cal-d-mag.jpg');

  // Load custom products from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts([...parsed, ...MOCK_PRODUCTS]);
        }
      }
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
  }, []);

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct: MockProduct = {
      id: `prod-custom-${Date.now()}`,
      slug: slug || `custom-sku-${Date.now()}`,
      sku: `VET-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      nameEn,
      nameBn: nameBn || nameEn,
      genericName,
      categorySlug: category,
      categoryNameEn: category === 'antibiotics' ? 'Antibiotics & Antimicrobials' : 'Vitamins & Minerals',
      categoryNameBn: category === 'antibiotics' ? 'অ্যান্টিবায়োটিক' : 'ভিটামিন ও খনিজ',
      manufacturerName: manufacturer,
      strength: 'Liquid Form',
      dosageForm: 'Oral Solution',
      packSize: '1 Liter Bottle',
      packUnit: 'bottle',
      targetSpecies,
      mrp: Math.round(parseFloat(mrp || '0') * 100),
      salePrice: Math.round(parseFloat(salePrice || '0') * 100),
      vetPrice: Math.round(parseFloat(salePrice || '0') * 90),
      requiresPrescription: requiresRx,
      requiresColdChain: coldChain,
      isAntimicrobial: false,
      coldChain,
      dgdaRegNo,
      batchNo,
      expiryDate,
      mfgDate,
      stockQty: parseInt(initialStock || '0', 10),
      imageUrl: imageUrl || '/images/cal-d-mag.jpg',
      banglishKeywords: `${nameEn.toLowerCase()} ${genericName.toLowerCase()}`,
      descriptionEn: `High-potency veterinary calcium, magnesium and vitamin D3 formulation manufactured by ${manufacturer}.`,
      descriptionBn: `${manufacturer} দ্বারা প্রস্তুতকৃত উচ্চমানের ভেটেরিনারি ক্যালসিয়াম, ম্যাগনেসিয়াম ও ভিটামিন ডি৩ দ্রবণ।`,
      dosageEn: 'Cattle: 100ml daily. Poultry: 1ml per 2L drinking water.',
      dosageBn: 'গবাদিপশু: দৈনিক ১০০ মি.লি.। পোল্ট্রি: ২ লিটার পানিতে ১ মি.লি.।',
    };

    const updated = [newProduct, ...products];
    setProducts(updated);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newProduct, ...existing]));
    } catch (err) {
      console.error('Storage save error', err);
    }

    setIsEnrollOpen(false);
    setToastMessage(isBn ? `পণ্য '${newProduct.nameBn}' সফলভাবে তালিকাভুক্ত হয়েছে!` : `Item '${newProduct.nameEn}' successfully enrolled!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = products.filter((p) => {
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
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl flex items-center justify-between animate-fade-in">
          <span>✓ {toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Action & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[#EAEAEA] bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
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
            <option value="all">{isBn ? 'সকল ধরন' : 'All Products'} ({products.length})</option>
            <option value="rx">Rx Required</option>
            <option value="otc">OTC Products</option>
            <option value="cold">❄️ Cold Chain</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsEnrollOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
        >
          <span>+</span>
          <span>{isBn ? 'নতুন পণ্য যোগ করুন' : 'Enroll New Item'}</span>
        </button>
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
                    <div className="flex items-center gap-3">
                      {prod.imageUrl && (
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={prod.imageUrl} alt={prod.nameEn} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-[#2F3437] text-xs">{isBn ? prod.nameBn : prod.nameEn}</div>
                        <div className="text-[10px] text-[#787774]">{prod.manufacturerName}</div>
                      </div>
                    </div>
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

      {/* Enroll New Item Modal */}
      {isEnrollOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#2F3437]">
                  {isBn ? 'নতুন ভেটেরিনারি পণ্য তালিকাভুক্ত করুন' : 'Enroll New Veterinary Product'}
                </h3>
                <p className="text-xs text-[#787774] mt-0.5">
                  DGDA Compliance: Batch, Expiry & Temperature Chain (§2 rule 4)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollOpen(false)}
                className="text-[#787774] hover:text-[#2F3437] text-base font-bold p-2 rounded-xl hover:bg-[#F7F6F3]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Product Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-medium focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">পণ্যের নাম (বাংলা) *</label>
                  <input
                    type="text"
                    required
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-medium focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Generic Composition *</label>
                  <input
                    type="text"
                    required
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-medium focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">MRP (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono font-bold focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Sale Price (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    required
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono font-bold focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">DGDA Reg No</label>
                  <input
                    type="text"
                    value={dgdaRegNo}
                    onChange={(e) => setDgdaRegNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] font-bold mb-1">Product Image URL</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-mono text-xs focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {imageUrl && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresRx}
                    onChange={(e) => setRequiresRx(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-[#2F3437]">Requires Prescription (Rx)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coldChain}
                    onChange={(e) => setColdChain(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-[#2F3437]">❄️ Cold Chain Required</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setIsEnrollOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#EAEAEA] text-[#5F6368] hover:bg-[#F7F6F3] font-semibold"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all"
                >
                  {isBn ? 'পণ্য তালিকাভুক্ত করুন' : 'Enroll Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

