// components/storefront/CustomerLoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/lib/i18n/navigation';
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
    try {
      // In production / standard auth, route to auth provider / customer login endpoint
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || (isBn ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground">
          {isBn ? 'VetMart-এ সাইন ইন করুন' : 'Sign in to VetMart'}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isBn ? 'আপনার খামারের ওষুধ, অর্ডার ও প্রেসক্রিপশন এক জায়গায় ম্যানেজ করুন' : 'Access nationwide vet medicine ordering, prescriptions & farm supplies'}
        </p>
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
              placeholder="user@example.com"
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
    </div>
  );
}
