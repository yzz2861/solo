import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, User } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'accident-desk-secret-key-2024';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthRequest extends Request {
  user: User;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
};

export const roleMiddleware = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (requiredRole === UserRole.MANAGER && user.role !== UserRole.MANAGER) {
      return res.status(403).json({ error: '权限不足，需要经理权限' });
    }

    next();
  };
};

export const generateToken = (user: User): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
