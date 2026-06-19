import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { fail, handleError, BusinessError } from '../utils/response';
import { UserRole } from '../entities/User';

export interface AuthRequest extends Request {
  currentUser?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      fail(res, '请先登录', 401);
      return;
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      fail(res, '登录已过期，请重新登录', 401);
      return;
    }
    req.currentUser = payload;
    next();
  } catch (err) {
    handleError(res, err);
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        req.currentUser = payload;
      }
    }
    next();
  } catch {
    next();
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.currentUser) {
        fail(res, '请先登录', 401);
        return;
      }
      if (!roles.includes(req.currentUser.role)) {
        fail(res, `需要以下角色之一: ${roles.join(', ')}`, 403);
        return;
      }
      next();
    } catch (err) {
      handleError(res, err);
    }
  };
}

export function requireTenantPermission(getTenantId?: (req: AuthRequest) => string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.currentUser) {
        fail(res, '请先登录', 401);
        return;
      }
      if (req.currentUser.role === 'admin' || req.currentUser.role === 'reception') {
        next();
        return;
      }
      if (req.currentUser.role === 'tenant_admin') {
        const targetTenantId = getTenantId ? getTenantId(req) : undefined;
        if (targetTenantId && targetTenantId !== req.currentUser.tenantId) {
          fail(res, '无权操作其他租户的申请', 403);
          return;
        }
        next();
        return;
      }
      fail(res, '没有权限执行此操作', 403);
    } catch (err) {
      handleError(res, err);
    }
  };
}
