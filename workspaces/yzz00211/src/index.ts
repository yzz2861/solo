import { createApp } from './api/app';

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`麻醉药品余量交接API已启动，监听端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`API文档: POST http://localhost:${PORT}/api/v1/handover/process`);
});

export default app;
