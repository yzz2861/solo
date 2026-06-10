import { Request, Response, NextFunction } from 'express';

type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'array';
  minLength?: number;
  min?: number;
};

export function validate(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`字段 "${rule.field}" 为必填项`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`字段 "${rule.field}" 必须是字符串`);
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`字段 "${rule.field}" 必须是数字`);
      }

      if (rule.type === 'array' && !Array.isArray(value)) {
        errors.push(`字段 "${rule.field}" 必须是数组`);
      }

      if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
        errors.push(`字段 "${rule.field}" 最少需要 ${rule.minLength} 个字符`);
      }

      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(`字段 "${rule.field}" 不能小于 ${rule.min}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors.join('; '),
        },
      });
      return;
    }

    next();
  };
}
