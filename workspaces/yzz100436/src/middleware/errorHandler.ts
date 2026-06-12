import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`, err.stack);

  const response: ApiResponse = {
    success: false,
    error: err.message,
    message: '请求处理失败'
  };

  const statusCode = (err as any).statusCode || 400;
  res.status(statusCode).json(response);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
