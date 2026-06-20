const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase, seedTestData } = require('./scripts/init-db');
const retakeRoutes = require('./routes/retake-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    service: '培训补考报名服务 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    docs: {
      'POST /api/v1/registrations': '提交补考报名',
      'GET /api/v1/registrations/:id': '查询报名详情',
      'GET /api/v1/hr/review': 'HR 审核名单',
      'PUT /api/v1/registrations/:id/review': 'HR 审核报名',
      'PUT /api/v1/registrations/:id/score': '回写补考成绩',
      'GET /api/v1/department/risk/:id': '部门经理风险查询',
      'GET /api/v1/assistant/unnotified/:assistant_emp_id': '部门助理未通过名单',
      'PUT /api/v1/assistant/mark-notified': '标记已通知',
      'GET /api/v1/export/monthly?year=&month=': '月度数据导出',
      'GET /api/v1/batches/open': '查询开放的补考批次',
      'GET /api/v1/courses': '查询课程列表',
      'GET /api/v1/employees/:employee_id/records': '查询员工记录'
    }
  });
});

app.use('/api/v1', retakeRoutes);

app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    code: 'UNHANDLED_ERROR',
    detail: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    code: 'NOT_FOUND',
    path: req.path
  });
});

async function bootstrap() {
  console.log('='.repeat(60));
  console.log('  培训补考报名服务 API 启动中...');
  console.log('='.repeat(60));

  try {
    await initDatabase();
    await seedTestData();
    console.log('  ✓ 数据库初始化完成');
  } catch (e) {
    console.error('  ✗ 数据库初始化失败:', e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`  ✓ 服务已启动: http://localhost:${PORT}`);
    console.log(`  ✓ 健康检查: http://localhost:${PORT}/api/v1/health`);
    console.log('='.repeat(60));
    console.log('');
    console.log('  业务规则说明：');
    console.log('  1. 已通过课程的员工不能再报名补考');
    console.log('  2. 报名前检查补考次数上限（每门课独立计算）');
    console.log('  3. 同一员工+课程+批次重复提交自动合并');
    console.log('  4. 成绩回写后自动标记，不再重复提醒');
    console.log('  5. 部门助理只看到本部门未通知的名单');
    console.log('');
    console.log('  测试账号：');
    console.log('  - HR审核: HR001 / 卫十四');
    console.log('  - 研发部经理: M001 / 张三, 助理: A001 / 李四');
    console.log('  - 研发部员工补考: E001(王五, C001未过), E002(赵六, C001+C002未过), E003(孙七, C001+C004未过)');
    console.log('  - 市场部经理: M002 / 周八, 助理: A002 / 吴九');
    console.log('  - 市场部员工补考: E004(郑十, C003未过), E005(冯十一, C003未过)');
    console.log('');
  });
}

if (require.main === module) {
  bootstrap();
}

module.exports = app;
