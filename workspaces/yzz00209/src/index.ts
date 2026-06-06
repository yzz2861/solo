import express from 'express';
import apiRouter from './routes/api';
import { initializeService } from './services/qualificationService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiRouter);

app.get('/', (_req, res) => {
  res.json({
    name: '业委会投票资格API',
    version: '1.0.0',
    description: '基于对象、规则、状态、记录四层架构的投票资格判定系统',
    endpoints: {
      'POST /api/v1/qualification': '提交投票资格审核',
      'GET /api/v1/qualification/:auditNo': '查询审核记录',
      'GET /api/v1/audittrail/:businessId': '查询审计轨迹',
      'POST /api/v1/review': '提交复核结果',
      'GET /api/v1/reviews/pending': '获取待复核列表',
      'GET /api/v1/health': '健康检查'
    }
  });
});

initializeService();

app.listen(PORT, () => {
  console.log(`业委会投票资格API服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/`);
});

export default app;
