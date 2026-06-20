import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/packageService';
import { BusinessError } from '../types';

const router = Router();

function handleService(res: Response, fn: () => any): void {
  try {
    const result = fn();
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof BusinessError) {
      res.status(400).json({ success: false, error: err.message, code: err.code });
    } else {
      console.error(err);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
}

const FreezeSchema = z.object({
  package_id: z.string().min(1),
  freeze_date: z.string().min(1),
  unfreeze_date: z.string().optional(),
  reason: z.string().min(1),
  operator: z.string().min(1),
});

const UnfreezeSchema = z.object({
  freeze_id: z.string().min(1),
  unfreeze_date: z.string().min(1),
  unfreeze_reason: z.string().min(1),
  expired_extend_reason: z.string().optional(),
  operator: z.string().min(1),
});

const ConsumeSchema = z.object({
  package_id: z.string().min(1),
  schedule_id: z.string().min(1),
  lesson_date: z.string().min(1),
  lessons_consumed: z.number().int().positive().optional(),
  teacher_id: z.string().optional(),
  note: z.string().optional(),
  operator: z.string().min(1),
});

const AdjustSchema = z.object({
  package_id: z.string().min(1),
  adjustment: z.number().int(),
  reason: z.string().min(1),
  approved_by: z.string().min(1),
  operator: z.string().min(1),
});

export function createCoreRouter(service: PackageService = new PackageService()): Router {
  router.post('/freeze', (req: Request, res: Response) => {
    const parse = FreezeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: '参数错误', details: parse.error.flatten() });
    handleService(res, () => service.freezePackage(parse.data));
  });

  router.post('/unfreeze', (req: Request, res: Response) => {
    const parse = UnfreezeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: '参数错误', details: parse.error.flatten() });
    handleService(res, () => service.unfreezePackage(parse.data));
  });

  router.post('/consume', (req: Request, res: Response) => {
    const parse = ConsumeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: '参数错误', details: parse.error.flatten() });
    handleService(res, () => {
      const result = service.consumeLesson(parse.data);
      return {
        ...result.record,
        duplicated: result.duplicated,
        duplicate_warning: result.duplicated ? '重复消课通知：已按幂等处理，未重复扣课' : undefined,
      };
    });
  });

  router.post('/adjust', (req: Request, res: Response) => {
    const parse = AdjustSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, error: '参数错误', details: parse.error.flatten() });
    handleService(res, () => service.adjustBalance(parse.data));
  });

  return router;
}

export { router as coreRouter };
