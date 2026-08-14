// lib/auth/resolve.ts
// Unified User Resolver across Web Cookies and Mobile Bearer Tokens (§8)
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, type users as UsersTable } from '@/lib/db/schema';
import { verifyJwt } from './jwt';
import { getCustomerSessionUserId } from './session';

export type ResolvedUser = typeof users.$inferSelect;

/**
 * Resolve the current authenticated user from either:
 * 1. Mobile / API Authorization Bearer JWT header
 * 2. Web browser session cookie
 */
export async function resolveUser(req?: Request): Promise<ResolvedUser | null> {
  let userId: string | null = null;

  // 1. Check Authorization header
  const authHeader = req?.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyJwt(token);
    if (payload?.type === 'access') {
      userId = payload.sub;
    }
  }

  // 2. Fall back to web session cookie
  if (!userId) {
    try {
      userId = await getCustomerSessionUserId();
    } catch {
      // In standalone API contexts without Next.js cookies context
    }
  }

  if (!userId) return null;

  // 3. Fetch user from DB
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  return user;
}
