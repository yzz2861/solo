import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fraud-game-secret-key-2024';

export interface AuthPayload {
  id: number;
  username: string;
  role: 'police' | 'social_worker';
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthPayload;
      elderlyId?: number;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function policeAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) {
    return res.status(401).json({ error: '未登录' });
  }
  if (req.admin.role !== 'police') {
    return res.status(403).json({ error: '权限不足，需要民警账号' });
  }
  next();
}

export function elderlyAuth(req: Request, res: Response, next: NextFunction) {
  const elderlyId = req.headers['x-elderly-id'] as string;
  
  if (!elderlyId) {
    return res.status(401).json({ error: '请先登录' });
  }

  req.elderlyId = parseInt(elderlyId, 10);
  if (isNaN(req.elderlyId)) {
    return res.status(400).json({ error: '无效的用户ID' });
  }
  
  next();
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
