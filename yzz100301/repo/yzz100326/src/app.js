const express = require('express');
const path = require('path');

const declarationRoutes = require('./routes/declaration');
const supplementaryRoutes = require('./routes/supplementary');
const inspectionRoutes = require('./routes/inspection');
const packageRoutes = require('./routes/packages');
const reviewRoutes = require('./routes/review');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'customs-clearance-api',
    time: new Date().toISOString()
  });
});

app.use('/api/declaration', declarationRoutes);
app.use('/api/supplementary', supplementaryRoutes);
app.use('/api/inspection', inspectionRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   跨境包裹清关管理 API 服务已启动            ║
║                                              ║
║   服务地址: http://localhost:${PORT}           ║
║   健康检查: http://localhost:${PORT}/api/health ║
║                                              ║
║   数据库: data/customs.db (SQLite)           ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
