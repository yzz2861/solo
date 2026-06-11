const express = require('express');
const path = require('path');

const instrumentsRouter = require('./routes/instruments');
const batchesRouter = require('./routes/batches');
const treatmentsRouter = require('./routes/treatments');
const traceRouter = require('./routes/trace');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '牙科器械灭菌追踪API运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api/instruments', instrumentsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/treatments', treatmentsRouter);
app.use('/api/trace', traceRouter);
app.use('/api/reports', reportsRouter);

app.get('/api', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      instruments: '/api/instruments',
      batches: '/api/batches',
      treatments: '/api/treatments',
      trace: '/api/trace',
      reports: '/api/reports',
      health: '/api/health',
    },
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`牙科器械灭菌追踪API服务器已启动`);
  console.log(`地址: http://localhost:${PORT}`);
  console.log(`API根路径: http://localhost:${PORT}/api`);
});

module.exports = app;
