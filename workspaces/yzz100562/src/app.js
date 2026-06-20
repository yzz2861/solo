const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const { authMiddleware, roleMiddleware } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const checkoutRoutes = require('./routes/checkout');
const recoveryRoutes = require('./routes/recovery');
const returnRoutes = require('./routes/return');
const scrapRoutes = require('./routes/scrap');
const technicianRoutes = require('./routes/technician');
const warehouseRoutes = require('./routes/warehouse');
const stationRoutes = require('./routes/station');
const workorderRoutes = require('./routes/workorders');
const partsRoutes = require('./routes/parts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);

app.use('/api/work-orders', authMiddleware, workorderRoutes);
app.use('/api/parts', authMiddleware, partsRoutes);

app.use('/api/checkouts', authMiddleware, checkoutRoutes);
app.use('/api/recovery', authMiddleware, recoveryRoutes);
app.use('/api/returns', authMiddleware, returnRoutes);
app.use('/api/scraps', authMiddleware, roleMiddleware('station_manager', 'warehouse_manager'), scrapRoutes);

app.use('/api/technician', authMiddleware, roleMiddleware('technician'), technicianRoutes);
app.use('/api/warehouse', authMiddleware, roleMiddleware('warehouse_manager'), warehouseRoutes);
app.use('/api/station', authMiddleware, roleMiddleware('station_manager'), stationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `文件上传错误: ${err.message}` });
  }
  res.status(500).json({ error: '服务器内部错误' });
});

function start() {
  initDb();
  app.listen(PORT, () => {
    console.log(`维修备件领用归还服务已启动: http://localhost:${PORT}`);
    console.log(`API 文档: http://localhost:${PORT}/api/health`);
  });
}

start();

module.exports = app;
