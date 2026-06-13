const { initDb, closeDb } = require('../db/database');

(async () => {
  console.log('正在初始化数据库...');
  try {
    await initDb();
    console.log('数据库初始化成功！');
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    process.exit(1);
  } finally {
    closeDb();
  }
})();
