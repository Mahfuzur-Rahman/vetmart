import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/i18n/navigation';
import { inter, outfit, hindSiliguri } from '@/app/fonts';
import { checkDbConnection } from '@/lib/db';
import { TopProgressBar } from '@/components/TopProgressBar';
import { CartProvider } from '@/lib/context/CartContext';
import '@/app/globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'VetMart BD — ভেটেরিনারি মেডিসিন ও পশু স্বাস্থ্য',
    template: '%s | VetMart BD',
  },
  description: 'বাংলাদেশের সবচেয়ে বিশ্বস্ত ভেটেরিনারি ওষুধ, ভ্যাকসিন ও পশু স্বাস্থ্য ই-কমার্স প্ল্যাটফর্ম',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  // If DB is down, show a global maintenance screen instead of trying to render the app
  const isDbUp = await checkDbConnection();
  if (!isDbUp) {
    return (
      <html lang={locale} className={`${inter.variable} ${outfit.variable} ${hindSiliguri.variable} antialiased`} suppressHydrationWarning>
        <body className="min-h-dvh flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md bg-card border rounded-2xl shadow-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-destructive mb-3">
              {locale === 'bn' ? 'সিস্টেম মেইনটেন্যান্স' : 'System Maintenance'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'bn' 
                ? 'আমাদের ডাটাবেস সার্ভার সাময়িকভাবে বন্ধ আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' 
                : 'Our database server is temporarily unavailable. Please try again in a few minutes.'}
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={locale} className={`${inter.variable} ${outfit.variable} ${hindSiliguri.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500 selection:text-white">
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <TopProgressBar />
            {children}
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
