const express = require('express');
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  validateContentType
} = require('./middleware/errorHandler');
const {
  processRectification,
  getAuditRecord,
  getBatchRecords,
  healthCheck,
  resetRecords
} = require('./controllers/rectificationController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(validateContentType);

app.get('/health', healthCheck);

app.post('/api/v1/rectification/process', processRectification);

app.get('/api/v1/rectification/audit/:auditId', getAuditRecord);

app.get('/api/v1/rectification/batch/:batchNumber', getBatchRecords);

app.post('/api/v1/rectification/reset', resetRecords);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`房屋交付整改闭环API服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`处理接口: POST http://localhost:${PORT}/api/v1/rectification/process`);
  });
}

module.exports = app;
