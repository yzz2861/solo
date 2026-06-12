require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const claimRoutes = require('./routes/claims');
const documentRoutes = require('./routes/documents');
const summaryRoutes = require('./routes/summaries');
const exportRoutes = require('./routes/exports');
const supervisorRoutes = require('./routes/supervisor');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/supervisor', supervisorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`🚀 理赔材料摘要核对系统后端已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📁 上传目录: ${path.join(__dirname, '../uploads')}`);
  console.log(`💾 数据库: ${path.join(__dirname, '../data/claim.db')}`);
  console.log(`\n📌 默认账号:`);
  console.log(`   理赔员: adjuster1 / adjuster123`);
  console.log(`   主管:   supervisor1 / supervisor123`);
});
