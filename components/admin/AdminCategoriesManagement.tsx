'use client';

import { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { SpeciesInfo } from '@/lib/services/species';
import { type DrugClassificationInfo, DEFAULT_DRUG_CLASSIFICATIONS } from '@/lib/services/drug-classifications';

interface CategoryItem {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  imagePath?: string | null;
  sort: number;
  showOnHomepage: boolean;
  isActive: boolean;
}

interface Props {
  locale: Locale;
  initialSpecies: SpeciesInfo[];
  initialCategories: CategoryItem[];
  initialDrugClassifications?: DrugClassificationInfo[];
}

export function AdminCategoriesManagement({
  locale,
  initialSpecies,
  initialCategories,
  initialDrugClassifications,
}: Props) {
  const isBn = locale === 'bn';
  const [activeTab, setActiveTab] = useState<'species' | 'drug-class' | 'categories'>('species');

  // Species state
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>(initialSpecies);
  const [editingSpecies, setEditingSpecies] = useState<SpeciesInfo | null>(null);
  const [isNewSpeciesOpen, setIsNewSpeciesOpen] = useState(false);
  const [speciesToDelete, setSpeciesToDelete] = useState<SpeciesInfo | null>(null);

  // Drug Classification state
  const [drugClassList, setDrugClassList] = useState<DrugClassificationInfo[]>(
    initialDrugClassifications && initialDrugClassifications.length > 0
      ? initialDrugClassifications
      : DEFAULT_DRUG_CLASSIFICATIONS
  );
  const [editingDrugClass, setEditingDrugClass] = useState<DrugClassificationInfo | null>(null);
  const [isNewDrugClassOpen, setIsNewDrugClassOpen] = useState(false);
  const [drugClassToDelete, setDrugClassToDelete] = useState<DrugClassificationInfo | null>(null);

  // Category state
  const [categoryList, setCategoryList] = useState<CategoryItem[]>(initialCategories);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  // Common UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Species Form States
  const [spKey, setSpKey] = useState('');
  const [spNameEn, setSpNameEn] = useState('');
  const [spNameBn, setSpNameBn] = useState('');
  const [spEmoji, setSpEmoji] = useState('🐾');
  const [spDescEn, setSpDescEn] = useState('');
  const [spDescBn, setSpDescBn] = useState('');
  const [spSort, setSpSort] = useState('0');
  const [spShowHome, setSpShowHome] = useState(true);

  // Drug Classification Form States
  const [dcSlug, setDcSlug] = useState('');
  const [dcNameEn, setDcNameEn] = useState('');
  const [dcNameBn, setDcNameBn] = useState('');
  const [dcEmoji, setDcEmoji] = useState('💊');
  const [dcDescEn, setDcDescEn] = useState('');
  const [dcDescBn, setDcDescBn] = useState('');
  const [dcSort, setDcSort] = useState('0');
  const [dcShowMenu, setDcShowMenu] = useState(true);
  const [dcIsActive, setDcIsActive] = useState(true);

  // Category Form States
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSort, setCatSort] = useState('0');
  const [catShowHome, setCatShowHome] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Re-fetch functions
  const refreshSpecies = async () => {
    try {
      const res = await fetch('/api/v1/admin/species');
      if (res.ok) {
        const json = await res.json();
        if (json.data) setSpeciesList(json.data);
      }
    } catch (e) {
      console.warn('Failed to refresh species:', e);
    }
  };

  const refreshDrugClassifications = async () => {
    try {
      const res = await fetch('/api/v1/admin/drug-classifications');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDrugClassList(json.data);
          window.dispatchEvent(new CustomEvent('custom-products-updated'));
        }
      }
    } catch (e) {
      console.warn('Failed to refresh drug classifications:', e);
    }
  };

  const refreshCategories = async () => {
    try {
      const res = await fetch('/api/v1/admin/categories');
      if (res.ok) {
        const json = await res.json();
        if (json.data) setCategoryList(json.data);
      }
    } catch (e) {
      console.warn('Failed to refresh categories:', e);
    }
  };

  // Toggle Species Homepage Visibility
  const handleToggleSpeciesHomepage = async (sp: SpeciesInfo) => {
    const newShow = !sp.showOnHomepage;
    setIsUpdating(sp.key);

    try {
      const res = await fetch(`/api/v1/admin/species/${sp.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnHomepage: newShow }),
      });

      if (res.ok) {
        setSpeciesList((prev) =>
          prev.map((item) => (item.key === sp.key ? { ...item, showOnHomepage: newShow } : item))
        );
        showToast(
          newShow
            ? isBn
              ? `'${sp.nameBn}' হোমপেজে দৃশ্যমান করা হয়েছে!`
              : `'${sp.nameEn}' is now visible on homepage!`
            : isBn
            ? `'${sp.nameBn}' হোমপেজ থেকে লুকানো হয়েছে!`
            : `'${sp.nameEn}' hidden from homepage!`
        );
        window.dispatchEvent(new CustomEvent('custom-products-updated'));
      }
    } catch (err) {
      console.error('Error toggling species homepage:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Species Active Status
  const handleToggleSpeciesActive = async (sp: SpeciesInfo) => {
    const newActive = !sp.isActive;
    setIsUpdating(sp.key);

    try {
      const res = await fetch(`/api/v1/admin/species/${sp.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (res.ok) {
        setSpeciesList((prev) =>
          prev.map((item) => (item.key === sp.key ? { ...item, isActive: newActive } : item))
        );
        showToast(
          newActive
            ? isBn
              ? `'${sp.nameBn}' সক্রিয় করা হয়েছে!`
              : `'${sp.nameEn}' is now active!`
            : isBn
            ? `'${sp.nameBn}' নিষ্ক্রিয় করা হয়েছে!`
            : `'${sp.nameEn}' deactivated!`
        );
        window.dispatchEvent(new CustomEvent('custom-products-updated'));
      }
    } catch (err) {
      console.error('Error toggling species active:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Drug Classification Menu Visibility
  const handleToggleDrugClassMenu = async (dc: DrugClassificationInfo) => {
    const newShow = !dc.showOnMenu;
    const identifier = dc.id || dc.slug;
    setIsUpdating(dc.slug);

    try {
      const res = await fetch(`/api/v1/admin/drug-classifications/${identifier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnMenu: newShow }),
      });

      if (res.ok) {
        setDrugClassList((prev) =>
          prev.map((item) => (item.slug === dc.slug ? { ...item, showOnMenu: newShow } : item))
        );
        showToast(
          newShow
            ? isBn
              ? `'${dc.nameBn}' মেনুতে দৃশ্যমান করা হয়েছে!`
              : `'${dc.nameEn}' is now visible in menu!`
            : isBn
            ? `'${dc.nameBn}' মেনু থেকে লুকানো হয়েছে!`
            : `'${dc.nameEn}' hidden from menu!`
        );
        window.dispatchEvent(new CustomEvent('custom-products-updated'));
      }
    } catch (err) {
      console.error('Error toggling drug class menu:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Drug Classification Active Status
  const handleToggleDrugClassActive = async (dc: DrugClassificationInfo) => {
    const newActive = !dc.isActive;
    const identifier = dc.id || dc.slug;
    setIsUpdating(dc.slug);

    try {
      const res = await fetch(`/api/v1/admin/drug-classifications/${identifier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (res.ok) {
        setDrugClassList((prev) =>
          prev.map((item) => (item.slug === dc.slug ? { ...item, isActive: newActive } : item))
        );
        showToast(
          newActive
            ? isBn
              ? `'${dc.nameBn}' সক্রিয় করা হয়েছে!`
              : `'${dc.nameEn}' is now active!`
            : isBn
            ? `'${dc.nameBn}' নিষ্ক্রিয় করা হয়েছে!`
            : `'${dc.nameEn}' deactivated!`
        );
        window.dispatchEvent(new CustomEvent('custom-products-updated'));
      }
    } catch (err) {
      console.error('Error toggling drug class active:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Category Homepage Visibility
  const handleToggleCategoryHomepage = async (cat: CategoryItem) => {
    const newShow = !cat.showOnHomepage;
    setIsUpdating(cat.id);

    try {
      const res = await fetch(`/api/v1/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnHomepage: newShow }),
      });

      if (res.ok) {
        setCategoryList((prev) =>
          prev.map((item) => (item.id === cat.id ? { ...item, showOnHomepage: newShow } : item))
        );
        showToast(
          newShow
            ? isBn
              ? `'${cat.nameBn}' হোমপেজে দৃশ্যমান!`
              : `'${cat.nameEn}' is now visible on homepage!`
            : isBn
            ? `'${cat.nameBn}' হোমপেজ থেকে লুকানো হয়েছে!`
            : `'${cat.nameEn}' hidden from homepage!`
        );
      }
    } catch (err) {
      console.error('Error toggling category homepage:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Open Create Species Modal
  const handleOpenNewSpecies = () => {
    setEditingSpecies(null);
    setSpKey('');
    setSpNameEn('');
    setSpNameBn('');
    setSpEmoji('🐾');
    setSpDescEn('');
    setSpDescBn('');
    setSpSort(String(speciesList.length + 1));
    setSpShowHome(true);
    setIsNewSpeciesOpen(true);
  };

  // Open Edit Species Modal
  const handleOpenEditSpecies = (sp: SpeciesInfo) => {
    setEditingSpecies(sp);
    setSpKey(sp.key);
    setSpNameEn(sp.nameEn);
    setSpNameBn(sp.nameBn);
    setSpEmoji(sp.emoji);
    setSpDescEn(sp.description?.en || '');
    setSpDescBn(sp.description?.bn || '');
    setSpSort(String(sp.sort ?? 0));
    setSpShowHome(sp.showOnHomepage !== false);
  };

  // Save Species Form
  const handleSaveSpecies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSpecies) {
        const res = await fetch(`/api/v1/admin/species/${editingSpecies.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: spNameEn,
            nameBn: spNameBn || spNameEn,
            emoji: spEmoji,
            descriptionEn: spDescEn,
            descriptionBn: spDescBn,
            sort: parseInt(spSort || '0', 10),
            showOnHomepage: spShowHome,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'প্রজাতি সফলভাবে আপডেট করা হয়েছে!' : 'Species updated successfully!');
          setEditingSpecies(null);
          await refreshSpecies();
          window.dispatchEvent(new CustomEvent('custom-products-updated'));
        }
      } else {
        const res = await fetch('/api/v1/admin/species', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: spKey || spNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            slug: spKey || spNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            nameEn: spNameEn,
            nameBn: spNameBn || spNameEn,
            emoji: spEmoji,
            descriptionEn: spDescEn,
            descriptionBn: spDescBn,
            sort: parseInt(spSort || '0', 10),
            showOnHomepage: spShowHome,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'নতুন প্রজাতি যুক্ত হয়েছে!' : 'New species added successfully!');
          setIsNewSpeciesOpen(false);
          await refreshSpecies();
          window.dispatchEvent(new CustomEvent('custom-products-updated'));
        }
      }
    } catch (err) {
      console.error('Error saving species:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Species
  const handleDeleteSpecies = async () => {
    if (!speciesToDelete) return;
    try {
      const res = await fetch(`/api/v1/admin/species/${speciesToDelete.key}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(isBn ? 'প্রজাতি মুছে ফেলা হয়েছে!' : 'Species deleted!');
        setSpeciesToDelete(null);
        await refreshSpecies();
        window.dispatchEvent(new CustomEvent('custom-products-updated'));
      }
    } catch (err) {
      console.error('Error deleting species:', err);
    }
  };

  // Open Create Drug Classification Modal
  const handleOpenNewDrugClass = () => {
    setEditingDrugClass(null);
    setDcSlug('');
    setDcNameEn('');
    setDcNameBn('');
    setDcEmoji('💊');
    setDcDescEn('');
    setDcDescBn('');
    setDcSort(String(drugClassList.length + 1));
    setDcShowMenu(true);
    setDcIsActive(true);
    setIsNewDrugClassOpen(true);
  };

  // Open Edit Drug Classification Modal
  const handleOpenEditDrugClass = (dc: DrugClassificationInfo) => {
    setEditingDrugClass(dc);
    setDcSlug(dc.slug);
    setDcNameEn(dc.nameEn);
    setDcNameBn(dc.nameBn);
    setDcEmoji(dc.emoji);
    setDcDescEn(dc.descriptionEn || '');
    setDcDescBn(dc.descriptionBn || '');
    setDcSort(String(dc.sort ?? 0));
    setDcShowMenu(dc.showOnMenu !== false);
    setDcIsActive(dc.isActive !== false);
  };

  // Save Drug Classification Form
  const handleSaveDrugClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingDrugClass) {
        const identifier = editingDrugClass.id || editingDrugClass.slug;
        const res = await fetch(`/api/v1/admin/drug-classifications/${identifier}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: dcNameEn,
            nameBn: dcNameBn || dcNameEn,
            emoji: dcEmoji,
            descriptionEn: dcDescEn,
            descriptionBn: dcDescBn,
            sort: parseInt(dcSort || '0', 10),
            showOnMenu: dcShowMenu,
            isActive: dcIsActive,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'শ্রেণিবিভাগ সফলভাবে আপডেট করা হয়েছে!' : 'Drug classification updated!');
          setEditingDrugClass(null);
          await refreshDrugClassifications();
        }
      } else {
        const res = await fetch('/api/v1/admin/drug-classifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: dcSlug || dcNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            nameEn: dcNameEn,
            nameBn: dcNameBn || dcNameEn,
            emoji: dcEmoji,
            descriptionEn: dcDescEn,
            descriptionBn: dcDescBn,
            sort: parseInt(dcSort || '0', 10),
            showOnMenu: dcShowMenu,
            isActive: dcIsActive,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'নতুন শ্রেণিবিভাগ যুক্ত হয়েছে!' : 'Drug classification created!');
          setIsNewDrugClassOpen(false);
          await refreshDrugClassifications();
        }
      }
    } catch (err) {
      console.error('Error saving drug classification:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Drug Classification
  const handleDeleteDrugClass = async () => {
    if (!drugClassToDelete) return;
    const identifier = drugClassToDelete.id || drugClassToDelete.slug;
    try {
      const res = await fetch(`/api/v1/admin/drug-classifications/${identifier}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(isBn ? 'শ্রেণিবিভাগ মুছে ফেলা হয়েছে!' : 'Drug classification deleted!');
        setDrugClassToDelete(null);
        await refreshDrugClassifications();
      }
    } catch (err) {
      console.error('Error deleting drug classification:', err);
    }
  };

  // Open Create Category Modal
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatNameEn('');
    setCatNameBn('');
    setCatSlug('');
    setCatSort(String(categoryList.length + 1));
    setCatShowHome(true);
    setIsNewCategoryOpen(true);
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatNameEn(cat.nameEn);
    setCatNameBn(cat.nameBn);
    setCatSlug(cat.slug);
    setCatSort(String(cat.sort ?? 0));
    setCatShowHome(cat.showOnHomepage !== false);
  };

  // Save Category Form
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCategory) {
        const res = await fetch(`/api/v1/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: catNameEn,
            nameBn: catNameBn || catNameEn,
            sort: parseInt(catSort || '0', 10),
            showOnHomepage: catShowHome,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'ক্যাটাগরি আপডেট করা হয়েছে!' : 'Category updated!');
          setEditingCategory(null);
          await refreshCategories();
        }
      } else {
        const res = await fetch('/api/v1/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: catSlug || catNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            nameEn: catNameEn,
            nameBn: catNameBn || catNameEn,
            sort: parseInt(catSort || '0', 10),
            showOnHomepage: catShowHome,
          }),
        });

        if (res.ok) {
          showToast(isBn ? 'নতুন ক্যাটাগরি তৈরি হয়েছে!' : 'Category created!');
          setIsNewCategoryOpen(false);
          await refreshCategories();
        }
      }
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/v1/admin/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(isBn ? 'ক্যাটাগরি মুছে ফেলা হয়েছে!' : 'Category deleted!');
        setCategoryToDelete(null);
        await refreshCategories();
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const speciesHomepageCount = speciesList.filter((s) => s.showOnHomepage !== false && s.isActive !== false).length;
  const drugClassMenuCount = drugClassList.filter((d) => d.showOnMenu !== false && d.isActive !== false).length;
  const categoriesHomepageCount = categoryList.filter((c) => c.showOnHomepage !== false && c.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl flex items-center justify-between animate-fade-in">
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display">
            {isBn ? 'ক্যাটাগরি, প্রজাতি ও ঔষধের শ্রেণিবিভাগ' : 'Categories, Species & Drug Classifications'}
          </h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {isBn
              ? 'হোমপেজ ও মেনুতে কোন প্রজাতি ও ঔষধের শ্রেণি প্রদর্শিত হবে তা পরিচালনা করুন'
              : 'Control which target species, drug classifications, and categories appear on homepage and menus'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {activeTab === 'species' && (
            <button
              type="button"
              onClick={handleOpenNewSpecies}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span className="text-base font-black">+</span>
              <span>{isBn ? 'নতুন প্রজাতি যোগ করুন' : 'Add Target Species'}</span>
            </button>
          )}
          {activeTab === 'drug-class' && (
            <button
              type="button"
              onClick={handleOpenNewDrugClass}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span className="text-base font-black">+</span>
              <span>{isBn ? 'নতুন শ্রেণিবিভাগ যোগ করুন' : 'Add Drug Classification'}</span>
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              type="button"
              onClick={handleOpenNewCategory}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span className="text-base font-black">+</span>
              <span>{isBn ? 'নতুন ক্যাটাগরি যোগ করুন' : 'Add Category'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EAEAEA] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('species')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'species'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-[#787774] hover:text-[#2F3437] border border-[#EAEAEA]'
          }`}
        >
          <span>🐾</span>
          <span>{isBn ? 'প্রাণী ও প্রজাতি (Target Species)' : 'Target Species (Animals)'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'species' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {speciesHomepageCount}/{speciesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drug-class')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'drug-class'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-[#787774] hover:text-[#2F3437] border border-[#EAEAEA]'
          }`}
        >
          <span>💊</span>
          <span>{isBn ? 'ঔষধের শ্রেণিবিভাগ (Drug Classifications)' : 'Drug Classifications (Menu)'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'drug-class' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {drugClassMenuCount}/{drugClassList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-[#787774] hover:text-[#2F3437] border border-[#EAEAEA]'
          }`}
        >
          <span>🏷️</span>
          <span>{isBn ? 'পণ্যের ক্যাটাগরি (Product Categories)' : 'Product Categories'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {categoriesHomepageCount}/{categoryList.length}
          </span>
        </button>
      </div>

      {/* ════════════════════════ TAB 1: SPECIES MANAGEMENT ════════════════════════ */}
      {activeTab === 'species' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-xs text-emerald-900 leading-relaxed">
              <p className="font-bold">
                {isBn ? 'হোমপেজ ও মেনু দৃশ্যমানতা নিয়ন্ত্রণ' : 'Homepage & Navigation Visibility Control'}
              </p>
              <p className="text-emerald-800/80 mt-0.5">
                {isBn
                  ? 'যেসব প্রজাতিতে "হোমপেজ ও মেনু সক্রিয়" অন রাখবেন, শুধুমাত্র সেগুলোই স্টোরফ্রন্টের হেডার মেনু ও হোমপেজে শো করবে।'
                  : 'Only species marked with "Show on Homepage & Menu" will appear in the storefront header and homepage animal carousel.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBFBFA] border-b border-[#EAEAEA] text-[#787774] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-14">আইকন</th>
                    <th className="px-4 py-3.5">প্রজাতির নাম (English)</th>
                    <th className="px-4 py-3.5">বাংলা নাম</th>
                    <th className="px-4 py-3.5">স্লাগ (Slug / Key)</th>
                    <th className="px-4 py-3.5 text-center w-36">হোমপেজ ও মেনু</th>
                    <th className="px-4 py-3.5 text-center w-24">স্ট্যাটাস</th>
                    <th className="px-4 py-3.5 text-right w-28">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {speciesList.map((sp) => {
                    const isHome = sp.showOnHomepage !== false;
                    const isActive = sp.isActive !== false;
                    const updating = isUpdating === sp.key;

                    return (
                      <tr key={sp.key} className="hover:bg-[#F9F9F8] transition-colors">
                        <td className="px-4 py-3 text-2xl text-center">{sp.emoji}</td>
                        <td className="px-4 py-3 font-bold text-[#2F3437]">{sp.nameEn}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-800">{sp.nameBn}</td>
                        <td className="px-4 py-3 font-mono text-[#787774] text-[11px]">{sp.key}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleToggleSpeciesHomepage(sp)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              isHome
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>{isHome ? '✓ দৃশ্যমান' : '✕ লুকানো'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleToggleSpeciesActive(sp)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSpecies(sp)}
                              className="px-2.5 py-1 rounded-lg border border-[#EAEAEA] hover:bg-slate-50 text-[#2F3437] font-semibold text-[11px] cursor-pointer"
                            >
                              সম্পাদনা
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpeciesToDelete(sp)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-[11px] cursor-pointer"
                            >
                              মুছুন
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ TAB 2: DRUG CLASSIFICATIONS (MENU) ════════════════════════ */}
      {activeTab === 'drug-class' && (
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-200/60 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">💊</span>
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-bold">
                {isBn ? 'হেডার মেগা-মেনুর ঔষধ শ্রেণিবিভাগ পরিচালনা' : 'Storefront Header Mega-Menu Drug Classifications'}
              </p>
              <p className="text-blue-800/80 mt-0.5">
                {isBn
                  ? 'হেডার ড্রপডাউন মেগা-মেনুর "ঔষধের ক্যাটাগরি" কলামে কোন কোন ড্রাগ ক্লাস দেখাবে তা এখান থেকে যোগ, এডিট বা লুকানো যাবে।'
                  : 'Manage the therapeutic classifications (Vaccines, Antibiotics, Vitamins, Dewormers, Hormones, etc.) displayed in the storefront mega menu.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBFBFA] border-b border-[#EAEAEA] text-[#787774] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-14">আইকন</th>
                    <th className="px-4 py-3.5">শ্রেণিবিভাগ (English)</th>
                    <th className="px-4 py-3.5">বাংলা নাম</th>
                    <th className="px-4 py-3.5">বিবরণ</th>
                    <th className="px-4 py-3.5 text-center w-28">ক্রম (Sort)</th>
                    <th className="px-4 py-3.5 text-center w-36">মেনুতে দৃশ্যমান</th>
                    <th className="px-4 py-3.5 text-center w-24">স্ট্যাটাস</th>
                    <th className="px-4 py-3.5 text-right w-28">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {drugClassList.map((dc) => {
                    const isMenu = dc.showOnMenu !== false;
                    const isActive = dc.isActive !== false;
                    const updating = isUpdating === dc.slug;

                    return (
                      <tr key={dc.slug} className="hover:bg-[#F9F9F8] transition-colors">
                        <td className="px-4 py-3 text-2xl text-center">{dc.emoji}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#2F3437]">{dc.nameEn}</div>
                          <div className="font-mono text-[#787774] text-[10px]">{dc.slug}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-800">{dc.nameBn}</td>
                        <td className="px-4 py-3 text-[11px] text-[#787774] max-w-[240px] truncate">
                          {isBn ? dc.descriptionBn || dc.descriptionEn : dc.descriptionEn || dc.descriptionBn}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{dc.sort}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleToggleDrugClassMenu(dc)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              isMenu
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>{isMenu ? '✓ মেনুতে সক্রিয়' : '✕ মেনু থেকে লুকানো'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleToggleDrugClassActive(dc)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDrugClass(dc)}
                              className="px-2.5 py-1 rounded-lg border border-[#EAEAEA] hover:bg-slate-50 text-[#2F3437] font-semibold text-[11px] cursor-pointer"
                            >
                              সম্পাদনা
                            </button>
                            <button
                              type="button"
                              onClick={() => setDrugClassToDelete(dc)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-[11px] cursor-pointer"
                            >
                              মুছুন
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ TAB 3: CATEGORIES MANAGEMENT ════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-purple-50/50 border border-purple-200/60 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🏷️</span>
            <div className="text-xs text-purple-900 leading-relaxed">
              <p className="font-bold">
                {isBn ? 'পণ্যের সাধারণ ক্যাটাগরি' : 'General Product Categories'}
              </p>
              <p className="text-purple-800/80 mt-0.5">
                {isBn
                  ? 'পণ্যের প্রধান ক্যাটাগরি ও শ্রেণিবিন্যাস নির্ধারণ করুন।'
                  : 'Manage general product classification tree.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBFBFA] border-b border-[#EAEAEA] text-[#787774] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">ক্যাটাগরি নাম (English)</th>
                    <th className="px-4 py-3.5">বাংলা নাম</th>
                    <th className="px-4 py-3.5">স্লাগ (Slug)</th>
                    <th className="px-4 py-3.5 text-center w-28">ক্রম (Sort)</th>
                    <th className="px-4 py-3.5 text-center w-36">হোমপেজ</th>
                    <th className="px-4 py-3.5 text-right w-28">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {categoryList.map((cat) => {
                    const isHome = cat.showOnHomepage !== false;
                    const updating = isUpdating === cat.id;

                    return (
                      <tr key={cat.id} className="hover:bg-[#F9F9F8] transition-colors">
                        <td className="px-4 py-3 font-bold text-[#2F3437]">{cat.nameEn}</td>
                        <td className="px-4 py-3 font-semibold text-purple-800">{cat.nameBn}</td>
                        <td className="px-4 py-3 font-mono text-[#787774] text-[11px]">{cat.slug}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{cat.sort}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleToggleCategoryHomepage(cat)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              isHome
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>{isHome ? '✓ দৃশ্যমান' : '✕ লুকানো'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="px-2.5 py-1 rounded-lg border border-[#EAEAEA] hover:bg-slate-50 text-[#2F3437] font-semibold text-[11px] cursor-pointer"
                            >
                              সম্পাদনা
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(cat)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-[11px] cursor-pointer"
                            >
                              মুছুন
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ MODAL: CREATE / EDIT SPECIES ════════════════════════ */}
      {(isNewSpeciesOpen || editingSpecies) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
                <span>{spEmoji || '🐾'}</span>
                <span>
                  {editingSpecies
                    ? isBn
                      ? 'প্রজাতি সম্পাদনা'
                      : 'Edit Target Species'
                    : isBn
                    ? 'নতুন প্রজাতি যোগ করুন'
                    : 'Add Target Species'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewSpeciesOpen(false);
                  setEditingSpecies(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSpecies} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[#5F6368] font-bold mb-1">Emoji / আইকন</label>
                  <input
                    type="text"
                    required
                    value={spEmoji}
                    onChange={(e) => setSpEmoji(e.target.value)}
                    className="w-full px-3 py-2 text-center text-xl rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[#5F6368] font-bold mb-1">Key / Slug *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingSpecies}
                    value={spKey}
                    onChange={(e) => setSpKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))}
                    placeholder="e.g. cattle, pigeon, horse"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono text-[#2F3437] disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={spNameEn}
                    onChange={(e) => {
                      setSpNameEn(e.target.value);
                      if (!editingSpecies && !spKey) {
                        setSpKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Cattle (Cow)"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">বাংলা নাম *</label>
                  <input
                    type="text"
                    required
                    value={spNameBn}
                    onChange={(e) => setSpNameBn(e.target.value)}
                    placeholder="যেমন: গরু (গাভী/ষাঁড়)"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Description (EN)</label>
                  <input
                    type="text"
                    value={spDescEn}
                    onChange={(e) => setSpDescEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA]"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">বিবরণ (বাংলা)</label>
                  <input
                    type="text"
                    value={spDescBn}
                    onChange={(e) => setSpDescBn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={spSort}
                    onChange={(e) => setSpSort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2F3437]">
                    <input
                      type="checkbox"
                      checked={spShowHome}
                      onChange={(e) => setSpShowHome(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Show on Homepage & Menu</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSpeciesOpen(false);
                    setEditingSpecies(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EAEAEA] text-[#787774] hover:bg-[#F7F6F3] font-bold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-emerald-400 text-white font-bold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Species'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════ MODAL: CREATE / EDIT DRUG CLASSIFICATION ════════════════════════ */}
      {(isNewDrugClassOpen || editingDrugClass) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="font-bold text-base text-[#2F3437] flex items-center gap-2">
                <span>{dcEmoji || '💊'}</span>
                <span>
                  {editingDrugClass
                    ? isBn
                      ? 'ঔষধের শ্রেণিবিভাগ সম্পাদনা'
                      : 'Edit Drug Classification'
                    : isBn
                    ? 'নতুন শ্রেণিবিভাগ যোগ করুন'
                    : 'Add Drug Classification'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewDrugClassOpen(false);
                  setEditingDrugClass(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDrugClass} className="space-y-4 text-xs">
              {/* Emoji quick selector + Emoji Input */}
              <div>
                <label className="block text-[#5F6368] font-bold mb-1.5">আইকন / Emoji নির্বাচন করুন</label>
                <div className="flex items-center gap-2 flex-wrap pb-2">
                  {['💉', '💊', '🌾', '🧼', '🧪', '🧬', '🩹', '🌿', '🥣', '🩺', '📦', '🧫'].map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setDcEmoji(emo)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        dcEmoji === emo ? 'bg-blue-100 border-blue-500 scale-110 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                  <input
                    type="text"
                    required
                    value={dcEmoji}
                    onChange={(e) => setDcEmoji(e.target.value)}
                    className="w-12 h-9 text-center text-lg rounded-xl bg-[#F7F6F3] border border-[#EAEAEA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={dcNameEn}
                    onChange={(e) => {
                      setDcNameEn(e.target.value);
                      if (!editingDrugClass && !dcSlug) {
                        setDcSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder="e.g. Vaccines & Biologicals"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">বাংলা নাম *</label>
                  <input
                    type="text"
                    required
                    value={dcNameBn}
                    onChange={(e) => setDcNameBn(e.target.value)}
                    placeholder="যেমন: ভ্যাকসিন ও বায়োলজিক্যালস"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] font-bold mb-1">Slug / Key (URL Friendly) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingDrugClass}
                  value={dcSlug}
                  onChange={(e) => setDcSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))}
                  placeholder="e.g. vaccines, antibiotics, vitamins"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono text-[#2F3437] disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Short Description (EN)</label>
                  <input
                    type="text"
                    value={dcDescEn}
                    onChange={(e) => setDcDescEn(e.target.value)}
                    placeholder="Cold-chain guaranteed vaccines"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA]"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">সংক্ষিপ্ত বিবরণ (বাংলা)</label>
                  <input
                    type="text"
                    value={dcDescBn}
                    onChange={(e) => setDcDescBn(e.target.value)}
                    placeholder="কোল্ড-চেইন নিশ্চিত ভ্যাকসিন"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={dcSort}
                    onChange={(e) => setDcSort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2F3437]">
                    <input
                      type="checkbox"
                      checked={dcShowMenu}
                      onChange={(e) => setDcShowMenu(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Show in Mega Menu</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewDrugClassOpen(false);
                    setEditingDrugClass(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EAEAEA] text-[#787774] hover:bg-[#F7F6F3] font-bold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-blue-400 text-white font-bold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Classification'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════ MODAL: CREATE / EDIT CATEGORY ════════════════════════ */}
      {(isNewCategoryOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="font-bold text-base text-[#2F3437]">
                {editingCategory
                  ? isBn
                    ? 'ক্যাটাগরি সম্পাদনা'
                    : 'Edit Category'
                  : isBn
                  ? 'নতুন ক্যাটাগরি যোগ করুন'
                  : 'Add Category'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewCategoryOpen(false);
                  setEditingCategory(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#5F6368] font-bold mb-1">Category Name (EN) *</label>
                <input
                  type="text"
                  required
                  value={catNameEn}
                  onChange={(e) => {
                    setCatNameEn(e.target.value);
                    if (!editingCategory && !catSlug) {
                      setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                />
              </div>

              <div>
                <label className="block text-[#5F6368] font-bold mb-1">ক্যাটাগরি নাম (বাংলা) *</label>
                <input
                  type="text"
                  required
                  value={catNameBn}
                  onChange={(e) => setCatNameBn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] font-bold"
                />
              </div>

              <div>
                <label className="block text-[#5F6368] font-bold mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategory}
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono text-[#2F3437] disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] font-bold mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={catSort}
                    onChange={(e) => setCatSort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] font-mono"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2F3437]">
                    <input
                      type="checkbox"
                      checked={catShowHome}
                      onChange={(e) => setCatShowHome(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span>Show on Homepage</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCategoryOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EAEAEA] text-[#787774] hover:bg-[#F7F6F3] font-bold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:bg-purple-400 text-white font-bold cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Category'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════ DELETE CONFIRMATION MODALS ════════════════════════ */}
      {speciesToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#2F3437]">
              {isBn ? 'প্রজাতি মুছে ফেলতে চান?' : 'Delete Species Category?'}
            </h3>
            <p className="text-xs text-[#787774]">
              {isBn
                ? `আপনি কি নিশ্চিতভাবে '${speciesToDelete.nameBn}' মুছে ফেলতে চান?`
                : `Are you sure you want to delete '${speciesToDelete.nameEn}'?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSpeciesToDelete(null)}
                className="px-3 py-1.5 rounded-xl border border-[#EAEAEA] text-xs font-bold text-[#787774]"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteSpecies}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isBn ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {drugClassToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#2F3437]">
              {isBn ? 'শ্রেণিবিভাগ মুছে ফেলতে চান?' : 'Delete Drug Classification?'}
            </h3>
            <p className="text-xs text-[#787774]">
              {isBn
                ? `আপনি কি নিশ্চিতভাবে '${drugClassToDelete.nameBn}' মুছে ফেলতে চান?`
                : `Are you sure you want to delete '${drugClassToDelete.nameEn}'?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDrugClassToDelete(null)}
                className="px-3 py-1.5 rounded-xl border border-[#EAEAEA] text-xs font-bold text-[#787774]"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteDrugClass}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isBn ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#2F3437]">
              {isBn ? 'ক্যাটাগরি মুছে ফেলতে চান?' : 'Delete Category?'}
            </h3>
            <p className="text-xs text-[#787774]">
              {isBn
                ? `আপনি কি নিশ্চিতভাবে '${categoryToDelete.nameBn}' মুছে ফেলতে চান?`
                : `Are you sure you want to delete '${categoryToDelete.nameEn}'?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 rounded-xl border border-[#EAEAEA] text-xs font-bold text-[#787774]"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isBn ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
