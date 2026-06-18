import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import vehiclesRouter from './routes/vehicles';
import queueRouter from './routes/queue';
import devicesRouter from './routes/devices';
import statsRouter from './routes/stats';
import predictionRouter from './routes/prediction';
import notificationsRouter from './routes/notifications';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: '环卫压缩站转运排队系统 API 运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: '欢迎使用环卫压缩站转运排队系统 API',
    version: '1.0.0',
    endpoints: {
      vehicles: '/api/vehicles',
      queue: '/api/queue',
      devices: '/api/devices',
      stats: '/api/stats',
      prediction: '/api/prediction',
      notifications: '/api/notifications'
    }
  });
});

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/queue', queueRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/prediction', predictionRouter);
app.use('/api/notifications', notificationsRouter);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
