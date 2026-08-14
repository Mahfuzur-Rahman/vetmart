// components/storefront/HeroCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface HeroSlide {
  id: number;
  image: string;
  badge: { en: string; bn: string };
  title: { en: React.ReactNode; bn: React.ReactNode };
  description: { en: string; bn: string };
  primaryCta: { text: { en: string; bn: string }; href: string };
  secondaryCta: { text: { en: string; bn: string }; href: string };
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: '/images/hero-slide-1.png',
    badge: { en: "Bangladesh's Trusted Vet Platform", bn: 'বাংলাদেশের বিশ্বস্ত ভেটেরিনারি ই-কমার্স' },
    title: {
      en: (
        <>
          Genuine Medicines for <br />
          <span className="text-emerald-300">Animal Health & Farms</span>
        </>
      ),
      bn: (
        <>
          পশু স্বাস্থ্য ও খামারের জন্য <br />
          <span className="text-emerald-300">১০০% অরিজিনাল ওষুধ</span>
        </>
      ),
    },
    description: {
      en: 'DGDA-approved quality drugs, poultry vitamins, livestock injections & dewormers directly sourced from manufacturers.',
      bn: 'ডিজিডিএ অনুমোদিত কোয়ালিটি ড্রাগস, পোল্ট্রি ভিটামিন, গবাদিপশুর ইনজেকশন ও কৃমিনাশক। সরাসরি শীর্ষ প্রস্তুতকারকদের কাছ থেকে সংগ্রহীত।',
    },
    primaryCta: { text: { en: 'Browse All Products', bn: 'সকল ওষুধ দেখুন' }, href: '/products' },
    secondaryCta: { text: { en: '🐓 Poultry Corner', bn: '🐓 পোল্ট্রি কর্নার' }, href: '/species/poultry' },
  },
  {
    id: 2,
    image: '/images/hero-slide-2.png',
    badge: { en: 'Dairy & Cattle Care', bn: 'ডেইরি ও গবাদিপশুর ওষুধ' },
    title: {
      en: (
        <>
          Boost Milk Yield & Cattle Immunity <br />
          <span className="text-emerald-300">With Premium Supplements</span>
        </>
      ),
      bn: (
        <>
          দুগ্ধ উৎপাদন ও গরু-মহিষের সুস্থতায় <br />
          <span className="text-emerald-300">উন্নত মানের ভিটামিন ও ক্যালসিয়াম</span>
        </>
      ),
    },
    description: {
      en: 'High-potency calcium solutions, mineral mixtures, and oxytocin alternatives for dairy cows and bulls.',
      bn: 'দুগ্ধবতী গরুর জন্য উচ্চমানের ক্যালসিয়াম ড্রাফ্ট, মিনারেল মিক্সচার ও প্রজনন স্বাস্থ্য সুরক্ষার ওষুধ।',
    },
    primaryCta: { text: { en: 'Cattle Products', bn: 'গবাদিপশুর ওষুধ' }, href: '/species/cattle' },
    secondaryCta: { text: { en: '🐄 Cattle Corner', bn: '🐄 ক্যাটল কর্নার' }, href: '/species/cattle' },
  },
  {
    id: 3,
    image: '/images/hero-slide-3.png',
    badge: { en: 'Cold-Chain Express Shipping', bn: 'কোল্ড-চেইন এক্সপ্রেস শিপিং' },
    title: {
      en: (
        <>
          Insulated Temperature Controlled <br />
          <span className="text-emerald-300">Vaccine & Biological Delivery</span>
        </>
      ),
      bn: (
        <>
          নিরাপদ তাপমাত্রায় ভ্যাকসিন ও <br />
          <span className="text-emerald-300">বায়োলজিক্যালস এক্সপ্রেস শিপিং</span>
        </>
      ),
    },
    description: {
      en: 'Specialized cold-chain insulated packaging guaranteeing 100% potency retention nationwide.',
      bn: 'ভ্যাকসিন ও ইনজেক্টেবল ডিলিউয়েন্টের জন্য বিশেষায়িত তাপমাত্রা নিয়ন্ত্রিত কোল্ড বক্স প্যাকিং।',
    },
    primaryCta: { text: { en: 'View Vaccines', bn: 'ভ্যাকসিনসমূহ দেখুন' }, href: '/products?category=vaccine' },
    secondaryCta: { text: { en: '❄️ Cold-Chain Specs', bn: '❄️ কোল্ড-চেইন সুবিধা' }, href: '/products' },
  },
  {
    id: 4,
    image: '/images/hero-slide-4.png',
    badge: { en: 'Poultry Farm Solutions', bn: 'পোল্ট্রি ফার্মিং সলিউশন' },
    title: {
      en: (
        <>
          Maximum Growth & Egg Production <br />
          <span className="text-emerald-300">For Broiler & Layer Farms</span>
        </>
      ),
      bn: (
        <>
          ব্রয়লার ও লেয়ার মুরগির রোগ প্রতিরোধ ও <br />
          <span className="text-emerald-300">দ্রুত ওজনের জন্য অরিজিনাল ওষুধ</span>
        </>
      ),
    },
    description: {
      en: 'Specialized antibiotics, electrolytes, toxins binders, and growth boosters for commercial poultry sheds.',
      bn: 'কমার্শিয়াল পোল্ট্রি খামারের জন্য অ্যান্টিবায়োটিক, ইলেকট্রোলাইট, টক্সিন বাইন্ডার ও প্রোটিন ড্রপস।',
    },
    primaryCta: { text: { en: 'Poultry Medicines', bn: 'পোল্ট্রি ওষুধ' }, href: '/species/poultry' },
    secondaryCta: { text: { en: '🐣 Broiler & Layer Care', bn: '🐣 পোল্ট্রি কেয়ার' }, href: '/species/poultry' },
  },
  {
    id: 5,
    image: '/images/hero-slide-5.png',
    badge: { en: 'Aquaculture & Fish Care', bn: 'মৎস্য ও অ্যাকুয়াকালচার স্বাস্থ্য' },
    title: {
      en: (
        <>
          Pond Water Treatment & Fish Health <br />
          <span className="text-emerald-300">Probiotics & Growth Additives</span>
        </>
      ),
      bn: (
        <>
          পুকুরের পানি শোধন, মাছ ও চিংড়ির <br />
          <span className="text-emerald-300">প্রোবায়োটিক ও অক্সিজেন ট্যাবলেট</span>
        </>
      ),
    },
    description: {
      en: 'Water purifiers, oxygen releasers, and fish growth supplements formulated for Bangladeshi fisheries.',
      bn: 'মাছের রোগ প্রতিরোধে জীবাণুমুক্তকরণ ওষুধ, জিউলাইট, ও পিএইচ নিয়ন্ত্রক প্রোডাক্ট।',
    },
    primaryCta: { text: { en: 'Fisheries Care', bn: 'মৎস্য ওষুধ' }, href: '/species/aqua' },
    secondaryCta: { text: { en: '🐟 Aqua Products', bn: '🐟 অ্যাকুয়া প্রোডাক্ট' }, href: '/species/aqua' },
  },
  {
    id: 6,
    image: '/images/hero-slide-6.png',
    badge: { en: 'Pet & Small Animal Pharmacy', bn: 'পেট কেয়ার ও পেট ফার্মেসি' },
    title: {
      en: (
        <>
          Premium Pet Care & Medicines <br />
          <span className="text-emerald-300">For Dogs, Cats & Birds</span>
        </>
      ),
      bn: (
        <>
          কুকুর, বিড়াল ও পোষা পাখির জন্য <br />
          <span className="text-emerald-300">প্রিমিয়াম ফ্লি-টিক ওষুধ ও ভিটামিন</span>
        </>
      ),
    },
    description: {
      en: 'Flea & tick preventatives, deworming syrups, pet food supplements, and skin treatments.',
      bn: 'পোষা প্রাণীর জন্য কৃমিনাশক সিরাপ, শ্যাম্পু, স্কিন ড্রপস ও নিউট্রিশনাল গ্রোথ টনিক।',
    },
    primaryCta: { text: { en: 'Pet Supplies', bn: 'পেট কেয়ার শপ' }, href: '/species/pet' },
    secondaryCta: { text: { en: '🐶 Dogs & Cats', bn: '🐶 পেট কর্নার' }, href: '/species/pet' },
  },
  {
    id: 7,
    image: '/images/hero-slide-7.png',
    badge: { en: 'Farm Biosecurity & Sanitizers', bn: 'ফার্ম বায়ো-সিকিউরিটি ও স্প্রে' },
    title: {
      en: (
        <>
          100% Pathogen Free Sheds <br />
          <span className="text-emerald-300">With Hospital Grade Disinfectants</span>
        </>
      ),
      bn: (
        <>
          খামার জীবাণুমুক্ত রাখতে বিশ্বস্ত <br />
          <span className="text-emerald-300">বায়ো-সিকিউরিটি ডিসইনফেক্টেন্ট</span>
        </>
      ),
    },
    description: {
      en: 'Efficacy-tested shed spray sanitizers, footbath solutions, and viral outbreak preventatives.',
      bn: 'ভাইরাস, ব্যাকটেরিয়া ও ছত্রাক দমনে নিবন্ধিত ডিসইনফেক্টেন্ট স্প্রে ও শেড জীবাণুমুক্তকরণ কেমিক্যাল।',
    },
    primaryCta: { text: { en: 'Disinfectants', bn: 'ডিসইনফেক্টেন্ট দেখুন' }, href: '/products' },
    secondaryCta: { text: { en: '🛡️ Biosecurity', bn: '🛡️ বায়ো-সিকিউরিটি' }, href: '/products' },
  },
  {
    id: 8,
    image: '/images/hero-slide-8.png',
    badge: { en: 'Strategic Deworming Drives', bn: 'স্ট্র্যাটেজিক কৃমিনাশক ক্যাম্পেইন' },
    title: {
      en: (
        <>
          Broad Spectrum Dewormers <br />
          <span className="text-emerald-300">For Fluke & Roundworm Eradication</span>
        </>
      ),
      bn: (
        <>
          গরু, ছাগল ও ভেড়ার লিভার ফ্লুক ও <br />
          <span className="text-emerald-300">কৃমি দমনে উচ্চক্ষমতাসম্পন্ন বোলুস</span>
        </>
      ),
    },
    description: {
      en: 'Triclabendazole, Albendazole, and Levamisole drench and boluses for sheep, goat & cattle.',
      bn: 'গর্ভবতী পশুর জন্য নিরাপদ ট্রাইক্লাবেন্ডাজল ও অ্যালবেন্ডাজল কৃমিনাশক ট্যাবলেট ও ড্রেঞ্চ।',
    },
    primaryCta: { text: { en: 'Dewormers List', bn: 'কৃমিনাশক তালিকা' }, href: '/products' },
    secondaryCta: { text: { en: '🐐 Goat & Sheep', bn: '🐐 ছাগল ও ভেড়া' }, href: '/species/goat' },
  },
  {
    id: 9,
    image: '/images/hero-slide-9.png',
    badge: { en: '24/7 Registered Vet Consultation', bn: '২৪/৭ নিবন্ধিত ভেটেরিনারি সার্জন' },
    title: {
      en: (
        <>
          Instant Prescription Verification <br />
          <span className="text-emerald-300">By BVC Registered Doctors</span>
        </>
      ),
      bn: (
        <>
          জরুরি ভেটেরিনারি হেল্পলাইন ও <br />
          <span className="text-emerald-300">সরাসরি বিভিসি ডাক্তার পরামর্শ</span>
        </>
      ),
    },
    description: {
      en: 'Upload your farm prescription for immediate review by licensed pharmacists & veterinary surgeons.',
      bn: 'আপনার প্রেসক্রিপশনের ছবি আপলোড করুন, দ্রুত ভেরিফাই করে ওষুধ ডেলিভারি নিন।',
    },
    primaryCta: { text: { en: 'Upload Rx', bn: 'প্রেসক্রিপশন আপলোড' }, href: '/products' },
    secondaryCta: { text: { en: '📞 Call 16624', bn: '📞 হেল্পলাইন ১৬৬২৪' }, href: '/products' },
  },
  {
    id: 10,
    image: '/images/hero-slide-10.png',
    badge: { en: 'Feed Additives & Premix', bn: 'ফিড অ্যাডিটিভস ও প্রিমিক্স' },
    title: {
      en: (
        <>
          Balanced Nutrition Premixes <br />
          <span className="text-emerald-300">Enriched with Enzymes & Amino Acids</span>
        </>
      ),
      bn: (
        <>
          খামারের জন্য সুষম নিউট্রিশন, <br />
          <span className="text-emerald-300">অ্যামিনো এসিড ও এনজাইম প্রিমিক্স</span>
        </>
      ),
    },
    description: {
      en: 'Scientifically blended feed additives to improve FCR (Feed Conversion Ratio) and animal weight.',
      bn: 'খাবারের হজমশক্তি বাড়াতে এবং কম খরচে দ্রুত ওজন বাড়াতে এনজাইম ও ভিটামিন প্রিমিক্স।',
    },
    primaryCta: { text: { en: 'Feed Additives', bn: 'ফিড অ্যাডিটিভস' }, href: '/products' },
    secondaryCta: { text: { en: '🌾 Premix Store', bn: '🌾 প্রিমিক্স স্টোর' }, href: '/products' },
  },
];

interface HeroCarouselProps {
  locale: Locale;
}

export function HeroCarousel({ locale }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isBn = locale === 'bn';

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = HERO_SLIDES[current];

  return (
    <section 
      className="relative min-h-[540px] md:min-h-[600px] flex items-center overflow-hidden bg-[#071d12]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images Crossfade Layer */}
      {HERO_SLIDES.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-85 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
          style={{ transitionProperty: 'opacity, transform' }}
        >
          <Image
            src={s.image}
            alt="VetMart Hero Background"
            fill
            priority={index === 0}
            className="object-cover object-center"
          />
          {/* Rich Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#071d12]/95 via-[#071d12]/80 to-[#071d12]/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071d12] via-transparent to-[#071d12]/30 z-10" />
        </div>
      ))}

      {/* Hero Content Area */}
      <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
        <div className="max-w-2xl space-y-4 sm:space-y-6">
          
          {/* Top Badge & Slide Indicator Counter */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-[11px] sm:text-xs font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isBn ? slide.badge.bn : slide.badge.en}</span>
            </div>

            <span className="text-[11px] sm:text-xs font-extrabold text-emerald-300 bg-emerald-950/60 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-emerald-500/30">
              {current + 1} / {HERO_SLIDES.length}
            </span>
          </div>

          {/* Dynamic Animated Title */}
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.15] tracking-tight transition-all duration-500 break-words">
            {isBn ? slide.title.bn : slide.title.en}
          </h1>

          {/* Dynamic Animated Subhead */}
          <p className="text-sm sm:text-base md:text-lg text-emerald-100/80 leading-relaxed max-w-xl transition-all duration-500">
            {isBn ? slide.description.bn : slide.description.en}
          </p>

          {/* Dynamic Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pt-2">
            <Link
              href={slide.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/50 hover:shadow-emerald-800/50 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{isBn ? slide.primaryCta.text.bn : slide.primaryCta.text.en}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <Link
              href={slide.secondaryCta.href}
              className="inline-flex items-center justify-center px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              {isBn ? slide.secondaryCta.text.bn : slide.secondaryCta.text.en}
            </Link>
          </div>

        </div>
      </div>

      {/* Carousel Thumbnails / Navigation Bar */}
      <div className="absolute bottom-5 left-0 right-0 z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Slide Progress Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide">
          {HERO_SLIDES.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrent(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-8 bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'w-2.5 bg-white/30 hover:bg-white/60'
              }`}
              title={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Prev / Next Controls */}
        <div className="flex items-center gap-2 shrink-0 bg-black/30 backdrop-blur-md p-1 rounded-2xl border border-white/15">
          <button
            onClick={() => setCurrent((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
            className="p-2 rounded-xl text-white hover:bg-white/20 transition-colors"
            title="Previous Slide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="p-2 rounded-xl text-white hover:bg-white/20 transition-colors"
            title="Next Slide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

    </section>
  );
}
