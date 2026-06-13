import app from './app';
import { config } from './config';
import { startCronJobs } from './cron/visitorCron';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   共享工位访客通行 API 服务已启动                          ║
║   服务地址: http://localhost:${PORT}                        ║
║   环境: ${config.nodeEnv}                                   ║
╚══════════════════════════════════════════════════════════╝
  `);

  if (config.nodeEnv !== 'test') {
    startCronJobs();
  }
});

process.on('unhandledRejection', (err: Error) => {
  console.error('未处理的 Promise 拒绝:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...');
  server.close(() => {
    console.log('服务已关闭');
    process.exit(0);
  });
});

export default server;
