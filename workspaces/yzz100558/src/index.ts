import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { requestLogger, errorHandler, notFoundHandler } from './middleware';
import routes from './routes';
import { initializeDatabase } from './database';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function start() {
  await initializeDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.get('/', (_req, res) => {
    res.json({
      name: '体检报告代领授权API',
      version: '1.0.0',
      docs: '请参考 /api/* 接口使用',
      endpoints: [
        'GET /health',
        'POST /api/authorizations - 创建代领授权',
        'POST /api/authorizations/revoke - 撤销授权',
        'GET /api/authorizations - 授权列表',
        'POST /api/pickups - 前台领取登记',
        'GET /api/pickups/today - 今日领取记录',
        'POST /api/mails - 邮寄登记',
        'GET /api/mails - 邮寄进度查询',
        'GET /api/group-check/company/:companyId - 团检批量核验',
        'GET /api/exceptions - 异常拦截记录（主管）',
        'GET /api/export/summary - 综合导出（主管）'
      ]
    });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (require.main === module) {
    app.listen(config.port, () => {
      logger.info(`体检报告代领授权API服务已启动: http://localhost:${config.port}`);
    });
  }

  return app;
}

if (require.main === module) {
  start().catch(e => {
    logger.error('服务启动失败', e);
    process.exit(1);
  });
}

export default start;
