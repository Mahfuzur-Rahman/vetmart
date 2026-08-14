// app/[locale]/login/page.tsx
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { CustomerLoginForm } from '@/components/storefront/CustomerLoginForm';
import { LoginCarousel } from '@/components/storefront/LoginCarousel';
import { Link } from '@/lib/i18n/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerLoginPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      {/* Top Header with Back to Home Button & Brand */}
      <header className="w-full border-b border-border/70 bg-card/90 backdrop-blur-md px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between z-30 sticky top-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground font-semibold text-xs transition-all hover:-translate-x-0.5 active:scale-95 shadow-2xs shrink-0"
            title={loc === 'bn' ? 'হোম পেজে ফিরে যান' : 'Return to Home'}
          >
            <span className="text-sm">←</span>
            <span>{loc === 'bn' ? 'হোম' : 'Home'}</span>
          </Link>
          
          <div className="h-4 w-px bg-border hidden sm:block" />

          <Link href="/" className="flex items-center gap-2 group min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
              V
            </div>
            <span className="font-display font-bold text-sm text-foreground truncate">
              VetMart<span className="text-emerald-600">BD</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 24/7 Helpline pill (Desktop) */}
          <a
            href="tel:16624"
            className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <span>📞</span>
            <span>16624 ({loc === 'bn' ? '২৪/৭ সাপোর্ট' : 'Support'})</span>
          </a>

          {/* Language Switcher */}
          <div className="inline-flex items-center bg-secondary/70 rounded-lg p-0.5 border border-border text-[10px] sm:text-[11px] font-bold">
            <Link
              href="/login"
              locale="bn"
              className={`px-2 py-0.5 rounded transition-colors ${
                loc === 'bn' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              বাংলা
            </Link>
            <Link
              href="/login"
              locale="en"
              className={`px-2 py-0.5 rounded transition-colors ${
                loc === 'en' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </Link>
          </div>
        </div>
      </header>

      {/* Main 2-Column Auth Layout */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 bg-background">
        {/* Left Column: Interactive Full-Bleed Image & Text Carousel (50% Viewport Width) */}
        <div className="lg:col-span-6 w-full border-b lg:border-b-0 lg:border-r border-border/40 overflow-hidden">
          <LoginCarousel locale={loc} />
        </div>

        {/* Right Column: Full-Height Login Form Container */}
        <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-background">
          <div className="w-full max-w-lg">
            <CustomerLoginForm locale={loc} />
          </div>
        </div>
      </div>

    </div>
  );
}
