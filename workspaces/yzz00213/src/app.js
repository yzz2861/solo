const express = require('express');
const app = express();
const fuelAbnormalRoutes = require('./routes/fuelAbnormalRoutes');

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'sanitation-vehicle-fuel-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/fuel-abnormal', fuelAbnormalRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`环卫车辆油耗异常API服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`API前缀: /api/fuel-abnormal`);
});

module.exports = app;
