const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

initDatabase().catch(err => console.error('Database init error:', err));

app.use('/api', routes);

app.get('/api', (req, res) => {
  res.json({
    name: '客户聊天承诺提取系统 API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      customers: 'GET/POST /api/customers',
      opportunities: 'GET/POST /api/opportunities',
      'opportunities detail': 'GET /api/opportunities/:id',
      'chats import': 'POST /api/chats/import',
      'chats detail': 'GET /api/chats/:id',
      commitments: 'GET /api/commitments',
      'commitment detail': 'GET /api/commitments/:id',
      'update commitment': 'PUT /api/commitments/:id',
      'approve commitment': 'POST /api/commitments/:id/approve',
      'bulk approve': 'POST /api/commitments/bulk-approve',
      'commitment history': 'GET /api/commitments/:id/history',
      export: 'GET /api/export/commitments',
      'summary by customer': 'GET /api/summary/by-customer',
      'summary by opportunity': 'GET /api/summary/by-opportunity',
      'delivery handover': 'GET /api/delivery/handover',
      types: 'GET /api/commitment-types',
    },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   客户聊天承诺提取系统 - 后端服务启动成功                    ║
  ║                                                            ║
  ║   API 服务: http://localhost:${PORT}                           ║
  ║   API 文档: http://localhost:${PORT}/api                       ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});
