const express = require('express');
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Milk SCC API');
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'milk-scc-api',
    version: '1.0.0'
  });
});

app.use('/api/v1', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: '接口不存在',
    code: 'NOT_FOUND',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('[全局错误]', err);
  res.status(500).json({
    error: err.message || '服务器内部错误',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = app;
