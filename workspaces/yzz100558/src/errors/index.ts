export class AppError extends Error {
  public readonly code: number;
  public readonly statusCode: number;

  constructor(message: string, code: number = 400, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 40001, 400);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 40002, 400);
    this.name = 'BusinessRuleError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 40401, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 40101, 401);
    this.name = 'UnauthorizedError';
  }
}
