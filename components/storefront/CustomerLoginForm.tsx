// components/storefront/CustomerLoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { MOCK_CUSTOMER_ACCOUNT, setMockCustomerSession } from '@/lib/mock-data/auth';
import type { Locale } from '@/lib/i18n/config';

interface CustomerLoginFormProps {
  locale: Locale;
}

export function CustomerLoginForm({ locale }: CustomerLoginFormProps) {
  const router = useRouter();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isBn = locale === 'bn';

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(isBn ? 'সঠিক ইমেইল ঠিকানা দিন' : 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setError(isBn ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // Login with Demo account or dynamically create session for user
      const isDemoAccount = email.toLowerCase() === MOCK_CUSTOMER_ACCOUNT.email.toLowerCase();

      setMockCustomerSession({
        phone: isDemoAccount ? MOCK_CUSTOMER_ACCOUNT.phone : '01700000000',
        name: isDemoAccount ? MOCK_CUSTOMER_ACCOUNT.name : (email.split('@')[0] || 'Registered Customer'),
        tier: isDemoAccount ? MOCK_CUSTOMER_ACCOUNT.tier : 'customer',
        isVerifiedVet: isDemoAccount ? MOCK_CUSTOMER_ACCOUNT.isVerifiedVet : false,
        bvcRegNo: isDemoAccount ? MOCK_CUSTOMER_ACCOUNT.bvcRegNo : undefined,
        isLoggedIn: true,
      });
      router.push('/');
      router.refresh();
    }, 600);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setMockCustomerSession({
        phone: '01711000000',
        name: 'Dr. Anisur Rahman (Google)',
        tier: 'vet',
        isVerifiedVet: true,
        bvcRegNo: 'BVC-REG-10492',
        isLoggedIn: true,
      });
      router.push('/');
      router.refresh();
    }, 700);
  };

  const handleQuickDemoFill = () => {
    setEmail(MOCK_CUSTOMER_ACCOUNT.email);
    setPassword(MOCK_CUSTOMER_ACCOUNT.password);
    setError('');
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Back to Home Breadcrumb */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>{isBn ? 'মূল দোকানে ফিরে যান' : 'Back to Storefront'}</span>
        </Link>

        <span className="text-[11px] text-muted-foreground bg-secondary/70 px-2 py-0.5 rounded-md font-medium border border-border/50">
          {isBn ? 'নিরাপদ লগইন' : 'Secure Login'}
        </span>
      </div>

      {/* Top Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold font-display tracking-tight text-foreground">
          {isBn ? 'VetMart-এ সাইন ইন করুন' : 'Sign in to VetMart'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isBn ? 'আপনার খামারের ওষুধ, অর্ডার ও প্রেসক্রিপশন এক জায়গায় ম্যানেজ করুন' : 'Access nationwide vet medicine ordering, prescriptions & farm supplies'}
        </p>
      </div>

      {/* Quick Demo Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 flex items-center justify-between gap-3 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
          </span>
          <div className="text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs sm:text-sm">
              {isBn ? 'একক-ক্লিক ডেমো সাইন-ইন' : 'One-Click Demo Sign-In'}
            </span>
            <span className="text-muted-foreground text-xs">
              {isBn ? 'ডঃ আনিসুর রহমান (রেজিস্টার্ড ভেটেরিনারিয়ান)' : 'Dr. Anisur Rahman (Verified Vet Account)'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleQuickDemoFill}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>⚡</span>
          <span>{isBn ? 'অটো-ফিল' : 'Auto Fill'}</span>
        </button>
      </div>

      {/* Google Auth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-2xl border border-border bg-card hover:bg-accent text-foreground font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.25 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{isBn ? 'Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন' : 'Continue with Google'}</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-background px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isBn ? 'অথবা ইমেইল দিয়ে সাইন ইন' : 'or sign in with email'}
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Direct Email & Password Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ✉️
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anisur.vet@gmail.com"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-input text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/40 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-semibold text-primary hover:underline">
              {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </a>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              🔒
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-card border border-input text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <span>{isBn ? 'সাইন ইন করুন' : 'Sign In'}</span>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="pt-2 text-center text-xs text-muted-foreground">
        {isBn ? 'নতুন অ্যাকাউন্ট খুলতে চান? ' : 'Don’t have an account? '}
        <button
          type="button"
          onClick={handleQuickDemoFill}
          className="font-bold text-primary hover:underline cursor-pointer"
        >
          {isBn ? 'এখানে রেজিস্টার করুন' : 'Sign up now'}
        </button>
      </div>

    </div>
  );
}

