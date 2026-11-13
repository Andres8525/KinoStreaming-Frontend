export function tokenExpiration(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims: unknown = JSON.parse(atob(base64));
    if (typeof claims === 'object' && claims !== null && 'exp' in claims && typeof claims.exp === 'number') {
      return claims.exp * 1000;
    }
  } catch {
    return null;
  }
  return null;
}

export function isTokenExpired(token: string, now: number = Date.now(), skewMillis = 10_000): boolean {
  const expiration = tokenExpiration(token);
  return expiration !== null && expiration <= now + skewMillis;
}
