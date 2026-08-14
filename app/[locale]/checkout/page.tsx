// app/[locale]/checkout/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { CheckoutForm } from '@/components/storefront/CheckoutForm';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {loc === 'bn' ? 'অর্ডার প্রস্তুত ও ডেলিভারি' : 'Checkout & Delivery'}
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
            <span>🔒 SSL Encrypted & COD Ready</span>
          </div>
        </div>

        {/* Interactive Checkout Form */}
        <CheckoutForm locale={loc} />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
