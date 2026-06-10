const express = require('express');
const { initDb } = require('./src/db');

const entryRoutes = require('./src/routes/entry');
const exitRoutes = require('./src/routes/exit');
const supplementaryRoutes = require('./src/routes/supplementary');
const tripRoutes = require('./src/routes/trips');
const anomalyRoutes = require('./src/routes/anomalies');
const reviewRoutes = require('./src/routes/review');
const reportRoutes = require('./src/routes/report');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Mining Vehicle API');
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: '矿区车辆拉运管理 API',
    version: '1.0.0',
    endpoints: {
      entry: '/api/entry',
      exit: '/api/exit',
      supplementary: '/api/supplementary',
      trips: '/api/trips',
      anomalies: '/api/anomalies',
      review: '/api/review',
      report: '/api/report'
    }
  });
});

app.use('/api/entry', entryRoutes);
app.use('/api/exit', exitRoutes);
app.use('/api/supplementary', supplementaryRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/report', reportRoutes);

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

initDb();

app.listen(PORT, () => {
  console.log(`\n🚀 矿区车辆拉运管理 API 服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`\n📋 接口列表:`);
  console.log(`   POST   /api/entry              - 写入进场记录`);
  console.log(`   POST   /api/entry/batch        - 批量写入进场记录`);
  console.log(`   GET    /api/entry              - 查询进场记录`);
  console.log(`   POST   /api/exit               - 写出场磅单`);
  console.log(`   POST   /api/exit/batch         - 批量写出场磅单`);
  console.log(`   GET    /api/exit               - 查询出场磅单`);
  console.log(`   POST   /api/supplementary      - 补录地磅数据`);
  console.log(`   POST   /api/supplementary/batch - 批量补录地磅`);
  console.log(`   GET    /api/trips              - 查询车次列表`);
  console.log(`   GET    /api/trips/:id          - 查询车次详情`);
  console.log(`   GET    /api/trips/by-plate/:plate - 按车牌查车次`);
  console.log(`   GET    /api/trips/timeline/:plate - 车辆时间线`);
  console.log(`   GET    /api/anomalies          - 查询异常车次`);
  console.log(`   GET    /api/anomalies/summary  - 异常汇总统计`);
  console.log(`   GET    /api/anomalies/weight-diff - 重量差异异常`);
  console.log(`   GET    /api/anomalies/missing-exit - 缺出场磅单`);
  console.log(`   GET    /api/anomalies/driver-mismatch - 司机信息不一致`);
  console.log(`   POST   /api/review/:tripId     - 提交复核意见`);
  console.log(`   POST   /api/review/batch/close - 批量关闭异常`);
  console.log(`   GET    /api/report/daily       - 日终核对报告(JSON/CSV)`);
  console.log(`   GET    /api/report/summary     - 时间段汇总`);
  console.log();
});

module.exports = app;
