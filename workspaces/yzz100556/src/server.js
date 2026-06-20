const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 小区门禁卡补办服务API已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`✅ 健康检查: http://localhost:${PORT}/health`);
  console.log(`\n📚 API 基础路径: http://localhost:${PORT}/api`);
  console.log(`\n首次使用请先初始化数据: npm run init-db\n`);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
