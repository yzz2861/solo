import 'reflect-metadata';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import {
  orderRoutes,
  cutoffRoutes,
  deliveryRoutes,
  substitutionRoutes,
  refundRoutes,
  sortingRoutes,
  masterDataRoutes
} from './routes';

const PORT = process.env.PORT || 3000;
const dataDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

app.use('/api', orderRoutes);
app.use('/api', cutoffRoutes);
app.use('/api', deliveryRoutes);
app.use('/api', substitutionRoutes);
app.use('/api', refundRoutes);
app.use('/api', sortingRoutes);
app.use('/api', masterDataRoutes);

app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: '生鲜预售截单分拣API',
      version: '1.0.0',
      endpoints: {
        orders: '/api/orders',
        cutoffs: '/api/cutoffs',
        deliveries: '/api/deliveries',
        substitutions: '/api/substitutions',
        refunds: '/api/refunds',
        sorting: '/api/sorting-lists',
        masterData: {
          users: '/api/users',
          products: '/api/products',
          communities: '/api/communities',
          routes: '/api/routes'
        }
      }
    }
  });
});

app.use(errorHandler);

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    message: `未找到 ${req.method} ${req.originalUrl}`
  });
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     生鲜预售截单分拣API服务已启动                           ║
╠════════════════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}                          ║
║  健康检查: http://localhost:${PORT}/health                   ║
║  API文档:  http://localhost:${PORT}/api                      ║
║  数据库:  SQLite (./data/fresh_preorder.db)                ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

startServer();
