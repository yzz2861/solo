import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import app from './app';
import { AppDataSource } from './config/database';
import { seedInitialData } from './bootstrap/seed';
import { setupScheduler } from './jobs/expireScheduler';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('[DB] Database connected successfully');

    await seedInitialData();
    console.log('[Seed] Initial data ready');

    setupScheduler();

    app.listen(PORT, () => {
      console.log(`\n====================================================`);
      console.log(`  企业访客WiFi开通服务 API`);
      console.log(`  服务地址: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/health`);
      console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================\n`);
      console.log(`  默认登录账号 (简化认证):`);
      console.log(`    - admin     (系统管理员)  `);
      console.log(`    - reception (前台)        `);
      console.log(`    - rd_admin  (研发部审批员)`);
      console.log(`    - sales_admin (市场部审批员)`);
      console.log(`    - hr_admin  (人事部审批员)`);
      console.log(`    - night     (夜班保安)    `);
      console.log(`  登录方式: POST /api/auth/login { "username": "admin" }\n`);
    });
  } catch (err) {
    console.error('[Bootstrap] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
