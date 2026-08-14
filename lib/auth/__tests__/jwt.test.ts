// lib/auth/__tests__/jwt.test.ts
import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../jwt';

describe('JWT Utilities for Mobile & Web (§8)', () => {
  it('signs and verifies valid access tokens', () => {
    const token = signJwt({ sub: 'user-uuid-12345', type: 'access' }, 3600);
    const payload = verifyJwt(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-uuid-12345');
    expect(payload?.type).toBe('access');
  });

  it('rejects expired tokens', () => {
    // Negative expiration = expired in past
    const expiredToken = signJwt({ sub: 'user-expired', type: 'access' }, -10);
    const payload = verifyJwt(expiredToken);

    expect(payload).toBeNull();
  });

  it('rejects tampered token signatures', () => {
    const token = signJwt({ sub: 'user-good', type: 'access' }, 3600);
    const parts = token.split('.');

    // Tamper with payload
    const tampered = `${parts[0]}.eyJuZXdQYXlsb2FkIjoxfQ.${parts[2]}`;
    expect(verifyJwt(tampered)).toBeNull();
  });
});
