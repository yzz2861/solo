const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  住院压疮风险评估API服务已启动');
  console.log('  服务端口: ' + PORT);
  console.log('  健康检查: http://localhost:' + PORT + '/health');
  console.log('  主接口: POST http://localhost:' + PORT + '/api/pressure-ulcer/assessment');
  console.log('========================================');
  console.log('');
});
