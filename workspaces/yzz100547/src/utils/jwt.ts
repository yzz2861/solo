import jwt from 'jsonwebtoken';
import config from '../config';
import { JwtPayload } from '../models/types';

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret as jwt.Secret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
