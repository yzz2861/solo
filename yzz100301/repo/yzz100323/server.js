const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

require('./db/database');

const materialsRouter = require('./routes/materials');
const importRouter = require('./routes/import');
const exportRouter = require('./routes/export');
const bannedWordsRouter = require('./routes/bannedWords');

app.use('/api/materials', materialsRouter);
app.use('/api/import', importRouter);
app.use('/api/export', exportRouter);
app.use('/api/banned-words', bannedWordsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 广告素材审核工具已启动`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`📁 数据文件: ${path.join(__dirname, 'data', 'review.db')}`);
  console.log(`\n按 Ctrl+C 停止服务\n`);
});
