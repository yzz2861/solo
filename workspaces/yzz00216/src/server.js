const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  牛奶体细胞超标检测 API 服务');
  console.log('  Milk SCC Exceedance Detection API');
  console.log('========================================');
  console.log('');
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/health`);
  console.log(`  API 基础路径: /api/v1`);
  console.log('');
  console.log('  接口列表:');
  console.log('    POST  /api/v1/detect/single       - 单条检测');
  console.log('    POST  /api/v1/detect/batch        - 批量检测');
  console.log('    GET   /api/v1/result/:id          - 查询检测结果');
  console.log('    GET   /api/v1/batch/:batchId      - 查询批次结果');
  console.log('    GET   /api/v1/batch/:batchId/download  - 下载结果文件');
  console.log('    GET   /api/v1/batch/:batchId/badrows/download - 下载坏行文件');
  console.log('    POST  /api/v1/result/:resultId/review   - 提交人工复核');
  console.log('    POST  /api/v1/review/:reviewId/process  - 处理复核');
  console.log('    GET   /api/v1/review/:reviewId    - 查询复核记录');
  console.log('    GET   /api/v1/reviews/pending     - 待复核列表');
  console.log('');
  console.log('  服务已启动...');
  console.log('');
});
