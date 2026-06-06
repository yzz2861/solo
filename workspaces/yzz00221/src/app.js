const express = require('express');
const assessmentRoutes = require('./routes/assessment');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/api/pressure-ulcer', assessmentRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pressure-ulcer-assessment-api',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    errorCode: 'NOT_FOUND',
    data: null
  });
});

app.use((err, req, res, next) => {
  console.error('未捕获异常:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    errorCode: 'INTERNAL_ERROR',
    errorMessage: err.message,
    data: null
  });
});

module.exports = app;
