const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const { initDb, DB_PATH } = require('./db/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.json({
    name: '法院旁听预约核验 API',
    version: '1.0.0',
    description: '登记案件、场次、申请人、证件、席位类型和审核结果的管理系统',
    docs: {
      base_url: '/api/v1',
      endpoints: {
        health: 'GET /api/v1/health',
        cases: {
          list: 'GET /api/v1/cases?keyword=&case_type=',
          get: 'GET /api/v1/cases/:id',
          create: 'POST /api/v1/cases',
          update: 'PUT /api/v1/cases/:id',
          delete: 'DELETE /api/v1/cases/:id'
        },
        hearings: {
          list: 'GET /api/v1/hearings?date_from=&date_to=&courtroom_id=&status=&case_id=',
          get: 'GET /api/v1/hearings/:id',
          create: 'POST /api/v1/hearings',
          update: 'PUT /api/v1/hearings/:id',
          close: 'POST /api/v1/hearings/:hearing_id/close',
          reschedule: 'POST /api/v1/hearings/:hearing_id/reschedule'
        },
        reservations: {
          list: 'GET /api/v1/reservations?hearing_id=&review_status=&verification_status=&keyword=&page=&page_size=',
          create: 'POST /api/v1/reservations',
          review: 'POST /api/v1/reservations/:id/review',
          batch_review: 'POST /api/v1/reservations/batch-review'
        },
        security: {
          list: 'GET /api/v1/security/list?hearing_id=&courtroom_id=&date=&include_sensitive=',
          short_list: 'GET /api/v1/security/short-list/:courtroom_id/:date?format=text',
          verify: 'POST /api/v1/security/verify',
          stats: 'GET /api/v1/security/stats?date='
        },
        records: {
          query: 'GET /api/v1/records/query?date_from=&date_to=&review_status=&verification_status=',
          export: 'GET /api/v1/records/export?type=all|arrived|no_show|rejected&format=csv|json',
          stats: 'GET /api/v1/records/stats?date_from=&date_to=&group_by=date|courtroom|seat_type|apply_source'
        },
        meta: {
          courtrooms: 'GET /api/v1/courtrooms',
          seat_types: 'GET /api/v1/seat-types',
          confirm_notice: 'POST /api/v1/hearings/confirm-notice'
        }
      }
    }
  });
});

async function startServer() {
  console.log('正在初始化数据库...');
  try {
    await initDb();
    console.log('数据库初始化完成:', DB_PATH);
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    process.exit(1);
  }

  const exportsDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('  法院旁听预约核验 API 服务已启动');
    console.log('='.repeat(60));
    console.log(`  本地访问:   http://localhost:${PORT}`);
    console.log(`  健康检查:   http://localhost:${PORT}/api/v1/health`);
    console.log(`  API 文档:   http://localhost:${PORT}/`);
    console.log(`  数据库:     ${DB_PATH}`);
    console.log('='.repeat(60));
    console.log('  可用脚本:');
    console.log('    npm run init-db   - 仅初始化数据库');
    console.log('    npm run seed      - 填充演示数据');
    console.log('    npm run test      - 运行接口测试');
    console.log('='.repeat(60) + '\n');
  });
}

startServer();

module.exports = app;
