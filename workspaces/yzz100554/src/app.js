require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmers');
const seasonRoutes = require('./routes/seasons');
const productRoutes = require('./routes/products');
const salesOrderRoutes = require('./routes/salesOrders');
const repaymentRoutes = require('./routes/repayments');
const returnRoutes = require('./routes/returns');
const queryRoutes = require('./routes/queries');
const reportRoutes = require('./routes/reports');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '农资赊销还款服务API运行正常',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: '接口不存在',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     农资赊销还款服务 API 服务已启动                        ║
╠════════════════════════════════════════════════════════════╣
║  服务地址: http://localhost:${PORT}                         ║
║  健康检查: http://localhost:${PORT}/api/health              ║
╠════════════════════════════════════════════════════════════╣
║  默认账号:                                                ║
║    老板: boss / boss123456                                ║
║    店员: clerk / clerk123456                              ║
╠════════════════════════════════════════════════════════════╣
║  首次运行请先执行: npm run init-db                         ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
