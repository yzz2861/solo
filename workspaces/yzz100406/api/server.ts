import 'dotenv/config';
import app from './app.js';
import { AppDataSource } from './data-source.js';
import { AuthService } from './services/AuthService.js';

const PORT = process.env.SERVER_PORT || 3001;

async function startServer() {
  try {
    await AppDataSource.initialize();
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
