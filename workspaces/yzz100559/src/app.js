const express = require('express');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const { initDatabase } = require('./db/database');

const cardRoutes = require('./routes/cardRoutes');
const extensionRoutes = require('./routes/extensionRoutes');
const plateRoutes = require('./routes/plateRoutes');
const feeRoutes = require('./routes/feeRoutes');
const adjustmentRoutes = require('./routes/adjustmentRoutes');
const gateRoutes = require('./routes/gateRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: '停车月卡延期服务运行中', timestamp: new Date().toISOString() });
});

app.use('/api/cards', cardRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/plates', plateRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/manual', adjustmentRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');

    app.listen(config.port, () => {
      console.log(`停车月卡延期服务已启动，端口: ${config.port}`);
      console.log(`健康检查: http://localhost:${config.port}/health`);
      console.log('');
      console.log('主要API接口:');
      console.log('  月卡管理:    POST/GET /api/cards/*');
      console.log('  延期服务:    POST/GET /api/extensions/*');
      console.log('  车牌变更:    POST/GET /api/plates/*');
      console.log('  费用流水:    GET /api/fees/*');
      console.log('  人工调整:    POST/GET /api/manual/*');
      console.log('  闸机读卡:    GET /api/gate/*');
      console.log('  运营导出:    GET /api/export/*');
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
