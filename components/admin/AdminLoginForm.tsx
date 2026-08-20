'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/i18n/navigation';

interface Props {
  locale: string;
}

export function AdminLoginForm({ locale }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isBn = locale === 'bn';

  /**
   * Authenticate against the server session API.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }

      setErrorText(
        json?.error?.message ??
          (isBn ? 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।' : 'Login failed. Please verify credentials and try again.')
      );
    } catch (err) {
      console.error('Admin login failed:', err);
      setErrorText(
        isBn
          ? 'সার্ভারের সাথে সংযোগ করা যায়নি।'
          : 'Could not reach the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorText && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-medium leading-relaxed"
        >
          {errorText}
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
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
