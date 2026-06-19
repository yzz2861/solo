import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  traceId?: string;
}

export class BusinessError extends Error {
  code: number;
  constructor(message: string, code: number = 400) {
    super(message);
    this.code = code;
    this.name = 'BusinessError';
  }
}

export function success<T>(res: Response, data?: T, message: string = 'ok'): void {
  res.json({
    code: 0,
    message,
    data,
  } as ApiResponse<T>);
}

export function fail(res: Response, message: string, code: number = 400): void {
  res.status(code >= 500 ? 500 : code).json({
    code,
    message,
  } as ApiResponse);
}

export function handleError(res: Response, err: unknown): void {
  if (err instanceof BusinessError) {
    fail(res, err.message, err.code);
    return;
  }
  if (err instanceof Error) {
    console.error('[Error]', err.stack || err.message);
    fail(res, err.message || '服务器内部错误', 500);
    return;
  }
  fail(res, '服务器内部错误', 500);
}
