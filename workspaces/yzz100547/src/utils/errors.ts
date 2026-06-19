import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../models/types';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const response: ApiResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  if (err instanceof AppError) {
    res.status(err.statusCode).json(response);
  } else {
    console.error('Unexpected error:', err);
    res.status(500).json(response);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Not Found - ${req.method} ${req.originalUrl}`, 404));
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
