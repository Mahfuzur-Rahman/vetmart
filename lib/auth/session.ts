// lib/auth/session.ts
// Cookie-based session management for Web (separate customer and admin cookies §8)
import { cookies } from 'next/headers';
import { signJwt, verifyJwt } from './jwt';

const CUSTOMER_SESSION_COOKIE = 'vetmart_session';
const ADMIN_SESSION_COOKIE = 'vetmart_admin_session';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days for customer
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours for admin

export async function setCustomerSession(userId: string) {
  const token = signJwt({ sub: userId, type: 'access' }, SESSION_TTL_SECONDS);
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getCustomerSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyJwt(token);
  return payload?.sub ?? null;
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

// ---------------- Admin Session (Completely Separate §8, §14.1) ----------------

export async function setAdminSession(adminId: string) {
  const token = signJwt({ sub: adminId, role: 'admin', type: 'access' }, ADMIN_SESSION_TTL_SECONDS);
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function getAdminSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload.sub;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
