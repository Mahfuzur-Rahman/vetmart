// app/[locale]/cart/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { CartView } from '@/components/storefront/CartView';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <Header locale={loc} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {loc === 'bn' ? 'আপনার শপিং কার্ট' : 'Your Shopping Cart'}
        </h1>

        {/* Interactive Cart View */}
        <CartView locale={loc} />
      </main>

      <Footer locale={loc} />
    </div>
  );
}
