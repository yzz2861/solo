const { processBatch } = require('../src/businessService');
const { clearAll } = require('../src/storage');
const SAMPLES = require('./samples');

clearAll();

console.log('=== 调试：多明细批次 ===\n');
const result = processBatch(SAMPLES.batchMultipleItems.payload);
console.log('总统计:', {
  totalCount: result.totalCount,
  successCount: result.successCount,
  failCount: result.failCount
});

result.results.forEach((r, i) => {
  console.log(`\n第 ${i+1} 条:`);
  console.log(`  itemId: ${r.itemId}`);
  console.log(`  conclusion: ${r.businessConclusion}`);
  console.log(`  riskScore: ${r.riskScore}`);
  console.log(`  riskTags: ${r.riskTags.join(', ')}`);
  if (r.failReason) console.log(`  failReason: ${r.failReason}`);
  if (r.hitRules.length > 0) {
    console.log(`  hitRules: ${r.hitRules.map(x => x.ruleId).join(', ')}`);
  }
});
