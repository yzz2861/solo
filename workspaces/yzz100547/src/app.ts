import express, { Application, Request, Response } from 'express';
import { errorHandler, notFoundHandler } from './utils/errors';
import { initDatabase } from './database';
import config from './config';

import authRoutes from './routes/authRoutes';
import activityRoutes from './routes/activityRoutes';
import pointsRoutes from './routes/pointsRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import exchangeRoutes from './routes/exchangeRoutes';
import reportRoutes from './routes/reportRoutes';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, message: '社区积分兑换服务运行正常', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/exchanges', exchangeRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function startServer(): Promise<void> {
  await initDatabase();

  const app = createApp();
  const port = config.port;

  app.listen(port, () => {
    console.log(`🚀 社区积分兑换服务已启动，监听端口: ${port}`);
    console.log(`📊 健康检查: http://localhost:${port}/health`);
    console.log(`🔧 API文档请参考: /api/* 下的各个接口`);
  });
}
