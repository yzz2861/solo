import jwt = require('jsonwebtoken');
import { UserRole } from '../entities/User';

export interface JwtPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  tenantId?: string;
}

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'visitor-wifi-jwt-secret-key-2024';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
