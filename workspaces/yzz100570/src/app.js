require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { init } = require('./database/init');

const authRoutes = require('./routes/auth');
const purchaseRequestRoutes = require('./routes/purchaseRequests');
const quotationRoutes = require('./routes/quotations');
const approvalRoutes = require('./routes/approvals');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '小额采购比价审批API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      purchase_requests: '/api/purchase-requests',
      quotations: '/api/purchase-requests/:id/quotations',
      approvals: '/api/approvals',
      orders: '/api/orders',
      reports: '/api/reports'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/purchase-requests/:requestId/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

const startServer = async () => {
  try {
    await init();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('');
      console.log('测试账号:');
      console.log('  员工: employee1 / 123456');
      console.log('  行政: admin1 / 123456');
      console.log('  领导: leader1 / 123456');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
