import * as express from 'express';
import { json, urlencoded } from 'express';
import { authRoutes } from './routes/auth';
import { tenantRoutes } from './routes/tenant';
import { applicationRoutes } from './routes/application';
import { reportRoutes } from './routes/report';

const app = express();

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Request-Id', require('uuid').v4());
  res.setHeader('X-Powered-By', 'Enterprise-Visitor-WiFi-API');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: 'ok',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'Enterprise Visitor WiFi API',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: `路由不存在: ${req.method} ${req.url}`,
  });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled]', err.stack || err.message);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
  });
});

export default app;
