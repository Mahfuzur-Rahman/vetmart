'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { MOCK_ADMIN_ACCOUNTS, setMockAdminSession } from '@/lib/mock-data/auth';

interface Props {
  locale: string;
}

export function AdminLoginForm({ locale }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const isBn = locale === 'bn';

  const handleQuickFill = (acc: typeof MOCK_ADMIN_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setNotification(
      isBn
        ? `স্বয়ংক্রিয় পূর্ণ হয়েছে: ${acc.roleName} (${acc.email})`
        : `Autofilled: ${acc.roleName} (${acc.email})`
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const match = MOCK_ADMIN_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.toLowerCase()
    ) || MOCK_ADMIN_ACCOUNTS[0];

    setMockAdminSession({
      email: match.email,
      name: match.name,
      roleKey: match.roleKey,
      roleName: match.roleName,
      isLoggedIn: true,
    });

    setTimeout(() => {
      setLoading(false);
      router.push('/admin');
      router.refresh();
    }, 400);
  };


  return (
    <div className="space-y-6">
      {/* DEMO CREDENTIALS QUICK FILL CARD */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs space-y-3">
        <div className="flex items-center justify-between font-bold text-emerald-700">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {isBn ? 'ডেমো লগইন নির্দেশিকা (১-ক্লিকে লগইন)' : '⚡ DEMO QUICK LOGIN (1-Click Auto-Fill)'}
          </span>
          <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-800">
            {isBn ? 'সক্রিয়' : 'Active Demo'}
          </span>
        </div>
        <p className="text-[#787774]">
          {isBn
            ? 'ডেমো প্রদর্শনের জন্য নিচের যে কোনো বাটনে ক্লিক করে সরাসরি লগইন করুন:'
            : 'Click any preset role below to instantly auto-fill & log in:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MOCK_ADMIN_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleQuickFill(acc)}
              className="px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 border border-[#EAEAEA] hover:border-emerald-300 text-left transition-all group"
            >
              <div className="font-semibold text-[#2F3437] group-hover:text-emerald-700 text-xs">
                🔑 {acc.roleName}
              </div>
              <div className="text-[10px] text-[#787774] font-mono mt-0.5">{acc.email}</div>
              <div className="text-[9px] text-[#A9A9A9] mt-1 font-mono">Pass: {acc.password}</div>
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs animate-fade-in font-medium">
          {notification}
        </div>
      )}

      {/* LOGIN FORM */}
      <form onSubmit={handleLogin} className="space-y-5 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-xl">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider">
            {isBn ? 'অ্যাডমিন ইমেইল' : 'Admin Email'}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@vetmart.bd"
            required
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#A9A9A9] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider">
            {isBn ? 'পাসওয়ার্ড' : 'Password'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAEAEA] text-[#2F3437] placeholder:text-[#A9A9A9] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2 pt-1 pb-2">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[#EAEAEA] bg-white text-emerald-500 focus:ring-emerald-500 focus:ring-offset-white"
          />
          <label htmlFor="rememberMe" className="text-xs text-[#787774] cursor-pointer select-none">
            {isBn ? 'আমাকে মনে রাখুন' : 'Remember me'}
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>{isBn ? 'প্রবেশ করা হচ্ছে...' : 'Signing in...'}</span>
          ) : (
            <span>{isBn ? 'অ্যাডমিন কনসোলে লগইন করুন →' : 'Sign In to Admin Console →'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
