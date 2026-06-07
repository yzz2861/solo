const express = require('express');
const grayRateLimitRoutes = require('./routes/grayRateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Request-Id', 'REQ-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
  next();
});

app.use('/api/v1/gray-rate-limit', grayRateLimitRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'API网关灰度限流API',
    version: '1.0.0',
    description: '规则判断、异常解释和处理留痕一体化接口',
    endpoints: {
      'POST /api/v1/gray-rate-limit/check': '灰度限流检查（主接口）',
      'POST /api/v1/gray-rate-limit/lock': '锁定业务编号',
      'POST /api/v1/gray-rate-limit/unlock': '解锁业务编号',
      'POST /api/v1/gray-rate-limit/review': '人工复核决定',
      'GET /api/v1/gray-rate-limit/trace/:traceId': '按追踪编号查询留痕',
      'GET /api/v1/gray-rate-limit/audit': '查询审计日志',
      'GET /api/v1/gray-rate-limit/rules': '查询规则列表',
      'GET /api/v1/gray-rate-limit/health': '健康检查'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    resultType: 'failed',
    explanation: {
      reason: 'internal_error',
      message: '服务器内部错误',
      detail: err.message
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API网关灰度限流服务已启动`);
    console.log(`端口: ${PORT}`);
    console.log(`访问: http://localhost:${PORT}`);
  });
}

module.exports = app;
