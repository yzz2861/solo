import { Router, Request, Response } from 'express';

const router = Router();

router.get('/daily', (req: Request, res: Response) => {
  const { startDate, endDate, floor } = req.query;
  
  res.json({
    success: true,
    data: [],
    message: '请在前端使用useDataStore直接获取数据',
  });
});

router.get('/floor', (req: Request, res: Response) => {
  const { date } = req.query;
  
  res.json({
    success: true,
    data: [],
    message: '请在前端使用useDataStore直接获取数据',
  });
});

router.get('/risk', (req: Request, res: Response) => {
  const { limit } = req.query;
  
  res.json({
    success: true,
    data: [],
    message: '请在前端使用useDataStore直接获取数据',
  });
});

export default router;
