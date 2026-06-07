const service = require('../src/services/grayRateLimitService');
const bizNo = 'BIZ-VERIFY-CLOSE-' + Date.now();

console.log('=== 人工复核闭环验证 ===\n');

console.log('1. 首次提交（材料齐全）');
let r = service.processRequest({
  businessNo: bizNo,
  objectStatus: 'active',
  ruleVersion: 'v2.0',
  operator: 'user_test',
  providedMaterials: { businessLicense: 'a', idCard: 'b', contract: 'c' }
});
console.log('   resultType :', r.data.resultType);
console.log('   reason     :', r.data.explanation.reason);
console.log('   HTTP code  :', r.code);
console.log('   预期       : needs_supplement / manual_review_required / 202');
console.log('   结果       :',
  r.data.resultType === 'needs_supplement' &&
  r.data.explanation.reason === 'manual_review_required' &&
  r.code === 202 ? '✅ PASS' : '❌ FAIL');

console.log('\n2. 审核通过 (APPROVED)');
r = service.reviewDecision({
  businessNo: bizNo,
  decision: 'APPROVED',
  reviewComment: '材料齐全，测试通过',
  operator: 'reviewer_test',
  ruleVersion: 'v2.0'
});
console.log('   reviewResult :', r.data.reviewResult);
console.log('   预期         : APPROVED');
console.log('   结果         :', r.data.reviewResult === 'APPROVED' ? '✅ PASS' : '❌ FAIL');

console.log('\n3. 审核通过后再次检查');
r = service.processRequest({
  businessNo: bizNo,
  objectStatus: 'active',
  ruleVersion: 'v2.0',
  operator: 'user_test'
});
console.log('   resultType    :', r.data.resultType);
console.log('   remainingQuota:', r.data.remainingQuota);
console.log('   reviewStatus  :', r.data.reviewInfo ? r.data.reviewInfo.status : 'N/A');
console.log('   HTTP code     :', r.code);
console.log('   预期          : processable / approved / 200');
console.log('   结果          :',
  r.data.resultType === 'processable' &&
  r.data.reviewInfo && r.data.reviewInfo.status === 'approved' &&
  r.code === 200 ? '✅ PASS' : '❌ FAIL');

console.log('\n4. 审核拒绝场景');
const bizNo2 = 'BIZ-VERIFY-REJECT-' + Date.now();
service.processRequest({
  businessNo: bizNo2,
  objectStatus: 'active',
  ruleVersion: 'v2.0',
  operator: 'user_test',
  providedMaterials: { businessLicense: 'a', idCard: 'b', contract: 'c' }
});
service.reviewDecision({
  businessNo: bizNo2,
  decision: 'REJECTED',
  reviewComment: '材料无效，测试拒绝',
  operator: 'reviewer_test',
  ruleVersion: 'v2.0'
});
r = service.processRequest({
  businessNo: bizNo2,
  objectStatus: 'active',
  ruleVersion: 'v2.0',
  operator: 'user_test'
});
console.log('   resultType     :', r.data.resultType);
console.log('   reason         :', r.data.explanation.reason);
console.log('   reviewComment  :', r.data.explanation.lastReviewComment);
console.log('   reviewStatus   :', r.data.reviewInfo ? r.data.reviewInfo.status : 'N/A');
console.log('   预期           : failed / review_rejected / rejected');
console.log('   结果           :',
  r.data.resultType === 'failed' &&
  r.data.explanation.reason === 'review_rejected' &&
  r.data.reviewInfo && r.data.reviewInfo.status === 'rejected' ? '✅ PASS' : '❌ FAIL');

console.log('\n=== 全部验证完成 ===');
