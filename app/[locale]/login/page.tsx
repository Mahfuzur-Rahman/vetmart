// app/[locale]/login/page.tsx
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { CustomerLoginForm } from '@/components/storefront/CustomerLoginForm';
import { LoginCarousel } from '@/components/storefront/LoginCarousel';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerLoginPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 bg-background">
      
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
  );
}
