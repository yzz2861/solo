import { Request, Response, NextFunction } from 'express';
import { checkIdempotency, saveIdempotencyKey } from '../utils/idempotency';
import { ApiResponse } from '../models/types';

export function idempotencyMiddleware(transactionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string || req.body.idempotency_key;

    if (!idempotencyKey) {
      return next();
    }

    const result = await checkIdempotency(idempotencyKey, transactionType);

    if (result.exists && result.response) {
      const response = result.response as ApiResponse;
      return res.status(200).json(response);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        saveIdempotencyKey(idempotencyKey, transactionType, body).catch(err => {
          console.error('保存幂等性键失败:', err);
        });
      }
      return originalJson(body);
    };

    next();
  };
}
