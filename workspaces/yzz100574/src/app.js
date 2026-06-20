const express = require('express');
const { initialize } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '志愿时长申诉服务 API',
    version: '1.0.0',
    description: '公益组织志愿时长申诉管理系统',
    endpoints: {
      users: '/api/users',
      activities: '/api/activities',
      attendance: '/api/attendance',
      appeals: '/api/appeals',
      review: '/api/review',
      publications: '/api/publications',
      export: '/api/export'
    }
  });
});

app.use('/api/users', require('./routes/users'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/appeals', require('./routes/appeals'));
app.use('/api/review', require('./routes/review'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/export', require('./routes/export'));

app.use((err, req, res, next) => {
  console.error('错误:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

async function startServer() {
  try {
    await initialize();
    app.listen(PORT, () => {
      console.log(`志愿时长申诉服务 API 已启动，端口: ${PORT}`);
      console.log(`访问地址: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
