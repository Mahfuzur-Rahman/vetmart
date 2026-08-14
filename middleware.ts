// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/lib/i18n/navigation';

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  // 1. Run next-intl middleware first to handle locales
  const response = intlMiddleware(req);

  // 2. If next-intl is redirecting (e.g., /admin -> /en/admin), let it happen first
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  // 3. Add Admin Auth Guard
  const pathname = req.nextUrl.pathname;
  
  const isAdminRoute = pathname.match(/^\/(en|bn)\/admin/);
  const isLoginPage = pathname.match(/^\/(en|bn)\/admin\/login/);

  if (isAdminRoute) {
    const adminSession = req.cookies.get('vetmart_admin_session')?.value;
    
    // Extract locale or fallback to default
    const localeMatch = pathname.match(/^\/(en|bn)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    
    if (!isLoginPage && !adminSession) {
      // Not logged in -> redirect to login
      const loginUrl = new URL(`/${locale}/admin/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (isLoginPage && adminSession) {
      // Already logged in -> redirect to dashboard
      const dashboardUrl = new URL(`/${locale}/admin`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  // Match all request paths except for:
  // - API routes (/api/...)
  // - Next.js internal files (/_next/...)
  // - Metadata/static files (favicon.ico, sitemap.xml, robots.txt, media assets)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
