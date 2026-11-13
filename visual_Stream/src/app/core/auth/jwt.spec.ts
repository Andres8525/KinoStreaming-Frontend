import { isTokenExpired, tokenExpiration } from './jwt';

export function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS512' })}.${encode(claims)}.signature`;
}

describe('JWT helpers', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('reads the expiration claim in milliseconds', () => {
    expect(tokenExpiration(fakeJwt({ sub: 'a@b.c', exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('detects expired and valid tokens', () => {
    expect(isTokenExpired(fakeJwt({ exp: now / 1000 - 60 }), now)).toBe(true);
    expect(isTokenExpired(fakeJwt({ exp: now / 1000 + 3600 }), now)).toBe(false);
  });

  it('applies the clock-skew margin', () => {
    expect(isTokenExpired(fakeJwt({ exp: now / 1000 + 5 }), now)).toBe(true);
  });

  it('treats tokens without a readable exp claim as not expired', () => {
    expect(tokenExpiration('not-a-jwt')).toBeNull();
    expect(tokenExpiration('a.%%%.c')).toBeNull();
    expect(isTokenExpired(fakeJwt({ sub: 'a@b.c' }), now)).toBe(false);
  });
});
