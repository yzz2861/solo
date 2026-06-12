import { Router, Request, Response } from 'express';

const router = Router();

router.get('/:id/medications', (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  
  res.json({
    success: true,
    data: [],
    message: '请在前端使用useDataStore直接获取数据',
  });
});

router.get('/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    data: [],
    message: '请在前端使用useDataStore直接获取数据',
  });
});

export default router;
