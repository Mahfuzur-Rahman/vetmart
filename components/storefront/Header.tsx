// components/storefront/Header.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { SPECIES } from '@/lib/services/species';
import { getMockCustomerSession, clearMockCustomerSession, type MockCustomerSession } from '@/lib/mock-data/auth';
import type { Locale } from '@/lib/i18n/config';

interface HeaderProps {
  locale: Locale;
  cartCount?: number;
}

const PHARMA_CATEGORIES = [
  { slug: 'vaccine', nameEn: 'Vaccines & Biologicals', nameBn: 'ভ্যাকসিন ও বায়োলজিক্যালস', emoji: '💉', descEn: 'Cold-chain guaranteed viral & bacterial vaccines', descBn: 'কোল্ড-চেইন নিশ্চিত ভাইরাল ও ব্যাকটেরিয়াল ভ্যাকসিন' },
  { slug: 'antibiotics', nameEn: 'Antibiotics & Anti-infectives', nameBn: 'অ্যান্টিবায়োটিক ও রেজিস্টার্ড ওষুধ', emoji: '💊', descEn: 'Injectables, bolus & oral antibiotics with withdrawal info', descBn: 'ইনজেকশন, বোলাস ও ওরাল অ্যান্টিবায়োটিক' },
  { slug: 'vitamins', nameEn: 'Feed Additives & Vitamins', nameBn: 'ফিড অ্যাডিটিভস ও ভিটামিন', emoji: '🌾', descEn: 'Growth promoters, premixes & liquid vitamins', descBn: 'গ্রোথ প্রমোটার, প্রিমিক্স ও লিকুইড ভিটামিন' },
  { slug: 'disinfectants', nameEn: 'Disinfectants & Biosecurity', nameBn: 'বায়ো-সিকিউরিটি ও ডিসইনফেক্টেন্ট', emoji: '🧼', descEn: 'Shed sanitizers, water purifiers & foot dip solutions', descBn: 'শেড জীবাণুনাশক ও পানি বিশুদ্ধকরণ' },
  { slug: 'dewormers', nameEn: 'Dewormers & Parasiticides', nameBn: 'কৃমিনাশক বোলুস ও ড্রেঞ্চ', emoji: '🧪', descEn: 'Broad-spectrum dewormers & ectoparasite drops', descBn: 'ব্রড-স্পেকট্রাম কৃমিনাশক ও পরজীবীনাশক' },
  { slug: 'hormones', nameEn: 'Reproductive & Hormones', nameBn: 'প্রজনন ও হরমোন প্রিপারেশন', emoji: '🧬', descEn: 'AI estrus synchronization & fertility boosters', descBn: 'কৃত্রিম প্রজনন ও হরমোন ব্যবস্থাপনা' },
];

const SERVICES_LINKS = [
  { href: '/products?category=vaccine', nameEn: 'Cold-Chain Delivery Specs', nameBn: 'কোল্ড-চেইন শিপিং তথ্য', emoji: '❄️', tagEn: '2°C–8°C Icebox', tagBn: '২°-৮° সে. কোল্ড বক্স' },
  { href: 'tel:16624', nameEn: 'Emergency Vet Line (16624)', nameBn: 'জরুরি ভেট হেল্পলাইন (১৬৬২৪)', emoji: '📞', tagEn: '24/7 Live Doctor', tagBn: '২৪/৭ রেজিস্টার্ড ভেট' },
  { href: '/products', nameEn: 'Upload Vet Prescription', nameBn: 'প্রেসক্রিপশন আপলোড করুন', emoji: '📋', tagEn: 'Pharmacist Review', tagBn: 'ফার্মাসিস্ট ভেরিফিকেশন' },
  { href: '/products', nameEn: 'Bulk Farm Supply Orders', nameBn: 'খামারের পাইকারি অর্ডার', emoji: '📦', tagEn: 'Wholesale Pricing', tagBn: 'পাইকারি রেট সুবিধা' },
];

export function Header({ locale, cartCount = 0 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<MockCustomerSession | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomer(getMockCustomerSession());

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mega menu on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white dark:bg-[#141916] text-foreground transition-shadow duration-200 ${
        isScrolled ? 'shadow-md border-b border-border/90' : 'shadow-sm border-b border-border'
      }`}
    >
      {/* ═══ TIER 1: Top Benefit Strip & Helpline ═══ */}
      <div className="bg-[#14432d] dark:bg-[#0c2317] text-white border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs">
          {/* Left Highlights */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide py-0.5">
            <div className="flex items-center gap-1.5 shrink-0 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{locale === 'bn' ? '১০০% ডিজিডিএ নিবন্ধিত ওষুধ' : '100% DGDA-Approved Vet Medicines'}</span>
            </div>
            <span className="hidden md:inline text-emerald-400/50">•</span>
            <div className="hidden md:flex items-center gap-1.5 shrink-0 text-emerald-100">
              <span>❄️</span>
              <span>{locale === 'bn' ? 'কোল্ড-চেইন ভ্যাকসিন ডেলিভারি' : 'Cold-Chain Assured Delivery'}</span>
            </div>
            <span className="hidden lg:inline text-emerald-400/50">•</span>
            <div className="hidden lg:flex items-center gap-1.5 shrink-0 text-emerald-100">
              <span>🚚</span>
              <span>{locale === 'bn' ? 'সারাদেশে ক্যাশ অন ডেলিভারি' : 'Nationwide Cash on Delivery'}</span>
            </div>
          </div>

          {/* Right Support & Language */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-medium">
            <a
              href="tel:16624"
              className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors"
              title="24/7 Helpline"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-700/80 flex items-center justify-center text-[10px]">
                📞
              </span>
              <span className="font-bold tracking-wide">16624</span>
              <span className="hidden sm:inline text-emerald-200/80">
                ({locale === 'bn' ? '২৪/৭ ভেট হেল্পলাইন' : '24/7 Helpline'})
              </span>
            </a>

            <span className="text-emerald-600 hidden sm:inline">|</span>

            {/* Language Switcher */}
            <div className="inline-flex items-center bg-emerald-950/70 dark:bg-emerald-950 rounded-lg p-0.5 border border-emerald-700/40 text-[11px]">
              <Link
                href="/"
                locale="bn"
                className={`px-2 py-0.5 font-bold rounded transition-colors ${
                  locale === 'bn'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                বাংলা
              </Link>
              <Link
                href="/"
                locale="en"
                className={`px-2 py-0.5 font-bold rounded transition-colors ${
                  locale === 'en'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                EN
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TIER 2: Main Brand, Search & Actions ═══ */}
      <div className="bg-white dark:bg-[#141916] border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Brand Logo with Custom Emblem */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white flex items-center justify-center shadow-sm ring-1 ring-emerald-500/30 group-hover:scale-105 group-hover:shadow-md transition-all">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Medical Cross + Leaf Emblem */}
                <path d="M12 4v16m-8-8h16" />
                <path d="M12 12c2.5-2.5 5-2 6 0s-.5 4.5-3 5-3.5-.5-3-5z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1 leading-none">
                <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  VetMart
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold text-[10px] tracking-wider uppercase">
                  BD
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block mt-0.5">
                {locale === 'bn' ? 'ভেটেরিনারি ই-ফার্মেসি ও খামার সেবা' : 'Veterinary Pharmacy & Livestock Care'}
              </span>
            </div>
          </Link>

          {/* Large Live Search Bar */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <form action="/products" method="GET" className="relative group">
              <div className="flex items-center rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 focus-within:bg-card focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner overflow-hidden">
                <div className="pl-3.5 pr-1.5 text-muted-foreground group-focus-within:text-emerald-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="q"
                  placeholder={
                    locale === 'bn'
                      ? 'ওষুধ, ভ্যাকসিন, প্রজাতি বা জেনেরিক নাম দিয়ে খুঁজুন (উদাঃ Renamycin, Cevac)...'
                      : 'Search medicines, vaccines, species, or generics (e.g. Renamycin, Cevac)...'
                  }
                  className="w-full py-2.5 pr-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 my-1 mr-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                >
                  <span>{locale === 'bn' ? 'অনুসন্ধান' : 'Search'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Quick Prescription Upload Button (High Value Action) */}
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-600/20 hover:border-emerald-600/40 transition-all shadow-xs"
              title={locale === 'bn' ? 'প্রেসক্রিপশন আপলোড করুন' : 'Upload Prescription'}
            >
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{locale === 'bn' ? 'প্রেসক্রিপশন আপলোড' : 'Upload Rx'}</span>
            </Link>

            {/* Account / Login Trigger */}
            {customer ? (
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-semibold transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate">{customer.name.split(' ')[0]}</span>
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu (Solid opaque card) */}
                <div className="absolute right-0 top-full mt-2 w-52 bg-card dark:bg-[#181f1b] rounded-xl border border-border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5 space-y-1">
                  <div className="p-2.5 border-b border-border/70">
                    <div className="text-xs font-bold text-foreground truncate">{customer.name}</div>
                    <div className="text-[11px] text-muted-foreground">{customer.phone}</div>
                  </div>
                  <Link
                    href="/products"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <span>📦</span>
                    <span>{locale === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders'}</span>
                  </Link>
                  <button
                    onClick={() => {
                      clearMockCustomerSession();
                      setCustomer(null);
                      window.location.reload();
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <span>🚪</span>
                    <span>{locale === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground bg-secondary/60 hover:bg-secondary border border-border transition-all"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{locale === 'bn' ? 'লগইন' : 'Sign In'}</span>
              </Link>
            )}

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              title={locale === 'bn' ? 'কার্ট দেখুন' : 'View Cart'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              <span className="hidden sm:inline">{locale === 'bn' ? 'কার্ট' : 'Cart'}</span>
              {cartCount > 0 && (
                <span className="bg-white text-emerald-800 text-[11px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-foreground hover:bg-secondary border border-border md:hidden transition-colors"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TIER 3: Category Mega-Menu Bar & Species Quick Bar (Desktop) ═══ */}
      <nav className="hidden md:block bg-white dark:bg-[#141916] border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-semibold">
          
          <div className="flex items-center gap-2">
            
            {/* Mega Menu Toggle Anchor */}
            <div
              className="relative"
              ref={megaMenuRef}
              onMouseEnter={() => setMegaMenuOpen(true)}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all border-r border-border/60 ${
                  megaMenuOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span>{locale === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${megaMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ═══ 3-Column Luxury Mega-Menu Popover (Solid Opaque) ═══ */}
              {megaMenuOpen && (
                <div
                  className="absolute left-0 top-full w-[820px] bg-white dark:bg-[#141916] border border-border rounded-b-2xl shadow-2xl p-6 grid grid-cols-3 gap-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Column 1: Species & Farm Animals */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border/70">
                      <span>🐄</span>
                      <span>{locale === 'bn' ? 'প্রজাতি ও গবাদিপশু' : 'Species & Livestock'}</span>
                    </div>
                    <div className="space-y-1">
                      {SPECIES.map((s) => (
                        <Link
                          key={s.key}
                          href={`/species/${s.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all group"
                        >
                          <span className="text-base group-hover:scale-110 transition-transform">{s.emoji}</span>
                          <div>
                            <div className="font-semibold">{locale === 'bn' ? s.nameBn : s.nameEn}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Pharmacological Medicine Categories */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border/70">
                      <span>💊</span>
                      <span>{locale === 'bn' ? 'ওষুধের ক্যাটাগরি' : 'Drug Classifications'}</span>
                    </div>
                    <div className="space-y-1.5">
                      {PHARMA_CATEGORIES.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/products?category=${cat.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl text-xs text-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all group"
                        >
                          <span className="text-base shrink-0 group-hover:scale-110 transition-transform">{cat.emoji}</span>
                          <div>
                            <div className="font-semibold leading-tight">{locale === 'bn' ? cat.nameBn : cat.nameEn}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                              {locale === 'bn' ? cat.descBn : cat.descEn}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Fast Vet Services & Trust Support */}
                  <div className="space-y-3 bg-secondary/40 p-4 rounded-2xl border border-border/60">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border/70">
                      <span>⚡</span>
                      <span>{locale === 'bn' ? 'জরুরি সেবা ও কোল্ড চেইন' : 'Vet Support & Services'}</span>
                    </div>
                    <div className="space-y-2">
                      {SERVICES_LINKS.map((srv, i) => (
                        <Link
                          key={i}
                          href={srv.href}
                          onClick={() => setMegaMenuOpen(false)}
                          className="flex flex-col gap-1 p-2.5 rounded-xl bg-card dark:bg-[#181f1b] border border-border/70 hover:border-emerald-500/50 hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span>{srv.emoji}</span>
                              <span className="truncate">{locale === 'bn' ? srv.nameBn : srv.nameEn}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pl-5">
                            {locale === 'bn' ? srv.tagBn : srv.tagEn}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Species Badges (Horizontal Row) */}
            <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide py-1.5">
              {SPECIES.map((s) => (
                <Link
                  key={s.key}
                  href={`/species/${s.slug}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-xs font-semibold transition-all whitespace-nowrap"
                >
                  <span className="text-sm">{s.emoji}</span>
                  <span>{locale === 'bn' ? s.nameBn : s.nameEn}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Highlight Links on Right */}
          <div className="flex items-center gap-3 shrink-0 pl-2">
            <Link
              href="/products?category=vaccine"
              className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap"
            >
              <span>❄️</span>
              <span>{locale === 'bn' ? 'কোল্ড চেইন ভ্যাকসিন' : 'Cold Chain'}</span>
            </Link>
            <span className="text-border">•</span>
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>{locale === 'bn' ? 'সকল ওষুধ' : 'All Products'}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE DRAWER (Solid Opaque Surface) ═══ */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop with click-to-close */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <div className="md:hidden fixed inset-x-0 top-0 z-50 bg-card dark:bg-[#141916] border-b border-border shadow-2xl max-h-[92vh] overflow-y-auto rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  V
                </div>
                <span className="font-display font-bold text-base text-foreground">
                  VetMart<span className="text-emerald-600">BD</span>
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-foreground"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Mobile Search */}
              <form action="/products" method="GET" className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder={locale === 'bn' ? 'ওষুধ, ভ্যাকসিন বা জেনেরিক খুঁজুন...' : 'Search drugs, vaccines, generics...'}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <svg className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>

              {/* Quick Actions (Prescription & Helpline) */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                >
                  <span>📋</span>
                  <span>{locale === 'bn' ? 'প্রেসক্রিপশন আপলোড' : 'Upload Rx'}</span>
                </Link>
                <a
                  href="tel:16624"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-600/20 text-rose-700 dark:text-rose-300 text-xs font-bold"
                >
                  <span>📞</span>
                  <span>{locale === 'bn' ? '১৬৬২৪ কল করুন' : 'Call 16624'}</span>
                </a>
              </div>

              {/* Medicine Categories */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-1">
                  {locale === 'bn' ? 'ওষুধের ক্যাটাগরি' : 'Medicine Categories'}
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {PHARMA_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/products?category=${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 text-xs font-semibold text-foreground hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{cat.emoji}</span>
                        <span>{locale === 'bn' ? cat.nameBn : cat.nameEn}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Species Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-1">
                  {locale === 'bn' ? 'প্রজাতি অনুযায়ী ক্যাটাগরি' : 'Browse by Species'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIES.map((s) => (
                    <Link
                      key={s.key}
                      href={`/species/${s.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 text-xs font-semibold text-foreground hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="truncate">{locale === 'bn' ? s.nameBn : s.nameEn}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* User Account / Auth Section */}
              <div className="pt-3 border-t border-border">
                {customer ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{customer.name}</div>
                        <div className="text-[11px] text-muted-foreground">{customer.phone}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        clearMockCustomerSession();
                        setCustomer(null);
                        window.location.reload();
                      }}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-bold transition-colors"
                    >
                      {locale === 'bn' ? 'লগআউট' : 'Logout'}
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <span>{locale === 'bn' ? 'লগইন / সাইন আপ' : 'Sign In / Register'}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
