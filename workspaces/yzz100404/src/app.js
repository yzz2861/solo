const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { loadDB } = require('./db');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const pilesRoute = require('./routes/piles');
const repairersRoute = require('./routes/repairers');
const operatorsRoute = require('./routes/operators');
const ordersRoute = require('./routes/orders');
const statsRoute = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: '社区充电桩派单 API',
    version: '1.0.0',
    endpoints: {
      '/api/piles': '充电桩管理',
      '/api/repairers': '维修工管理',
      '/api/operators': '操作员管理',
      '/api/orders': '工单管理（上报、派单、回填、复核、时间线）',
      '/api/stats': '统计分析',
    },
    docs: {
      order_status: {
        pending: '待派单',
        assigned: '已派单',
        repairing: '处理中',
        reviewing: '待复核',
        completed: '已完成',
        merged: '已合并',
      },
      pile_status: {
        available: '可用',
        out_of_service: '停用',
        under_repair: '维修中',
      },
    },
  });
});

app.use('/api/piles', pilesRoute);
app.use('/api/repairers', repairersRoute);
app.use('/api/operators', operatorsRoute);
app.use('/api/orders', ordersRoute);
app.use('/api/stats', statsRoute);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

const startServer = async () => {
  await loadDB();
  app.listen(PORT, () => {
    console.log(`社区充电桩派单 API 已启动: http://localhost:${PORT}`);
  });
};

startServer();

module.exports = app;
