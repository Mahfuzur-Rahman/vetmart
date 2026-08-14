// components/storefront/Footer.tsx
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  return (
    <footer className="mt-auto">
      {/* Pre-footer CTA */}
      <section className="bg-primary/5 border-t border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-display font-bold text-foreground">
              {locale === 'bn'
                ? 'বাল্ক ভেটেরিনারি সাপ্লাই দরকার?'
                : 'Need bulk veterinary supplies?'}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === 'bn'
                ? 'হোলসেল ডেস্কে কল করুন — বিশেষ মূল্য ও ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার পাবেন'
                : 'Call our wholesale desk — get special pricing and a dedicated account manager'}
            </p>
          </div>
          <a
            href="tel:+8801712345678"
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:brightness-110 transition-all whitespace-nowrap"
          >
            📞 +880 1712 345 678
          </a>
        </div>
      </section>

      {/* Main Footer */}
      <div className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
                  V
                </div>
                <span className="font-display text-lg font-bold text-foreground">
                  VetMart<span className="text-primary">BD</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === 'bn'
                  ? 'বাংলাদেশের খামারি, নিবন্ধিত ভেটেরিনারি সার্জন ও পেট ওনারদের জন্য ডিজিডিএ নিবন্ধিত ওষুধ ও পশু স্বাস্থ্য পণ্যের নির্ভরযোগ্য ই-কমার্স।'
                  : 'Trusted DGDA-registered veterinary medicine and animal health e-commerce for farmers, registered vets, and pet owners in Bangladesh.'}
              </p>
            </div>

            {/* DGDA Badge */}
            <div className="space-y-3 md:col-span-1 p-4 rounded-xl border border-primary/15 bg-primary/5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{locale === 'bn' ? 'ডিজিডিএ অনুমোদন' : 'DGDA compliance'}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {locale === 'bn'
                  ? 'সকল ভেটেরিনারি অ্যান্টিবায়োটিক ও নির্দেশিত ইনজেকশন ক্রয়ে নিবন্ধিত ভেটেরিনারি সার্জনের প্রেসক্রিপশন আবশ্যক।'
                  : 'Valid prescription from a registered veterinary surgeon is strictly required for prescription drugs and antibiotics.'}
              </p>
            </div>

            {/* Links */}
            <div className="space-y-3 text-sm">
              <h4 className="font-display font-semibold text-foreground">
                {locale === 'bn' ? 'জরুরি লিংক' : 'Quick links'}
              </h4>
              <ul className="space-y-2.5 text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    {locale === 'bn' ? 'হোম' : 'Home'}
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-primary transition-colors">
                    {locale === 'bn' ? 'সকল ওষুধ ও পণ্য' : 'All products'}
                  </Link>
                </li>
                <li>
                  <Link href="/species/poultry" className="hover:text-primary transition-colors">
                    {locale === 'bn' ? 'পোল্ট্রি মেডিসিন' : 'Poultry medicines'}
                  </Link>
                </li>
                <li>
                  <Link href="/species/cattle" className="hover:text-primary transition-colors">
                    {locale === 'bn' ? 'গরু ও গবাদিপশু' : 'Cattle & livestock'}
                  </Link>
                </li>
                <li className="pt-1">
                  <Link
                    href="/admin"
                    className="hover:text-primary transition-colors inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>🔐</span>
                    <span>{locale === 'bn' ? 'স্টাফ ও অ্যাডমিন লগইন' : 'Staff & Admin Login'}</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-3 text-sm">
              <h4 className="font-display font-semibold text-foreground">
                {locale === 'bn' ? 'যোগাযোগ' : 'Contact'}
              </h4>
              <div className="space-y-2 text-muted-foreground text-xs">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Phone:</span> +880 1712 345 678
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Email:</span> support@vetmart.com.bd
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Address:</span> Level 4, VetMart Tower, Uttara, Dhaka-1230
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p>© {new Date().getFullYear()} VetMart BD. All rights reserved.</p>
              <span className="hidden sm:inline text-border">•</span>
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 hover:underline"
              >
                <span>🛡️</span>
                <span>{locale === 'bn' ? 'স্টাফ পোর্টাল (/admin)' : 'Staff Portal (/admin)'}</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span>{locale === 'bn' ? 'পেমেন্ট: ক্যাশ অন ডেলিভারি / বিকাশ / এসএসএলকমার্জ' : 'Payment: COD / bKash / SSLCommerz'}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
