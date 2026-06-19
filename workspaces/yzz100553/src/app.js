const express = require('express');
const config = require('./config');
const { startScheduledTasks } = require('./scheduler');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const reservationRoutes = require('./routes/reservations');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const exportRoutes = require('./routes/export');

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\n  图书馆研修间预约API服务已启动`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/health`);
  console.log(`\n  测试账号:`);
  console.log(`    馆员: librarian / 123456`);
  console.log(`    学生: student1 / 123456`);
  console.log(`\n  提示: 首次运行请先执行 npm run init-db 初始化数据库\n`);

  startScheduledTasks();
});

module.exports = app;
