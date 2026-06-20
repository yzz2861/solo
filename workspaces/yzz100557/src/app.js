const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { initDatabase, DB_PATH } = require('./db/init');

const authRoutes = require('./routes/auth');
const coreRoutes = require('./routes/core');
const viewRoutes = require('./routes/views');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    name: '餐饮来料验收退货API',
    version: '1.0.0',
    description: '中央厨房采购验收、扣量、退货、补送一体化管理系统',
    docs: {
      authentication: 'POST /api/auth/login',
      apis: [
        { group: '认证', endpoints: ['POST /api/auth/login', 'POST /api/auth/logout'] },
        { group: '核心业务', endpoints: [
          'GET  /api/core/purchase-orders',
          'GET  /api/core/purchase-orders/:id',
          'POST /api/core/purchase-orders',
          'GET  /api/core/deliveries',
          'GET  /api/core/deliveries/:id',
          'POST /api/core/deliveries',
          'POST /api/core/deliveries/:id/finalize',
          'GET  /api/core/deductions',
          'GET  /api/core/deductions/:id',
          'GET  /api/core/returns',
          'GET  /api/core/returns/:id',
          'POST /api/core/returns',
          'POST /api/core/returns/:id/sign',
          'POST /api/core/returns/:id/complete',
          'GET  /api/core/replacements',
          'GET  /api/core/replacements/:id',
          'POST /api/core/replacements',
          'POST /api/core/replacements/:id/receive',
          'GET  /api/core/suppliers',
          'POST /api/core/suppliers'
        ]},
        { group: '角色视图', endpoints: [
          'GET /api/views/buyer/dashboard          (采购看板: 待处理扣量/补送/退货)',
          'GET /api/views/buyer/deductions-trace    (采购追补送: 扣量追溯，不用翻照片)',
          'GET /api/views/finance/deductions        (财务扣款: 支持Excel导出 /?format=excel)',
          'POST /api/views/finance/deductions/:id/settle',
          'GET /api/views/chef/dashboard            (厨师长: 当天可用库存 + 质量问题)',
          'GET /api/views/chef/material-history',
          'GET /api/views/inspector/daily-summary   (验收员: 下班前按供应商汇总)',
          'GET /api/views/inspector/daily-summary/export (下载Excel)',
          'GET /api/views/supplier/dashboard        (供应商: 我的扣量/补送/待签收退货)',
          'GET /api/views/supplier/returns/:id      (供应商签收: 看到对应扣量+照片)'
        ]}
      ]
    }
  });
});

app.get('/health', async (req, res) => {
  let dbOk = false;
  try {
    const { getDB } = require('./db/singleton');
    const db = await getDB();
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch (e) { /* ignore */ }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
    db_path: DB_PATH
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/core', coreRoutes);
app.use('/api/views', viewRoutes);

app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path, method: req.method });
});

function ensureData() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

ensureData();

(async function bootstrap() {
  try {
    const { getDB } = require('./db/singleton');
    const db = await getDB();

    const userRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
    const userCount = Number(userRow?.cnt || 0);
    if (userCount === 0) {
      console.log('数据库为空，正在初始化种子数据...');
      await require('./seed/seed').seed();
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║       餐饮来料验收退货API系统 v1.0.0                         ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  服务地址:   http://localhost:${PORT}                          ║`);
      console.log(`║  健康检查:   http://localhost:${PORT}/health                   ║`);
      console.log(`║  API首页:    http://localhost:${PORT}/                         ║`);
      console.log(`║  数据库:     ${DB_PATH.padEnd(44)}║`);
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log('║  测试账号:                                                     ║');
      console.log('║  admin / admin123        (系统管理员)                         ║');
      console.log('║  inspector1 / inspect123 (验收员 王验收)                      ║');
      console.log('║  buyer1 / buyer123       (采购员 赵采购)                      ║');
      console.log('║  finance1 / finance123   (财务   周会计)                      ║');
      console.log('║  chef1 / chef123         (厨师长 钱厨师长)                    ║');
      console.log('║  sup_veg001 / supplier123 (供应商 绿源蔬菜)                   ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (e) {
    console.error('启动失败:', e);
    process.exit(1);
  }
})();

module.exports = app;
