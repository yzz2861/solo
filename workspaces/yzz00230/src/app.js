const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3080;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vpn-remote-login-api'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: '接口不存在'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`VPN异地登录API服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`API路径: http://localhost:${PORT}/api/vpn-remote-login/process`);
  });
}

module.exports = app;
