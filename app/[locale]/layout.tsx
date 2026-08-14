import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/i18n/navigation';
import { inter, outfit, hindSiliguri } from '@/app/fonts';
import { TopProgressBar } from '@/components/TopProgressBar';
import '@/app/globals.css';

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

  return (
    <html lang={locale} className={`${inter.variable} ${outfit.variable} ${hindSiliguri.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500 selection:text-white">
        <NextIntlClientProvider messages={messages}>
          <TopProgressBar />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
