const express = require('express');
const fuelAbnormalRoutes = require('./routes/fuelAbnormalRoutes');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      service: 'sanitation-vehicle-fuel-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/fuel-abnormal', fuelAbnormalRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: '接口不存在',
      path: req.path
    });
  });

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: err.message
    });
  });

  return app;
}

function startServer(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const app = createApp();
    const server = app.listen(port, host, () => {
      const actualPort = server.address().port;
      console.log(`环卫车辆油耗异常API服务已启动`);
      console.log(`服务地址: http://${host}:${actualPort}`);
      console.log(`健康检查: http://${host}:${actualPort}/health`);
      console.log(`API前缀: /api/fuel-abnormal`);
      resolve({ app, server, port: actualPort, host });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`端口 ${port} 已被占用`);
      } else if (err.code === 'EACCES' || err.code === 'EPERM') {
        console.error(`端口 ${port} 权限不足，尝试使用其他端口`);
      } else {
        console.error(`启动服务失败:`, err.message);
      }
      reject(err);
    });
  });
}

async function startServerWithFallback(preferredPort, host = '127.0.0.1') {
  const ports = [preferredPort, 3000, 3001, 3002, 8080, 8081, 5000];
  const tried = new Set();

  for (const port of ports) {
    if (tried.has(port)) continue;
    tried.add(port);
    try {
      const result = await startServer(port, host);
      return result;
    } catch (err) {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES' || err.code === 'EPERM') {
        console.log(`端口 ${port} 不可用，尝试下一个...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`所有尝试的端口都不可用: ${[...tried].join(', ')}`);
}

if (require.main === module) {
  const preferredPort = parseInt(process.env.PORT, 10) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  startServerWithFallback(preferredPort, host).catch((err) => {
    console.error('服务启动失败:', err.message);
    process.exit(1);
  });
}

module.exports = { createApp, startServer, startServerWithFallback };
