import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = '请求参数错误') {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let status = 'error';
  let message = '服务器内部错误';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    status = 'fail';
    const validationErr = err as unknown as { errors: Record<string, { message: string }> };
    message = Object.values(validationErr.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    status = 'fail';
    message = '无效的ID格式';
  } else if (err.name === 'MongoServerError') {
    const mongoErr = err as unknown as { code: number };
    if (mongoErr.code === 11000) {
      statusCode = 409;
      status = 'fail';
      message = '数据重复，唯一约束冲突';
    }
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    status = 'fail';
    message = 'JSON格式错误';
  }

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status,
      message,
      error: err,
      stack: err.stack
    });
  } else {
    res.status(statusCode).json({
      status,
      message
    });
  }

  _next();
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`无法找到 ${req.originalUrl} 路由`));
};
