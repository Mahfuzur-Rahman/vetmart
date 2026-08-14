// components/storefront/LoginCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n/config';

interface Slide {
  id: number;
  image: string;
  badge: { en: string; bn: string };
  title: { en: React.ReactNode; bn: React.ReactNode };
  description: { en: string; bn: string };
  pills: Array<{ icon: string; title: { en: string; bn: string }; sub: { en: string; bn: string } }>;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    image: '/images/vet-slide-1.png',
    badge: { en: '100% Genuine Medicine', bn: '১০০% খাঁটি ও আসল ওষুধ' },
    title: {
      en: (
        <>
          Nationwide Supply of <br />
          <span className="text-emerald-300">100% Genuine Vet Supplies</span>
        </>
      ),
      bn: (
        <>
          প্রাণিসম্পদ ও খামারের <br />
          <span className="text-emerald-300">১০০% খাঁটি ওষুধ ও ভ্যাকসিন</span>
        </>
      ),
    },
    description: {
      en: 'Direct access to verified pharmaceutical supplies, feed additives, and instant BVC vet prescription approvals.',
      bn: 'বিভিসি নিবন্ধিত বিশেষজ্ঞ ভেটেরিনারিয়ান দ্বারা প্রেসক্রিপশন নিরীক্ষণ এবং ক্যাশ অন ডেলিভারিতে দ্রুত শিপিং।',
    },
    pills: [
      {
        icon: '💊',
        title: { en: 'Authentic Pharma', bn: 'অরিজিনাল ফার্মাসিউটিক্যালস' },
        sub: { en: 'Direct from manufacturers', bn: 'কোম্পানি থেকে সরাসরি সংগৃহীত' },
      },
      {
        icon: '👨‍⚕️',
        title: { en: 'BVC Vet Review', bn: 'বিভিসি ডক্টর নিরীক্ষণ' },
        sub: { en: 'Instant Rx verification', bn: 'প্রেসক্রিপশন সিকিউরিটি' },
      },
    ],
  },
  {
    id: 2,
    image: '/images/vet-slide-2.png',
    badge: { en: 'Dairy & Farm Health', bn: 'ডেইরি ও পোল্ট্রি খামার পরিচর্যা' },
    title: {
      en: (
        <>
          Empowering 15,000+ <br />
          <span className="text-emerald-300">Dairy & Poultry Farmers</span>
        </>
      ),
      bn: (
        <>
          ১৫,০০০+ ডেইরি ও পোল্ট্রি <br />
          <span className="text-emerald-300">খামারির নির্ভরযোগ্য আস্থা</span>
        </>
      ),
    },
    description: {
      en: 'Comprehensive health solutions, growth promoters, and biologicals tailored for Bangladeshi livestock.',
      bn: 'বাংলাদেশি গবাদিপশু ও পোল্ট্রির জন্য বৈজ্ঞানিক গ্রোথ প্রমোটার, নিউট্রিশন ও হেলথ সলিউশন।',
    },
    pills: [
      {
        icon: '🐄',
        title: { en: 'Livestock Care', bn: 'গবাদিপশুর স্বাস্থ্য সুরক্ষা' },
        sub: { en: 'Cattle & Poultry products', bn: 'ডেইরি ও পোল্ট্রি পণ্য' },
      },
      {
        icon: '⚡',
        title: { en: 'Fast Processing', bn: 'দ্রুত প্রসেসিং' },
        sub: { en: '24-hour dispatch guarantee', bn: '২৪ ঘন্টায় ডেলিভারি প্রসেস' },
      },
    ],
  },
  {
    id: 3,
    image: '/images/vet-slide-3.png',
    badge: { en: 'Cold-Chain Shipping', bn: 'কোল্ড-চেইন এক্সপ্রেস শিপিং' },
    title: {
      en: (
        <>
          Strict Temperature-Controlled <br />
          <span className="text-emerald-300">Cold-Chain Express Delivery</span>
        </>
      ),
      bn: (
        <>
          নিরাপদ তাপমাত্রায় ভ্যাকসিন ও <br />
          <span className="text-emerald-300">বায়োলজিক্যাল এক্সপ্রেস শিপিং</span>
        </>
      ),
    },
    description: {
      en: 'Specialized insulated packaging for sensitive biologicals, vaccines, and liquid infusions.',
      bn: 'ভ্যাকসিন ও ইনজেক্টেবল লাইভ বায়োলজিক্যালসের জন্য তাপমাত্রা নিয়ন্ত্রিত বিশেষায়িত কোল্ড-ইনসুলেটেড প্যাকিং।',
    },
    pills: [
      {
        icon: '❄️',
        title: { en: 'Insulated Packing', bn: 'কোল্ড-ইনসুলেটেড বক্স' },
        sub: { en: 'Zero potency loss', bn: 'ভ্যাকসিনের গুণগত মান অক্ষুণ্ণ' },
      },
      {
        icon: '🚛',
        title: { en: 'Nationwide Express', bn: 'সারাদেশে হোম ডেলিভারি' },
        sub: { en: 'Cash on Delivery available', bn: 'ক্যাশ অন ডেলিভারি' },
      },
    ],
  },
];

interface LoginCarouselProps {
  locale: Locale;
}

export function LoginCarousel({ locale }: LoginCarouselProps) {
  const [current, setCurrent] = useState(0);
  const isBn = locale === 'bn';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="relative w-full h-full min-h-[360px] lg:min-h-[calc(100vh-4rem)] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-emerald-950 text-white">
      
      {/* Background Images Layer (Crossfade) */}
      {SLIDES.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-70 scale-105' : 'opacity-0 scale-100 pointer-events-none'
          }`}
          style={{ transitionProperty: 'opacity, transform' }}
        >
          <Image
            src={s.image}
            alt="Veterinary Slide Background"
            fill
            priority={index === 0}
            className="object-cover object-center mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/40 to-transparent z-10" />
        </div>
      ))}

      {/* Top Header Badge & Navigation Controls */}
      <div className="relative z-20 space-y-4 max-w-lg">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <span>🩺</span>
            <span>{isBn ? slide.badge.bn : slide.badge.en}</span>
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Headlines */}
        <div className="space-y-3 transition-all duration-500">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold font-display tracking-tight text-white leading-[1.15]">
            {isBn ? slide.title.bn : slide.title.en}
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-emerald-100/80 leading-relaxed font-normal">
            {isBn ? slide.description.bn : slide.description.en}
          </p>
        </div>
      </div>

      {/* Bottom Feature Pills & Testimonial Card */}
      <div className="relative z-20 space-y-4 pt-6 max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          {slide.pills.map((pill, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1 hover:border-emerald-400/40 transition-colors"
            >
              <div className="text-xl">{pill.icon}</div>
              <div className="text-xs font-bold text-white">
                {isBn ? pill.title.bn : pill.title.en}
              </div>
              <div className="text-[11px] text-emerald-200/80">
                {isBn ? pill.sub.bn : pill.sub.en}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonial Bar with Arrow Prev/Next Buttons */}
        <div className="p-3.5 rounded-2xl bg-emerald-900/70 backdrop-blur-md border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-xs shrink-0">
              DA
            </div>
            <div className="text-xs">
              <div className="font-bold text-white">Dr. Anisur Rahman</div>
              <div className="text-emerald-200/80 text-[11px]">
                {isBn ? 'যাচাইকৃত ভেটেরিনারিয়ান, বিভিসি #১০৪৯২' : 'Verified Veterinarian, BVC #10492'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-xs"
              title="Previous Slide"
            >
              ←
            </button>
            <button
              onClick={() => setCurrent((prev) => (prev + 1) % SLIDES.length)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-xs"
              title="Next Slide"
            >
              →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
