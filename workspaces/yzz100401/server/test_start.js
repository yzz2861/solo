console.log('开始加载模块...');

try {
  require('dotenv').config();
  console.log('dotenv 加载完成');
  
  const express = require('express');
  console.log('express 加载完成');
  
  const path = require('path');
  console.log('path 加载完成');
  
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  console.log(`准备在端口 ${PORT} 启动服务...`);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  const server = app.listen(PORT, () => {
    console.log(`✅ 服务已启动在 http://localhost:${PORT}`);
    
    setTimeout(() => {
      console.log('服务运行中，将保持运行状态...');
    }, 1000);
  });
  
  server.on('error', (err) => {
    console.error('❌ 服务启动失败:', err.message);
    process.exit(1);
  });
  
} catch (err) {
  console.error('❌ 加载模块失败:', err.message);
  console.error(err.stack);
  process.exit(1);
}
