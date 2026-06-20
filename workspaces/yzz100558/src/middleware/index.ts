import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors';
import { ApiResponse, StaffRole } from '../types';
import { StaffRepository } from '../repositories';
import { logger } from '../utils/logger';

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, convert: true });
    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      throw new ValidationError(messages);
    }
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, convert: true });
    if (error) {
      const messages = error.details.map(d => d.message).join('; ');
      throw new ValidationError(messages);
    }
    req.query = value;
    next();
  };
}

export function requireRole(allowedRoles: StaffRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const staffIdStr = req.headers['x-staff-id'] as string;
      if (!staffIdStr) {
        return next(new ValidationError('缺少员工身份标识 x-staff-id'));
      }
      const staffId = parseInt(staffIdStr);
      const staff = StaffRepository.findById(staffId);
      if (!staff) {
        return next(new ValidationError('员工不存在'));
      }
      if (!allowedRoles.includes(staff.role)) {
        return next(new ValidationError(`当前角色 ${staff.role} 无权限操作，需要角色: ${allowedRoles.join(', ')}`));
      }
      (req as any).staff = staff;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    query: req.query,
    body: Object.keys(req.body).length > 0 ? { ...req.body, password: undefined } : undefined
  });
  next();
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Request error', { error: err.message, stack: err.stack });

  let response: ApiResponse;

  if (err.name === 'ValidationError' || err.code === 40001) {
    response = { code: 40001, message: err.message };
    res.status(400).json(response);
  } else if (err.name === 'BusinessRuleError' || err.code === 40002) {
    response = { code: 40002, message: err.message };
    res.status(400).json(response);
  } else if (err.name === 'NotFoundError' || err.code === 40401) {
    response = { code: 40401, message: err.message };
    res.status(404).json(response);
  } else if (err.name === 'UnauthorizedError' || err.code === 40101) {
    response = { code: 40101, message: err.message };
    res.status(401).json(response);
  } else {
    response = { code: 50000, message: '服务器内部错误' };
    res.status(500).json(response);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    code: 40400,
    message: '接口不存在'
  } as ApiResponse);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
