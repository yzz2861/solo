import 'dotenv/config';
import app from './app.js';
import { initializeDataSource } from './data-source.js';
import { AuthService } from './services/AuthService.js';

const PORT = parseInt(process.env.SERVER_PORT || '3002');

async function startServer() {
  try {
    await initializeDataSource();
    console.log('数据库连接成功');

    const authService = new AuthService();
    await authService.initDefaultUsers();

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

startServer();

startServer();
