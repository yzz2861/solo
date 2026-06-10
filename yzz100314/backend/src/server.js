const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
db.loadDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SLA审计系统运行正常' });
});

app.use('/api/import', require('./routes/import'));

const { router: ticketsRouter } = require('./routes/tickets');
app.use('/api/tickets', ticketsRouter);

app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reports', require('./routes/reports'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  客服工单SLA审计系统 - 后端服务`);
  console.log(`  运行地址: http://localhost:${PORT}`);
  console.log(`  API地址: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

module.exports = app;
