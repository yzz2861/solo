require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const baseRoutes = require('./routes/base');
const workOrderRoutes = require('./routes/workOrders');
const materialRoutes = require('./routes/materials');
const satisfactionRoutes = require('./routes/satisfaction');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    name: '高校宿舍维修领料管理系统 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      base: '/api/base',
      work_orders: '/api/work-orders',
      materials: '/api/materials',
      satisfaction: '/api',
      reports: '/api/reports'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/base', baseRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api', satisfactionRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 高校宿舍维修领料管理系统 API 已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📖 API 根路径: http://localhost:${PORT}/api`);
  console.log(`\n👤 测试账号:`);
  console.log(`   学生:     student001 / 123456`);
  console.log(`   维修师傅: worker001  / 123456`);
  console.log(`   库管:     store001   / 123456`);
  console.log(`   后勤主任: admin001   / 123456\n`);
});

module.exports = app;
