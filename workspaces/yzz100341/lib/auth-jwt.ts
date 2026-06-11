import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'bus-change-service-dev-secret-change-me';
export const COOKIE_NAME = 'bus_auth_token';
export const TOKEN_TTL = '7d';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'PARENT' | 'TEACHER' | 'DRIVER' | 'CONDUCTOR' | 'ADMIN';
  classId?: string | null;
  routeId?: string | null;
};

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

function b64UrlDecode(s: string): string {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  if (typeof atob !== 'undefined') {
    return atob(base64 + pad);
  }
  return Buffer.from(base64 + pad, 'base64').toString('utf-8');
}

export function parseTokenPayload(token: string): (SessionUser & { exp?: number; iat?: number }) | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(b64UrlDecode(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
