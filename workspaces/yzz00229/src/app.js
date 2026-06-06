const express = require('express');
const { validateEvidenceRequest } = require('./middleware/validator');
const {
  processEvidence,
  getBatch,
  getItem,
  queryAuditLogs,
  getStats
} = require('./controllers/evidenceController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fire-passage-evidence-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/stats', getStats);

app.post('/api/v1/evidence/process', validateEvidenceRequest, processEvidence);

app.get('/api/v1/evidence/batch/:batchNo', getBatch);

app.get('/api/v1/evidence/item/:itemId', getItem);

app.get('/api/v1/audit/logs', queryAuditLogs);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: '请求的资源不存在',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`消防通道占用取证API服务已启动`);
    console.log(`端口: ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`API文档: POST /api/v1/evidence/process`);
    console.log(`统计信息: GET  /api/v1/stats`);
  });
}

module.exports = app;
