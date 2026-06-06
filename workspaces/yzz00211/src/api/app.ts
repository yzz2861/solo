import express, { Application } from 'express';
import { handoverRouter } from './routes/handover.routes';

export function createApp(): Application {
  const app: Application = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/v1', handoverRouter);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'anesthesia-drug-handover-api',
      version: '1.0.0',
    });
  });

  return app;
}
