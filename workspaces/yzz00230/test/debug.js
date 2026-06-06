const { processBatch } = require('../src/businessService');
const { clearAll, findLatestByItemId, getAllRecords, findByItemId } = require('../src/storage');
const SAMPLES = require('./samples');

console.log('=== 调试：复核流程 ===\n');

clearAll();

console.log('1. 提交 setupPayload');
const setupResult = processBatch(SAMPLES.manualReviewApprove.setupPayload);
console.log('   setup 结果:', JSON.stringify(setupResult.results[0], null, 2));

console.log('\n2. 检查存储中的记录数量:', getAllRecords().length);
console.log('   所有记录的 itemId:', getAllRecords().map(r => r.itemId));

console.log('\n3. 用 findLatestByItemId 查找 ITEM-REVIEW-001:');
const latest = findLatestByItemId('ITEM-REVIEW-001');
console.log('   结果:', latest ? '找到' : '未找到');
if (latest) {
  console.log('   auditId:', latest.auditId);
  console.log('   status:', latest.status);
  console.log('   conclusion:', latest.conclusion);
}

console.log('\n4. 用 findByItemId 查找 ITEM-REVIEW-001:');
const records = findByItemId('ITEM-REVIEW-001');
console.log('   找到', records.length, '条记录');

console.log('\n5. 提交复核通过:');
const reviewResult = processBatch(SAMPLES.manualReviewApprove.reviewPayload);
console.log('   复核结果:', JSON.stringify(reviewResult.results[0], null, 2));
