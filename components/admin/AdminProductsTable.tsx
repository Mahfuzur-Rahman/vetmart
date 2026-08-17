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
  const [campaignModalProduct, setCampaignModalProduct] = useState<MockProduct | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'youtube'>('facebook');
  const [campaignName, setCampaignName] = useState('poultry_boost_august');
  const [isCopied, setIsCopied] = useState(false);
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
            {isBn ? 'পণ্য ব্যবস্থাপনা' : 'Product Management'}
          </h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {isBn ? 'DGDA নিবন্ধিত ওষুধ ও পশু স্বাস্থ্য পণ্য পরিচালনা' : 'Manage DGDA-registered drugs and animal health products'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEnrollOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span className="text-base font-black">+</span>
          <span>{isBn ? 'নতুন পণ্য যোগ করুন' : 'Add New Product'}</span>
        </button>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[#EAEAEA] bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isBn ? 'SKU, নাম বা জেনেরিক নাম দিয়ে খুঁজুন...' : 'Search SKU, name or generic...'}
            className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#9AA0A6] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 font-mono"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল ধরন' : 'All Products'} ({products.length})</option>
            <option value="rx">Rx Required</option>
            <option value="otc">OTC Products</option>
            <option value="cold">❄️ Cold Chain</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full max-w-full touch-pan-x">
          <table className="min-w-[850px] w-full text-sm">
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
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'সোশ্যাল ক্যাম্পেইন' : 'Campaign Link'}</th>
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
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setCampaignModalProduct(prod)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={isBn ? 'সোশ্যাল মিডিয়া ক্যাম্পেইন লিঙ্ক কপি করুন' : 'Generate & Copy Campaign Order Link'}
                    >
                      <span>🔗</span>
                      <span>{isBn ? 'ক্যাম্পেইন লিঙ্ক' : 'Campaign Link'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Enroll New Item Modal */}
      {isEnrollOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-2xl w-full p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 sm:pb-4">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-[#2F3437]">
                  {isBn ? 'নতুন ভেটেরিনারি পণ্য তালিকাভুক্ত করুন' : 'Enroll New Veterinary Product'}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#787774] mt-0.5">
                  DGDA Compliance: Batch, Expiry & Temperature Chain (§2 rule 4)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollOpen(false)}
                className="text-[#787774] hover:text-[#2F3437] text-base font-bold p-2 rounded-xl hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Demo Pre-fill Pill Bar */}
            <div className="flex items-center gap-2 flex-wrap pb-1">
              <span className="text-[11px] font-bold text-[#5F6368]">
                {isBn ? 'দ্রুত ডেমো ডেটা পূরণ:' : 'Quick Fill:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNameEn('Renata Promin Vet Liquid 500ml');
                  setNameBn('রেনাটা প্রোমিন ভেট লিকুইড ৫০০মি.লি.');
                  setGenericName('Amino Acids + Multivitamins + Minerals');
                  setCategory('vitamins-minerals');
                  setManufacturer('Renata Animal Health');
                  setMrp('380');
                  setSalePrice('345');
                  setBatchNo('B-RPM-7701');
                  setInitialStock('120');
                  setRequiresRx(false);
                  setColdChain(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
              >
                ⚡ Renata Promin 500ml
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameEn('Square Tilmo-Vet Oral Solution 100ml');
                  setNameBn('স্কয়ার টিলমো-ভেট ওরাল সলিউশন ১০০মি.লি.');
                  setGenericName('Tilmicosin 250 mg/ml');
                  setCategory('antibiotics');
                  setManufacturer('Square Pharmaceuticals Ltd');
                  setMrp('650');
                  setSalePrice('590');
                  setBatchNo('B-SQT-9011');
                  setInitialStock('75');
                  setRequiresRx(true);
                  setColdChain(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-semibold border border-purple-200 transition-colors cursor-pointer"
              >
                ⚡ Square Tilmo-Vet 100ml
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

      {/* Campaign Link Generator Modal */}
      {campaignModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                  🔗
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2F3437]">
                    {isBn ? 'সোশ্যাল মিডিয়া ক্যাম্পেইন অর্ডার লিঙ্ক' : 'Campaign Express Order Link'}
                  </h3>
                  <p className="text-xs text-[#787774]">
                    {isBn ? campaignModalProduct.nameBn : campaignModalProduct.nameEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCampaignModalProduct(null)}
                className="text-[#787774] hover:text-[#2F3437] text-base font-bold p-2 rounded-xl hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2F3437]">
                {isBn ? '১. প্ল্যাটফর্ম বেছে নিন (UTM ট্র্যাকিং):' : '1. Select Social Platform (UTM Tracking):'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'facebook', label: 'Facebook Ad', icon: '📘' },
                  { id: 'instagram', label: 'Instagram', icon: '📸' },
                  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                  { id: 'youtube', label: 'YouTube', icon: '▶️' },
                ].map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(plat.id as any);
                      setIsCopied(false);
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedPlatform === plat.id
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-[#EAEAEA] hover:border-purple-300 text-[#5F6368]'
                    }`}
                  >
                    <div className="text-base">{plat.icon}</div>
                    <div className="mt-1">{plat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Tag/Name input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2F3437]">
                {isBn ? '২. ক্যাম্পেইনের নাম (ঐচ্ছিক):' : '2. Campaign Name Tag (Optional):'}
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => {
                  setCampaignName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
                  setIsCopied(false);
                }}
                placeholder="poultry_boost_august"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-xs font-mono text-[#2F3437] focus:ring-2 focus:ring-purple-500/30 outline-hidden"
              />
            </div>

            {/* Generated Public Link Box with 1-Click Copy */}
            {(() => {
              const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
              const publicUrl = `${origin}/${locale}/order/${campaignModalProduct.slug}?utm_source=${selectedPlatform}&utm_campaign=${campaignName || 'direct'}&utm_medium=social_ad`;

              const handleCopy = () => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(publicUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 3000);
                }
              };

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#2F3437]">
                      {isBn ? '৩. প্রস্তুতকৃত পাবলিক লিঙ্ক:' : '3. Generated Public Landing Link:'}
                    </label>
                    {isCopied && (
                      <span className="text-xs font-bold text-emerald-600 animate-fade-in">
                        ✓ {isBn ? 'ক্লিপবোর্ডে কপি হয়েছে!' : 'Copied to Clipboard!'}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-purple-900 break-all select-all font-semibold">
                      {publicUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shrink-0 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📋</span>
                      <span>{isCopied ? (isBn ? 'কপি হয়েছে' : 'Copied') : (isBn ? 'কপি করুন' : 'Copy Link')}</span>
                    </button>
                  </div>

                  {/* Open & Test in New Tab */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-[#787774]">
                      {isBn
                        ? '👉 ফেসবুক বিজ্ঞাপনের "Website URL" বা মেসেজে এই লিঙ্কটি পেস্ট করুন।'
                        : '👉 Paste this link in Facebook Ads Manager "Website URL" or social posts.'}
                    </p>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <span>🌐</span>
                      <span>{isBn ? 'লিঙ্ক টেস্ট করুন →' : 'Test Link →'}</span>
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}


