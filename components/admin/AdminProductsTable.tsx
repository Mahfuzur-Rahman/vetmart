'use client';

import { useState, useEffect, useRef } from 'react';
import { MOCK_PRODUCTS, type MockProduct } from '@/lib/mock-data/products';

interface Props {
  locale: string;
}

const STORAGE_KEY = 'vetmart_custom_products';
const DELETED_KEY = 'vetmart_deleted_product_ids';

export function AdminProductsTable({ locale }: Props) {
  const isBn = locale === 'bn';
  const [products, setProducts] = useState<MockProduct[]>(MOCK_PRODUCTS);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MockProduct | null>(null);
  const [campaignModalProduct, setCampaignModalProduct] = useState<MockProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<MockProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'youtube'>('facebook');
  const [campaignName, setCampaignName] = useState('poultry_boost_august');
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states (used for both Add New and Edit)
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

  // Image upload states
  const [imageUrl, setImageUrl] = useState('/images/cal-d-mag.jpg');
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom products and apply deleted filter
  useEffect(() => {
    try {
      const deletedRaw = localStorage.getItem(DELETED_KEY);
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

      const stored = localStorage.getItem(STORAGE_KEY);
      let combined = [...MOCK_PRODUCTS];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge custom products overriding any matching mock IDs
          const customMap = new Map(parsed.map((p: MockProduct) => [p.id, p]));
          const nonOverriddenMocks = MOCK_PRODUCTS.filter((p) => !customMap.has(p.id));
          combined = [...parsed, ...nonOverriddenMocks];
        }
      }

      // Filter out deleted products
      if (deletedIds.length > 0) {
        const deletedSet = new Set(deletedIds);
        combined = combined.filter((p) => !deletedSet.has(p.id) && !deletedSet.has(p.slug));
      }

      setProducts(combined);
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
  }, []);

  // Open Edit modal with selected product's values
  const handleOpenEdit = (prod: MockProduct) => {
    setEditingProduct(prod);
    setNameEn(prod.nameEn);
    setNameBn(prod.nameBn || prod.nameEn);
    setGenericName(prod.genericName || '');
    setCategory(prod.categorySlug || 'vitamins-minerals');
    setManufacturer(prod.manufacturerName || '');
    setTargetSpecies(prod.targetSpecies || ['cattle', 'poultry']);
    setMrp((prod.mrp / 100).toFixed(2));
    setSalePrice((prod.salePrice / 100).toFixed(2));
    setBatchNo(prod.batchNo || 'B-BATCH-001');
    setExpiryDate(prod.expiryDate || '2027-12-31');
    setMfgDate(prod.mfgDate || '2025-01-01');
    setDgdaRegNo(prod.dgdaRegNo || '');
    setInitialStock(String(prod.stockQty ?? 50));
    setRequiresRx(!!prod.requiresPrescription);
    setColdChain(!!(prod.coldChain || prod.requiresColdChain));
    setImageUrl(prod.imageUrl || '');
    setImageKey((prod as any).imageKey || null);
    setImageFileName(null);
  };

  // Open Enroll modal with fresh/default values
  const handleOpenEnroll = () => {
    setEditingProduct(null);
    setNameEn('Beximco Cal-D-Mag Plus Vet Liquid 1L');
    setNameBn('বেক্সিমকো ক্যাল-ডি-ম্যাগ প্লাস ভেট লিকুইড ১ লিটার');
    setGenericName('Calcium + Magnesium + Vitamin D3');
    setCategory('vitamins-minerals');
    setManufacturer('Beximco Pharmaceuticals Ltd');
    setTargetSpecies(['cattle', 'poultry', 'goat-sheep']);
    setMrp('520');
    setSalePrice('475');
    setBatchNo('B-BEX-9042');
    setExpiryDate('2027-10-31');
    setMfgDate('2025-10-01');
    setDgdaRegNo('DAR-012-441-098');
    setInitialStock('60');
    setRequiresRx(false);
    setColdChain(false);
    setImageUrl('/images/cal-d-mag.jpg');
    setImageKey(null);
    setImageFileName(null);
    setIsEnrollOpen(true);
  };

  // Handle image upload from file picker / dropzone
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(isBn ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPEG, PNG, WebP) নির্বাচন করুন।' : 'Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    // Instant local preview
    setImageFileName(file.name);
    const localPreviewUrl = URL.createObjectURL(file);
    setImageUrl(localPreviewUrl);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.url) {
          setImageUrl(json.data.url);
          setImageKey(json.data.key || null);
        }
      } else {
        // Fallback to base64 for offline/demo reliability
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setImageUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('API Upload fallback to local preview:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Save (Add New or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProduct) {
      // EDIT MODE
      const updatedProduct: MockProduct = {
        ...editingProduct,
        nameEn,
        nameBn: nameBn || nameEn,
        genericName,
        categorySlug: category,
        categoryNameEn: category === 'antibiotics' ? 'Antibiotics & Antimicrobials' : 'Vitamins & Minerals',
        categoryNameBn: category === 'antibiotics' ? 'অ্যান্টিবায়োটিক' : 'ভিটামিন ও খনিজ',
        manufacturerName: manufacturer,
        targetSpecies,
        mrp: Math.round(parseFloat(mrp || '0') * 100),
        salePrice: Math.round(parseFloat(salePrice || '0') * 100),
        vetPrice: Math.round(parseFloat(salePrice || '0') * 90),
        requiresPrescription: requiresRx,
        requiresColdChain: coldChain,
        coldChain,
        dgdaRegNo,
        batchNo,
        expiryDate,
        mfgDate,
        stockQty: parseInt(initialStock || '0', 10),
        imageUrl: imageUrl || editingProduct.imageUrl,
        banglishKeywords: `${nameEn.toLowerCase()} ${genericName.toLowerCase()}`,
      };

      const updatedList = products.map((p) => (p.id === editingProduct.id ? updatedProduct : p));
      setProducts(updatedList);

      // Save to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let list: MockProduct[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((p) => p.id === editingProduct.id);
        if (index >= 0) {
          list[index] = updatedProduct;
        } else {
          list.push(updatedProduct);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

        // Call PUT API route
        await fetch(`/api/v1/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updatedProduct,
            imageKey,
          }),
        }).catch((err) => console.warn('API update warning:', err));
      } catch (err) {
        console.error('Storage save error:', err);
      }

      setEditingProduct(null);
      setToastMessage(isBn ? `পণ্য '${updatedProduct.nameBn}' সফলভাবে আপডেট করা হয়েছে!` : `Product '${updatedProduct.nameEn}' successfully updated!`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      // ADD NEW MODE
      const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newProduct: MockProduct & { imageKey?: string } = {
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
    }
  };

  // Cascade Delete Product and Images
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    const targetId = productToDelete.id;
    const targetSlug = productToDelete.slug;
    const targetImgKey = (productToDelete as any).imageKey || productToDelete.imageUrl;

    try {
      // 1. Send API cascade delete call (removes stored image and deletes DB record)
      await fetch(`/api/v1/admin/products/${targetId}?imageKey=${encodeURIComponent(targetImgKey || '')}`, {
        method: 'DELETE',
      }).catch((e) => console.warn('API delete warning:', e));

      // 2. Remove from React State
      const updated = products.filter((p) => p.id !== targetId && p.slug !== targetSlug);
      setProducts(updated);

      // 3. Update localStorage custom products
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filteredCustom = parsed.filter((p: any) => p.id !== targetId && p.slug !== targetSlug);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCustom));
        }
      }

      // 4. Record deleted ID in DELETED_KEY so default mock items stay deleted
      const deletedRaw = localStorage.getItem(DELETED_KEY);
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(targetId)) deletedIds.push(targetId);
      if (targetSlug && !deletedIds.includes(targetSlug)) deletedIds.push(targetSlug);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));

      setToastMessage(
        isBn
          ? `পণ্য '${productToDelete.nameBn}' এবং এর সকল ছবি স্থায়ীভাবে মুছে ফেলা হয়েছে!`
          : `Product '${productToDelete.nameEn}' and all its image files permanently deleted!`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
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

  const isModalOpen = isEnrollOpen || !!editingProduct;

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
          onClick={handleOpenEnroll}
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
          <table className="min-w-[950px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-4 py-3.5 font-semibold">SKU</th>
                <th className="px-4 py-3.5 font-semibold">{isBn ? 'পণ্যের নাম' : 'Product Name'}</th>
                <th className="px-4 py-3.5 font-semibold">{isBn ? 'জেনেরিক' : 'Generic'}</th>
                <th className="px-4 py-3.5 font-semibold text-right">MRP (৳)</th>
                <th className="px-4 py-3.5 font-semibold text-right">{isBn ? 'বিক্রয়মূল্য' : 'Sale (৳)'}</th>
                <th className="px-4 py-3.5 font-semibold text-center">{isBn ? 'স্টক' : 'Stock'}</th>
                <th className="px-4 py-3.5 font-semibold text-center">{isBn ? 'ব্যাচ ও মেয়াদ' : 'Batch & Exp'}</th>
                <th className="px-4 py-3.5 font-semibold text-center">{isBn ? 'ফ্ল্যাগ' : 'Flags'}</th>
                <th className="px-4 py-3.5 font-semibold text-center">{isBn ? 'সোশ্যাল ক্যাম্পেইন' : 'Campaign Link'}</th>
                <th className="px-4 py-3.5 font-semibold text-center">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#F9F9F8] transition-colors group">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-emerald-700">
                    {prod.sku}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {prod.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
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
                  <td className="px-4 py-3.5 font-mono text-xs text-emerald-800">
                    {prod.genericName}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-[#787774]">
                    ৳{(prod.mrp / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-[#2F3437]">
                    ৳{(prod.salePrice / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                      {prod.stockQty}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-[#787774]">
                    <div className="text-[#2F3437] font-bold">{prod.batchNo}</div>
                    <div className="text-[10px] text-[#787774]">Exp: {prod.expiryDate}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
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
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setCampaignModalProduct(prod)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={isBn ? 'সোশ্যাল মিডিয়া ক্যাম্পেইন লিঙ্ক কপি করুন' : 'Generate & Copy Campaign Order Link'}
                    >
                      <span>🔗</span>
                      <span>{isBn ? 'ক্যাম্পেইন লিঙ্ক' : 'Campaign'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prod)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        title={isBn ? 'পণ্য সম্পাদনা করুন' : 'Edit product details'}
                      >
                        <span>✏️</span>
                        <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setProductToDelete(prod)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        title={isBn ? 'পণ্য ও ছবি সম্পূর্ণ মুছে ফেলুন' : 'Delete product and associated images'}
                      >
                        <span>🗑️</span>
                        <span>{isBn ? 'মুছুন' : 'Delete'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-2xl w-full p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 sm:pb-4">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-[#2F3437]">
                  {editingProduct
                    ? isBn
                      ? 'ভেটেরিনারি পণ্য সম্পাদনা করুন'
                      : 'Edit Veterinary Product'
                    : isBn
                    ? 'নতুন ভেটেরিনারি পণ্য তালিকাভুক্ত করুন'
                    : 'Enroll New Veterinary Product'}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#787774] mt-0.5">
                  {editingProduct
                    ? `SKU: ${editingProduct.sku} • DGDA: ${editingProduct.dgdaRegNo || 'DAR-024-118-059'}`
                    : 'DGDA Compliance: Batch, Expiry & Temperature Chain (§2 rule 4)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEnrollOpen(false);
                  setEditingProduct(null);
                }}
                className="text-[#787774] hover:text-[#2F3437] text-base font-bold p-2 rounded-xl hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Demo Pre-fill Pill Bar (Only in Add Mode) */}
            {!editingProduct && (
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
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
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

              {/* Clean Product Image Section with Upload Dropzone + Direct URL Input */}
              <div className="space-y-2 pt-1">
                <label className="block text-[#5F6368] font-bold">
                  {isBn ? 'পণ্যের ছবি' : 'Product Image'}
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {/* Drag & Drop Area / Active Preview */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileProcess(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/60'
                      : 'border-[#D2D2D2] bg-[#FAFAFA] hover:border-emerald-400'
                  }`}
                >
                  {imageUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-300 relative group shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                        {isUploadingImage && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">
                            ⏳
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#2F3437] text-xs truncate max-w-[220px]">
                            {imageFileName || (editingProduct ? 'Current Product Image' : 'Selected Product Photo')}
                          </span>
                          {isUploadingImage ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold animate-pulse">
                              ⏳ {isBn ? 'আপলোড হচ্ছে...' : 'Uploading Image...'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ {isBn ? 'আপলোড সম্পন্ন' : 'Uploaded'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#787774]">
                          {isBn ? 'ছবিটি সফলভাবে সংযুক্ত রয়েছে।' : 'Image is ready and attached.'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 rounded-lg bg-white border border-[#D2D2D2] hover:bg-slate-50 text-[#2F3437] text-[11px] font-bold cursor-pointer"
                          >
                            📁 {isBn ? 'ছবি পরিবর্তন করুন' : 'Change Image'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageUrl('');
                              setImageKey(null);
                              setImageFileName(null);
                            }}
                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                          >
                            ✕ {isBn ? 'মুছুন' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 space-y-2">
                      <div className="text-3xl">🖼️</div>
                      <div>
                        <p className="font-bold text-[#2F3437] text-xs">
                          {isBn
                            ? 'ছবি টেনে এনে ড্রপ করুন অথবা আপলোড করুন'
                            : 'Drag & drop product image here, or upload'}
                        </p>
                        <p className="text-[11px] text-[#787774] mt-0.5">
                          {isBn
                            ? 'সাপোর্ট করে: JPEG, PNG, WebP (সর্বোচ্চ ১০MB)'
                            : 'Supports JPEG, PNG, WebP (Max 10MB)'}
                        </p>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>📁</span>
                          <span>{isBn ? 'ছবি আপলোড করুন' : 'Upload Image'}</span>
                        </button>
                      </div>
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
                  onClick={() => {
                    setIsEnrollOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-[#EAEAEA] text-[#5F6368] hover:bg-[#F7F6F3] font-semibold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  {isUploadingImage
                    ? isBn
                      ? 'ছবি আপলোড হচ্ছে...'
                      : 'Uploading Image...'
                    : editingProduct
                    ? isBn
                      ? 'পরিবর্তন সংরক্ষণ করুন'
                      : 'Save Changes'
                    : isBn
                    ? 'পণ্য তালিকাভুক্ত করুন'
                    : 'Enroll Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Safety Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#2F3437]">
                  {isBn ? 'পণ্য ও ছবি সম্পূর্ণ মুছে ফেলতে চান?' : 'Permanently Delete Product & Images?'}
                </h3>
                <p className="text-xs text-[#787774]">
                  {isBn ? 'এই কাজটি আর ফিরিয়ে আনা যাবে না।' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            {/* Product Summary Card */}
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center gap-3">
              {productToDelete.imageUrl ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-rose-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productToDelete.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#2F3437] truncate">
                  {isBn ? productToDelete.nameBn : productToDelete.nameEn}
                </div>
                <div className="text-[11px] font-mono text-emerald-800 font-semibold">
                  SKU: {productToDelete.sku}
                </div>
                <div className="text-[10px] text-rose-700 font-medium">
                  {isBn
                    ? '⚠️ সমস্ত সংরক্ষিত ছবি এবং ডাটাবেজ রেকর্ড স্থায়ীভাবে মুছে ফেলা হবে।'
                    : '⚠️ All stored image files and database entries will be permanently removed.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#EAEAEA] text-[#5F6368] hover:bg-[#F7F6F3] font-semibold text-xs transition-colors cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:bg-rose-400 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{isDeleting ? '⏳' : '🗑️'}</span>
                <span>
                  {isDeleting
                    ? isBn
                      ? 'মুছে ফেলা হচ্ছে...'
                      : 'Deleting...'
                    : isBn
                    ? 'হ্যাঁ, স্থায়ীভাবে মুছুন'
                    : 'Yes, Delete Permanently'}
                </span>
              </button>
            </div>
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
