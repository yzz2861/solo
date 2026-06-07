const express = require('express');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes/api');
const logger = require('./utils/logger');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  logger.info('请求接入', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.use('/api/v1', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

app.use((err, req, res, next) => {
  logger.error('未捕获的异常', { error: err.message, stack: err.stack });
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`机场廊桥靠接安全API服务已启动`, { port: PORT });
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
