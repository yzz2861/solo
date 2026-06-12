import { Router, Request, Response } from 'express';

const router = Router();

router.post('/pillbox', (req: Request, res: Response) => {
  res.json({
    success: true,
    imported: 0,
    errors: [],
    message: '请在前端使用useDataStore直接导入数据',
  });
});

router.post('/nurse', (req: Request, res: Response) => {
  res.json({
    success: true,
    imported: 0,
    errors: [],
    message: '请在前端使用useDataStore直接导入数据',
  });
});

router.post('/prescription', (req: Request, res: Response) => {
  res.json({
    success: true,
    imported: 0,
    errors: [],
    message: '请在前端使用useDataStore直接导入数据',
  });
});

export default router;
