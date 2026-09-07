// components/admin/AdminManagementClient.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Locale } from '@/lib/i18n/config';

interface Role {
  id: string;
  key: string;
  nameEn: string;
  nameBn: string;
  description?: string | null;
  permissions?: string[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { id: string; key: string; nameEn: string; nameBn: string }[];
  permissions: string[];
}

interface Props {
  locale: Locale;
  currentAdminId: string;
}

export interface MenuItemConfig {
  key: string;
  labelEn: string;
  labelBn: string;
  icon: string;
  descriptionEn: string;
  descriptionBn: string;
  perms: string[];
}

const MENU_ITEMS: MenuItemConfig[] = [
  {
    key: 'product',
    labelEn: 'Products & Medicines',
    labelBn: 'পণ্য ও ওষুধ তালিকা',
    icon: '💊',
    descriptionEn: 'View, add and edit medicines, prices and units',
    descriptionBn: 'ওষুধের তালিকা, মূল্য ও ইউনিট পরিচালনা',
    perms: ['product.read', 'product.write'],
  },
  {
    key: 'category',
    labelEn: 'Categories & Classifications',
    labelBn: 'ক্যাটাগরি ও শ্রেণিবিভাগ',
    icon: '🏷️',
    descriptionEn: 'Manage product categories and therapeutic classes',
    descriptionBn: 'ক্যাটাগরি ও থেরাপিউটিক শ্রেণিবিভাগ পরিচালনা',
    perms: ['category.read', 'category.write'],
  },
  {
    key: 'stock',
    labelEn: 'Stock & FEFO Batches',
    labelBn: 'স্টক ও ব্যাচ ব্যবস্থাপনা',
    icon: '📦',
    descriptionEn: 'Batch stock adjustments, warehouse lots & expiry alerts',
    descriptionBn: 'স্টক সমন্বয়, ব্যাচ ও মেয়াদোত্তীর্ণ সতর্কতা',
    perms: ['stock.read', 'stock.adjust'],
  },
  {
    key: 'order',
    labelEn: 'Orders & Dispatch',
    labelBn: 'অর্ডার ও কুরিয়ার হ্যান্ডলিং',
    icon: '🧾',
    descriptionEn: 'Process orders, dispatch parcels & print invoices',
    descriptionBn: 'অর্ডার প্রসেসিং, চালান ও কুরিয়ার বুকিং',
    perms: ['order.read', 'order.write', 'order.refund'],
  },
  {
    key: 'reconciliation',
    labelEn: 'COD Reconciliation',
    labelBn: 'সিওডি রিকনসিলিয়েশন',
    icon: '💰',
    descriptionEn: 'Courier cash-on-delivery payments reconciliation',
    descriptionBn: 'কুরিয়ার সিওডি পেমেন্ট ও ক্যাশ রিকনসিলিয়েশন',
    perms: ['order.read'],
  },

  {
    key: 'customer',
    labelEn: 'Customer Profiles & Vets',
    labelBn: 'গ্রাহক ও ভেট তালিকা',
    icon: '👥',
    descriptionEn: 'Customer accounts, credit limits & BVC vet verification',
    descriptionBn: 'গ্রাহক তথ্য ও বিভিসি রেজিস্টার্ড ভেট যাচাই',
    perms: ['customer.read', 'customer.write'],
  },
  {
    key: 'settings',
    labelEn: 'System Settings',
    labelBn: 'সিস্টেম সেটিংস',
    icon: '⚙️',
    descriptionEn: 'Delivery rates, courier API config & platform settings',
    descriptionBn: 'ডেলিভারি চার্জ, কুরিয়ার ও সিস্টেম কনফিগ',
    perms: ['settings.read', 'settings.write'],
  },
];

export function AdminManagementClient({ locale, currentAdminId }: Props) {
  const isBn = locale === 'bn';

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<AdminUser | null>(null);

  // Add Form state
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addSelectedMenus, setAddSelectedMenus] = useState<string[]>(['product', 'category', 'stock', 'order']);
  const [addIsActive, setAddIsActive] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Form state
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSelectedMenus, setEditSelectedMenus] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, rolesRes] = await Promise.all([
        fetch('/api/v1/admin/admins'),
        fetch('/api/v1/admin/roles'),
      ]);

      if (adminsRes.ok) {
        const json = await adminsRes.json();
        setAdmins(json.data.admins || []);
      }

      if (rolesRes.ok) {
        const json = await rolesRes.json();
        setRoles(json.data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showNotification('error', isBn ? 'তথ্য লোড করতে সমস্যা হয়েছে।' : 'Failed to load directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '!1';
  };

  // Convert selected menu keys to raw permission strings
  const resolvePermissionsFromMenus = (menuKeys: string[]) => {
    const permsSet = new Set<string>();
    for (const key of menuKeys) {
      const menu = MENU_ITEMS.find((m) => m.key === key);
      if (menu) {
        menu.perms.forEach((p) => permsSet.add(p));
      }
    }
    return Array.from(permsSet);
  };

  // Detect which menus are currently enabled for an admin
  const getEnabledMenusForAdmin = (admin: AdminUser) => {
    if (admin.permissions.includes('*')) {
      return MENU_ITEMS.map((m) => m.key);
    }
    return MENU_ITEMS.filter((m) => m.perms.some((p) => admin.permissions.includes(p))).map((m) => m.key);
  };

  // Open Edit Modal
  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditPassword('');
    setEditSelectedMenus(getEnabledMenusForAdmin(admin));
    setEditIsActive(admin.isActive);
    setEditError(null);
  };

  // Quick Preset Handlers
  const applyPreset = (preset: 'all' | 'inventory' | 'orders' | 'pharmacist' | 'none', isEditMode = false) => {
    let target: string[] = [];
    if (preset === 'all') {
      target = MENU_ITEMS.map((m) => m.key);
    } else if (preset === 'inventory') {
      target = ['product', 'category', 'stock', 'order'];
    } else if (preset === 'orders') {
      target = ['product', 'order', 'reconciliation', 'customer'];
    } else if (preset === 'pharmacist') {
      target = ['product', 'order', 'customer'];
    } else if (preset === 'none') {
      target = [];
    }

    if (isEditMode) {
      setEditSelectedMenus(target);
    } else {
      setAddSelectedMenus(target);
    }
  };

  // Toggle single menu in edit mode
  const toggleEditMenu = (menuKey: string) => {
    setEditSelectedMenus((prev) =>
      prev.includes(menuKey) ? prev.filter((k) => k !== menuKey) : [...prev, menuKey]
    );
  };

  // Toggle single menu in add mode
  const toggleAddMenu = (menuKey: string) => {
    setAddSelectedMenus((prev) =>
      prev.includes(menuKey) ? prev.filter((k) => k !== menuKey) : [...prev, menuKey]
    );
  };

  // Submit Add Admin
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    try {
      const permissions = resolvePermissionsFromMenus(addSelectedMenus);

      const res = await fetch('/api/v1/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
          roleKeys: ['admin'],
          permissions,
          isActive: addIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error?.message || (isBn ? 'অ্যাডমিন তৈরিতে সমস্যা হয়েছে।' : 'Failed to create admin.'));
        return;
      }

      showNotification('success', isBn ? 'নতুন অ্যাডমিন সফলভাবে তৈরি হয়েছে!' : 'New admin created successfully!');
      setIsAddModalOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddSelectedMenus(['product', 'category', 'stock', 'order']);
      fetchData();
    } catch (err) {
      setAddError(isBn ? 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন।' : 'Server connection failed.');
    } finally {
      setAddLoading(false);
    }
  };

  // Submit Edit Admin
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const isSuper = editingAdmin.roles.some((r) => r.key === 'super_admin') || editingAdmin.permissions.includes('*');
      const permissions = isSuper ? ['*'] : resolvePermissionsFromMenus(editSelectedMenus);

      const payload: Record<string, unknown> = {
        name: editName,
        permissions,
        isActive: editIsActive,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/v1/admin/admins/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error?.message || (isBn ? 'হালনাগাদ ব্যর্থ হয়েছে।' : 'Failed to update admin.'));
        return;
      }

      showNotification(
        'success',
        isBn ? 'মেনু অ্যাক্সেস সফলভাবে সংরক্ষিত হয়েছে!' : 'Admin access updated successfully!'
      );
      setEditingAdmin(null);
      fetchData();
    } catch (err) {
      setEditError(isBn ? 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন।' : 'Server connection failed.');
    } finally {
      setEditLoading(false);
    }
  };

  // Instant Revoke / Suspend Access
  const handleRevokeOrSuspend = async (admin: AdminUser) => {
    if (admin.id === currentAdminId) {
      showNotification('error', isBn ? 'আপনি নিজের অ্যাকাউন্ট নিষ্ক্রিয় করতে পারবেন না।' : 'You cannot revoke your own account.');
      return;
    }

    const isCurrentlyActive = admin.isActive;
    const confirmText = isCurrentlyActive
      ? (isBn ? `আপনি কি "${admin.name}" এর সকল অ্যাক্সেস স্থগিত (Revoke) করতে চান?` : `Revoke all access for "${admin.name}"?`)
      : (isBn ? `আপনি কি "${admin.name}" এর অ্যাকাউন্ট পুনরায় সক্রিয় করতে চান?` : `Re-activate access for "${admin.name}"?`);

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/v1/admin/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isCurrentlyActive }),
      });

      if (res.ok) {
        showNotification(
          'success',
          isCurrentlyActive
            ? (isBn ? `"${admin.name}" এর অ্যাক্সেস স্থগিত করা হয়েছে (Revoked)` : `Access revoked for "${admin.name}"`)
            : (isBn ? `"${admin.name}" এর অ্যাকাউন্ট সক্রিয় করা হয়েছে` : `Access restored for "${admin.name}"`)
        );
        fetchData();
      } else {
        const json = await res.json();
        showNotification('error', json.error?.message || 'Failed');
      }
    } catch (err) {
      showNotification('error', 'Request failed');
    }
  };

  // Permanent Delete
  const confirmDelete = async () => {
    if (!deleteConfirmAdmin) return;

    try {
      const res = await fetch(`/api/v1/admin/admins/${deleteConfirmAdmin.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showNotification('success', isBn ? 'অ্যাডমিন অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।' : 'Admin permanently deleted.');
        setDeleteConfirmAdmin(null);
        fetchData();
      } else {
        const json = await res.json();
        showNotification('error', json.error?.message || 'Delete failed');
      }
    } catch (err) {
      showNotification('error', 'Request failed');
    }
  };

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return admins;
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [admins, searchQuery]);

  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.isActive).length;
    const revoked = total - active;
    return { total, active, revoked };
  }, [admins]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
              : 'bg-red-900 text-red-50 border-red-700'
          }`}
        >
          <span>{notification.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2F3437] tracking-tight font-display flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-lg">🛡️</span>
            <span>{isBn ? 'অ্যাডমিন ইউজার ও মেনু পারমিশন নিয়ন্ত্রণ' : 'Admin Users & Direct Menu Access'}</span>
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            {isBn
              ? 'সুপার অ্যাডমিন ক্ষমতা: প্রতিটি ইউজারের মেনু অ্যাক্সেস সরাসরি নিয়ন্ত্রণ করুন, নতুন ইউজার যোগ করুন বা অ্যাক্সেস বাতিল করুন।'
              : 'Superadmin Console: Control menu access per admin user, add new admins, or revoke/delete accounts.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setAddPassword(generateRandomPassword());
            setAddError(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>{isBn ? 'নতুন অ্যাডমিন যোগ করুন' : 'Add New Admin'}</span>
        </button>
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-[#787774] font-medium">{isBn ? 'মোট অ্যাডমিন সংখ্যা' : 'Total Admins'}</p>
            <p className="text-2xl font-extrabold text-[#2F3437] font-display mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-center text-lg">
            👥
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-[#787774] font-medium">{isBn ? 'সক্রিয় অপারেটর' : 'Active Admins'}</p>
            <p className="text-2xl font-extrabold text-emerald-700 font-display mt-0.5">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg text-emerald-700">
            🟢
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-[#787774] font-medium">{isBn ? 'স্থগিত / বাতিলকৃত' : 'Revoked / Suspended'}</p>
            <p className="text-2xl font-extrabold text-red-700 font-display mt-0.5">{stats.revoked}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-lg text-red-700">
            🛑
          </div>
        </div>
      </div>

      {/* Main Admin Directory Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white overflow-hidden shadow-xs">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between gap-4 bg-[#FBFBFA]">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787774] text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'নাম বা ইমেইল দিয়ে খুঁজুন...' : 'Search admin by name or email...'}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#2F3437] placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <span className="text-xs text-[#787774] font-mono shrink-0">
            {filteredAdmins.length} {isBn ? 'জন অ্যাডমিন' : 'admins'}
          </span>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#F7F6F3] text-[#787774] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">{isBn ? 'অ্যাডমিন ইউজার' : 'Admin User'}</th>
                <th className="px-5 py-3.5">{isBn ? 'অনুমোদিত মেনু অ্যাক্সেস' : 'Permitted Menus'}</th>
                <th className="px-5 py-3.5">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Access Status'}</th>
                <th className="px-5 py-3.5 text-right">{isBn ? 'ব্যবস্থাপনা ও অ্যাকশন' : 'Actions & Access'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[#787774]">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent mb-2" />
                    <p>{isBn ? 'অ্যাডমিন তালিকা লোড হচ্ছে...' : 'Loading directory...'}</p>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[#787774]">
                    {isBn ? 'কোনো অ্যাডমিন পাওয়া যায়নি।' : 'No admin accounts found.'}
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isSuper =
                    admin.roles.some((r) => r.key === 'super_admin') || admin.permissions.includes('*');
                  const isSelf = admin.id === currentAdminId;
                  const enabledMenus = getEnabledMenusForAdmin(admin);

                  return (
                    <tr key={admin.id} className="hover:bg-[#FBFBFA] transition-colors">
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isSuper
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : admin.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#2F3437] flex items-center gap-2 truncate">
                              <span>{admin.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  {isBn ? 'আপনি' : 'You'}
                                </span>
                              )}
                              {isSuper && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  👑 Super
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#787774] font-mono block truncate">{admin.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Enabled Menus Chips */}
                      <td className="px-5 py-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-bold">
                            👑 {isBn ? 'সকল মেনু অ্যাক্সেস (সুপার অ্যাডমিন)' : 'All Menus (Full Superadmin Access)'}
                          </span>
                        ) : enabledMenus.length === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold text-[10px]">
                            {isBn ? 'কোনো মেনু অ্যাক্সেস নেই (লকড)' : 'No menu access (Locked)'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                            {enabledMenus.map((key) => {
                              const menu = MENU_ITEMS.find((m) => m.key === key);
                              if (!menu) return null;
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F7F6F3] border border-[#EAEAEA] text-[#2F3437] text-[11px]"
                                  title={menu.labelEn}
                                >
                                  <span>{menu.icon}</span>
                                  <span>{isBn ? menu.labelBn : menu.labelEn}</span>
                                </span>
                              );
                            })}
                            <span className="font-mono text-[10px] text-[#787774] font-bold">
                              ({enabledMenus.length}/{MENU_ITEMS.length})
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            admin.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? 'bg-emerald-600' : 'bg-red-600'}`} />
                          <span>{admin.isActive ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'স্থগিত (Revoked)' : 'Revoked'}</span>
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right space-x-2">
                        {/* Edit Menu Access */}
                        <button
                          onClick={() => openEditModal(admin)}
                          className="px-3 py-1.5 rounded-lg bg-[#F7F6F3] hover:bg-emerald-50 hover:text-emerald-700 border border-[#EAEAEA] hover:border-emerald-200 text-[#2F3437] font-bold text-xs transition-all cursor-pointer"
                        >
                          {isBn ? 'মেনু পারমিশন ⚙️' : 'Menu Access ⚙️'}
                        </button>

                        {/* Revoke / Suspend Access Toggle */}
                        {!isSelf && (
                          <button
                            onClick={() => handleRevokeOrSuspend(admin)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              admin.isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={admin.isActive ? (isBn ? 'অ্যাক্সেস স্থগিত করুন' : 'Revoke Access') : isBn ? 'অ্যাক্সেস পুনরায় চালু করুন' : 'Restore Access'}
                          >
                            {admin.isActive ? (isBn ? 'অ্যাক্সেস স্থগিত 🚫' : 'Revoke 🚫') : isBn ? 'পুনরায় চালু 🟢' : 'Restore 🟢'}
                          </button>
                        )}

                        {/* Delete Permanently */}
                        {!isSelf && (
                          <button
                            onClick={() => setDeleteConfirmAdmin(admin)}
                            className="p-1.5 rounded-lg text-[#787774] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title={isBn ? 'স্থায়ীভাবে মুছে ফেলুন' : 'Permanently Delete'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NEW ADMIN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  +
                </div>
                <h3 className="font-bold text-base text-[#2F3437]">
                  {isBn ? 'নতুন অ্যাডমিন তৈরি ও মেনু নির্ধারণ' : 'Add New Admin & Configure Menu Access'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#787774] hover:text-[#2F3437] hover:bg-[#F7F6F3]"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {addError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium">
                  {addError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#787774] uppercase tracking-wider text-[11px]">
                  {isBn ? 'পুরো নাম' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Dr. Kazi Shafi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-[#2F3437] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#787774] uppercase tracking-wider text-[11px]">
                  {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'} *
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="shafi@vetmart.bd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-[#2F3437] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#787774] uppercase tracking-wider text-[11px]">
                    {isBn ? 'অ্যাডমিন পাসওয়ার্ড' : 'Initial Password'} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddPassword(generateRandomPassword())}
                    className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] underline cursor-pointer"
                  >
                    {isBn ? '🔄 পাসওয়ার্ড তৈরি করুন' : '🔄 Auto Generate'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] text-[#2F3437] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm font-bold"
                />
              </div>

              {/* Direct Menu Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block font-bold text-[#2F3437] uppercase tracking-wider text-[11px]">
                    {isBn ? 'অনুমোদিত মেনু সমূহ (সরাসরি টিক দিন)' : 'Direct Menu Permissions (Check to Allow)'}
                  </label>

                  {/* Presets Button Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset('all')}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      {isBn ? 'সব মেনু' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('inventory')}
                      className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#2F3437] border border-[#EAEAEA] text-[10px] font-medium hover:bg-white cursor-pointer"
                    >
                      {isBn ? 'ইনভেন্টরি' : 'Inventory'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('orders')}
                      className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#2F3437] border border-[#EAEAEA] text-[10px] font-medium hover:bg-white cursor-pointer"
                    >
                      {isBn ? 'অর্ডার' : 'Orders'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('none')}
                      className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium hover:bg-red-100 cursor-pointer"
                    >
                      {isBn ? 'মুছে দিন' : 'Clear'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MENU_ITEMS.map((menu) => {
                    const isChecked = addSelectedMenus.includes(menu.key);
                    return (
                      <div
                        key={menu.key}
                        onClick={() => toggleAddMenu(menu.key)}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-400 text-[#2F3437] shadow-xs'
                            : 'bg-[#FBFBFA] border-[#EAEAEA] text-[#787774] hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by div onClick
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{menu.icon}</span>
                            <span>{isBn ? menu.labelBn : menu.labelEn}</span>
                          </div>
                          <p className="text-[10px] text-[#787774] mt-0.5 line-clamp-1">
                            {isBn ? menu.descriptionBn : menu.descriptionEn}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#EAEAEA]">
                <input
                  type="checkbox"
                  id="addActive"
                  checked={addIsActive}
                  onChange={(e) => setAddIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="addActive" className="text-xs font-semibold text-[#2F3437] cursor-pointer">
                  {isBn ? 'অ্যাকাউন্ট সক্রিয় অবস্থায় তৈরি করুন' : 'Activate account immediately'}
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#787774] hover:bg-[#F7F6F3] font-semibold text-xs transition-colors cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {addLoading ? (isBn ? 'তৈরি হচ্ছে...' : 'Creating...') : isBn ? 'অ্যাডমিন তৈরি করুন' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MENU PERMISSIONS MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  ⚙️
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#2F3437]">
                    {isBn ? 'ইউজার মেনু পারমিশন নিয়ন্ত্রণ' : 'User Menu Access & Permissions'}
                  </h3>
                  <span className="text-xs text-[#787774] font-mono">{editingAdmin.email}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 rounded-lg text-[#787774] hover:text-[#2F3437] hover:bg-[#F7F6F3]"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium">
                  {editError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block font-semibold text-[#787774] uppercase tracking-wider text-[11px]">
                  {isBn ? 'অ্যাডমিন নাম' : 'Admin Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-[#2F3437] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Direct Menu Checkboxes Matrix */}
              <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block font-bold text-[#2F3437] uppercase tracking-wider text-[11px]">
                      {isBn ? 'অনুমোদিত মেনুসমূহ (টিক দিয়ে সক্রিয়/নিষ্ক্রিয় করুন)' : 'Permitted Menus (Check to Enable/Disable)'}
                    </label>
                    <span className="text-[10px] text-[#787774]">
                      {isBn ? 'ইউজার যে মেনুগুলোতে কাজ করতে পারবে সেগুলো সিলেক্ট করুন' : 'Select the exact menus this admin is allowed to access'}
                    </span>
                  </div>

                  {/* Presets Button Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset('all', true)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      {isBn ? 'সব মেনু' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('inventory', true)}
                      className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#2F3437] border border-[#EAEAEA] text-[10px] font-medium hover:bg-white cursor-pointer"
                    >
                      {isBn ? 'ইনভেন্টরি' : 'Inventory'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('orders', true)}
                      className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#2F3437] border border-[#EAEAEA] text-[10px] font-medium hover:bg-white cursor-pointer"
                    >
                      {isBn ? 'অর্ডার' : 'Orders'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('none', true)}
                      className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium hover:bg-red-100 cursor-pointer"
                    >
                      {isBn ? 'মুছে দিন' : 'Clear'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MENU_ITEMS.map((menu) => {
                    const isChecked = editSelectedMenus.includes(menu.key);
                    return (
                      <div
                        key={menu.key}
                        onClick={() => toggleEditMenu(menu.key)}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-400 text-[#2F3437] shadow-xs'
                            : 'bg-[#FBFBFA] border-[#EAEAEA] text-[#787774] hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{menu.icon}</span>
                            <span>{isBn ? menu.labelBn : menu.labelEn}</span>
                          </div>
                          <p className="text-[10px] text-[#787774] mt-0.5 line-clamp-1">
                            {isBn ? menu.descriptionBn : menu.descriptionEn}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Password Reset */}
              <div className="space-y-1 pt-2 border-t border-[#EAEAEA]">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#787774] uppercase tracking-wider text-[11px]">
                    {isBn ? 'পাসওয়ার্ড পরিবর্তন (ঐচ্ছিক)' : 'Reset Password (Optional)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateRandomPassword())}
                    className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] underline cursor-pointer"
                  >
                    {isBn ? '🔄 তৈরি করুন' : '🔄 Generate'}
                  </button>
                </div>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={isBn ? 'অপরিবর্তিত রাখতে ফাঁকা রাখুন' : 'Leave blank to keep current password'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-[#2F3437] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#EAEAEA]">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editIsActive}
                  disabled={editingAdmin.id === currentAdminId}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="editActive" className="text-xs font-semibold text-[#2F3437] cursor-pointer">
                  {isBn ? 'অ্যাকাউন্ট সক্রিয় রাখা হয়েছে' : 'Account is Active'}
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-[#787774] hover:bg-[#F7F6F3] font-semibold text-xs transition-colors cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {editLoading ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : isBn ? 'পারমিশন সংরক্ষণ করুন' : 'Save Menu Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto font-bold">
              🗑️
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-[#2F3437]">
                {isBn ? 'অ্যাডমিন অ্যাকাউন্ট মুছে ফেলবেন?' : 'Permanently Delete Admin?'}
              </h3>
              <p className="text-xs text-[#787774]">
                {isBn
                  ? `"${deleteConfirmAdmin.name}" (${deleteConfirmAdmin.email}) এর অ্যাকাউন্ট সম্পূর্ণভাবে মুছে ফেলা হবে এবং এর সমস্ত অ্যাক্সেস বন্ধ হয়ে যাবে।`
                  : `Are you sure you want to permanently delete "${deleteConfirmAdmin.name}" (${deleteConfirmAdmin.email})? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAdmin(null)}
                className="px-4 py-2 rounded-xl text-[#787774] hover:bg-[#F7F6F3] font-semibold text-xs transition-colors cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                {isBn ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
