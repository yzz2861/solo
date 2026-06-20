import express from 'express';
import cors from 'cors';
import outletsRouter from './routes/outlets';
import bottlesRouter from './routes/bottles';
import usersRouter from './routes/users';
import samplingRouter from './routes/sampling';
import alertsRouter from './routes/alerts';
import viewsRouter from './routes/views';
import reviewRouter from './routes/review';
import exportRouter from './routes/export';
import { ok } from './utils';
import { refreshOverdueFlags } from './utils';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((_req, _res, next) => {
  try {
    refreshOverdueFlags();
  } catch (e) {
    console.warn('scheduled refreshOverdueFlags failed', e);
  }
  next();
});

app.get('/health', (_req, res) => {
  ok(res, { status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  ok(res, {
    service: '园区污水化验送样服务 API',
    version: '1.0.0',
    endpoints: {
      outlets: '/api/outlets',
      bottles: '/api/bottles',
      users: '/api/users',
      sampling: '/api/sampling',
      alerts: '/api/alerts',
      views_env: '/api/views/env/pending-dispatch',
      views_lab: '/api/views/lab/pending-receive',
      views_master: '/api/views/master/dashboard',
      review: '/api/review/overtime-breakdown',
      export: '/api/export/full',
    },
    docs: '请参考 README / 接口清单',
  });
});

app.use('/api/outlets', outletsRouter);
app.use('/api/bottles', bottlesRouter);
app.use('/api/users', usersRouter);
app.use('/api/sampling', samplingRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/views', viewsRouter);
app.use('/api/review', reviewRouter);
app.use('/api/export', exportRouter);

app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({
    code: 500,
    message: '服务器错误: ' + (err?.message || String(err)),
    data: null,
  });
});

setInterval(() => {
  try {
    refreshOverdueFlags();
  } catch (e) {
    console.warn('background refreshOverdueFlags failed', e);
  }
}, 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`污水化验送样服务 API 已启动: http://localhost:${PORT}`);
  console.log('请先运行: npm run seed  初始化基础数据');
});

export default app;
