const express = require('express');
const { initDB } = require('./db');
const config = require('./config');

const samplesRouter = require('./routes/samples');
const borrowsRouter = require('./routes/borrows');
const projectsRouter = require('./routes/projects');
const queriesRouter = require('./routes/queries');
const exportRouter = require('./routes/export');

initDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '影棚样品保险借用API',
    version: '1.0.0',
    description: '珠宝、腕表、限量包样品借用管理系统',
    endpoints: {
      samples: '/api/samples',
      borrows: '/api/borrows',
      projects: '/api/projects',
      queries: '/api/queries',
      export: '/api/export'
    }
  });
});

app.use('/api/samples', samplesRouter);
app.use('/api/borrows', borrowsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/queries', queriesRouter);
app.use('/api/export', exportRouter);

app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
    data: null
  });
});

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`影棚样品保险借用API已启动: http://localhost:${config.port}`);
    console.log(`数据库位置: ${config.dbPath}`);
  });
}

module.exports = app;
