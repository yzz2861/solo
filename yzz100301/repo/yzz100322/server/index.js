const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const { initDB } = require('./db');

const importRoutes = require('./routes/import');
const recordRoutes = require('./routes/records');
const auditRoutes = require('./routes/audit');
const exportRoutes = require('./routes/export');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/import', importRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '园区访客车辆放行审计系统运行正常' });
});

app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'API服务运行中，请访问前端页面' });
  }
});

async function startServer() {
  try {
    await initDB();
    console.log('✅ 数据库初始化完成');
    
    app.listen(PORT, () => {
      console.log(`🚀 园区访客车辆放行审计系统已启动`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`📊 数据库: ${path.join(__dirname, '..', 'data', 'audit.db')}`);
    });
  } catch (err) {
    console.error('❌ 启动失败:', err);
    process.exit(1);
  }
}

startServer();
