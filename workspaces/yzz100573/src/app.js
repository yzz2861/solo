const express = require('express');
const cors = require('cors');
const path = require('path');

const itemsRouter = require('./routes/items');
const claimsRouter = require('./routes/claims');
const exportRouter = require('./routes/export');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '校园失物认领服务 API 运行正常' });
});

app.use('/api/items', itemsRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/export', exportRouter);

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;
