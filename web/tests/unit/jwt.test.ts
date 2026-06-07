import { describe, it, expect } from 'vitest';
import {
  signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken,
} from '@/lib/auth/jwt';

describe('access tokens', () => {
  it('round-trips subject and role', () => {
    const token = signAccessToken('user-1', 'admin');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('admin');
  });

  it('rejects a garbage token', () => {
    expect(() => verifyAccessToken('not.a.token')).toThrow();
  });

  it('rejects an access token verified as a refresh token (separate secrets)', () => {
    const access = signAccessToken('user-1', 'user');
    expect(() => verifyRefreshToken(access)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('round-trips the subject', () => {
    const token = signRefreshToken('user-2');
    expect(verifyRefreshToken(token).sub).toBe('user-2');
  });
});
