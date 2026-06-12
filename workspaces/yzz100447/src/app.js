const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const customersRouter = require('./routes/customers');
const cylindersRouter = require('./routes/cylinders');
const deliveryPersonsRouter = require('./routes/deliveryPersons');
const deliveryOrdersRouter = require('./routes/deliveryOrders');
const returnOrdersRouter = require('./routes/returnOrders');
const inspectionsRouter = require('./routes/inspections');
const repairsRouter = require('./routes/repairs');
const depositRouter = require('./routes/deposit');
const reportsRouter = require('./routes/reports');

require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    code: 0,
    message: '燃气瓶配送押金 API 服务运行中',
    data: {
      version: '1.0.0',
      endpoints: {
        customers: '/api/customers',
        cylinders: '/api/cylinders',
        deliveryPersons: '/api/delivery-persons',
        deliveryOrders: '/api/delivery-orders',
        returnOrders: '/api/return-orders',
        inspections: '/api/inspections',
        repairs: '/api/repairs',
        deposit: '/api/deposit',
        reports: '/api/reports'
      }
    }
  });
});

app.use('/api/customers', customersRouter);
app.use('/api/cylinders', cylindersRouter);
app.use('/api/delivery-persons', deliveryPersonsRouter);
app.use('/api/delivery-orders', deliveryOrdersRouter);
app.use('/api/return-orders', returnOrdersRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/repairs', repairsRouter);
app.use('/api/deposit', depositRouter);
app.use('/api/reports', reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`燃气瓶配送押金 API 服务已启动，端口: ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});

module.exports = app;
