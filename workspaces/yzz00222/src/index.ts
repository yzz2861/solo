import express from 'express';
import routes from './api/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '港口引航员资质派单API运行正常' });
});

app.listen(PORT, () => {
  console.log(`港口引航员资质派单API已启动，监听端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
});

export default app;
