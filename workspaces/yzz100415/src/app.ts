import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import { PORT } from './config/app';
import { seedDatabase } from './seeders/init';
import { startOverdueTrackingCron } from './services/cronService';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.json({
    code: 200,
    message: '公章外借审批服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的API不存在',
  });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
  });
});

async function startServer() {
  try {
    console.log('[Boot] 正在连接数据库...');
    await AppDataSource.initialize();
    console.log('[Boot] 数据库连接成功');

    console.log('[Boot] 正在初始化数据...');
    await seedDatabase();

    console.log('[Boot] 正在启动定时任务...');
    startOverdueTrackingCron();

    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  公章外借审批服务 API 已启动');
      console.log(`  服务地址: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/health`);
      console.log(`  API 前缀: /api`);
      console.log('========================================');
      console.log('');
      console.log('默认测试账号:');
      console.log('  行政管理员  admin    / admin123  (角色: ADMIN)');
      console.log('  销售员工    zhangsan / 123456    (角色: EMPLOYEE)');
      console.log('  审批人      wangwu   / 123456    (角色: APPROVER)');
      console.log('  法务        zhaoliu  / 123456    (角色: LEGAL)');
      console.log('  门卫        guard1   / 123456    (角色: GUARD)');
      console.log('');
    });
  } catch (error) {
    console.error('[Boot] 服务启动失败:', error);
    process.exit(1);
  }
}

startServer();
