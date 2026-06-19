import { startServer } from './app';
import { createUser } from './services/userService';
import { getDb } from './database';

async function bootstrap() {
  try {
    await startServer();

    const db = await getDb();
    const count = await db.get('SELECT COUNT(*) as count FROM users');

    if (count?.count === 0) {
      console.log('📝 初始化测试账号...');

      await Promise.all([
        createUser('张居民', '13800138001', '123456', 'resident'),
        createUser('李居民', '13800138002', '123456', 'resident'),
        createUser('王社工', '13900139001', '123456', 'social_worker'),
        createUser('赵主任', '13900139002', '123456', 'director'),
      ]);

      console.log('✅ 测试账号创建完成:');
      console.log('   居民: 13800138001 / 123456');
      console.log('   居民: 13800138002 / 123456');
      console.log('   社工: 13900139001 / 123456');
      console.log('   主任: 13900139002 / 123456');
    }
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
