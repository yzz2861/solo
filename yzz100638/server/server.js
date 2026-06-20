const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const casesRouter = require('./routes/cases');
const leaderRouter = require('./routes/leader');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/leader', leaderRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '车险查勘描述补全系统后端服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 车险查勘描述补全系统后端服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📦 API 文档:`);
  console.log(`   - POST /api/cases/complete  - 描述补全`);
  console.log(`   - POST /api/cases           - 创建案件`);
  console.log(`   - GET  /api/cases           - 案件列表`);
  console.log(`   - GET  /api/cases/:id       - 案件详情`);
  console.log(`   - PUT  /api/cases/:id/confirm - 确认案件`);
  console.log(`   - POST /api/cases/:id/export  - 导出案件`);
  console.log(`   - GET  /api/leader/stats       - 统计数据`);
  console.log(`   - GET  /api/leader/low-confidence-cases - 低置信案件`);
  console.log(`   - GET  /api/leader/leaderboard - 查勘员排行`);
  console.log(`   - GET  /api/leader/training-cases - 培训案例`);
});

module.exports = app;
