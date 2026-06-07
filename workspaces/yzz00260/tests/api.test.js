const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(jsonData);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('=== API 接口测试 ===\n');

  console.log('1. 合规请求 (processable)');
  let r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'api_user'
  });
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  console.log(`   追踪ID: ${r.body.traceId}`);
  console.log(`   剩余配额: ${r.body.remainingQuota}`);
  console.log(`   规则: ${r.body.explanation.ruleName}`);

  const traceId = r.body.traceId;

  console.log('\n2. 材料缺失 (needs_supplement)');
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-002',
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'api_user',
    providedMaterials: {}
  });
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  console.log(`   失败原因: ${r.body.explanation.reason}`);
  console.log(`   缺失材料: ${r.body.explanation.missingFields.join(', ')}`);

  console.log('\n3. 规则版本不存在 (failed - rule_not_found)');
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-003',
    objectStatus: 'active',
    ruleVersion: 'v99.9',
    operator: 'api_user'
  });
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  console.log(`   失败原因: ${r.body.explanation.reason}`);

  console.log('\n4. 对象状态无效 (failed - invalid_object_status)');
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-004',
    objectStatus: 'cancelled',
    ruleVersion: 'v1.0',
    operator: 'api_user'
  });
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  console.log(`   失败原因: ${r.body.explanation.reason}`);

  console.log('\n5. 重复提交 (failed - duplicate_submission)');
  const idemKey = 'API-IDEM-' + Date.now();
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-005',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'api_user',
    idempotencyKey: idemKey
  });
  console.log(`   第一次: ${r.statusCode} - ${r.body.resultType}`);

  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-005',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'api_user',
    idempotencyKey: idemKey
  });
  console.log(`   第二次: ${r.statusCode} - ${r.body.resultType}`);
  console.log(`   失败原因: ${r.body.explanation.reason}`);
  console.log(`   原始请求ID: ${r.body.explanation.originalRequestId}`);

  console.log('\n6. 业务锁定 (locked)');
  r = await post('/api/v1/gray-rate-limit/lock', {
    businessNo: 'API-TEST-006',
    reason: '风险管控测试',
    operator: 'admin'
  });
  console.log(`   锁定操作: ${r.statusCode}`);

  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-006',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'api_user'
  });
  console.log(`   请求状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  console.log(`   失败原因: ${r.body.explanation.reason}`);
  console.log(`   锁定原因: ${r.body.explanation.detail}`);

  console.log('\n7. 历史回放');
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-007',
    objectStatus: 'frozen',
    ruleVersion: 'v1.5',
    operator: 'admin',
    isHistoryPlayback: true,
    requestTime: '2026-01-15T10:30:00.000Z'
  });
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   结果类型: ${r.body.resultType}`);
  if (r.body.explanation.windowStart) {
    console.log(`   时间窗口: ${r.body.explanation.windowStart} ~ ${r.body.explanation.windowEnd}`);
  }

  console.log('\n8. 追踪编号可追溯');
  r = await get(`/api/v1/gray-rate-limit/trace/${traceId}`);
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   找到记录: ${r.body.found}`);
  console.log(`   记录数: ${r.body.records ? r.body.records.length : 0}`);
  if (r.body.records && r.body.records.length > 0) {
    const log = r.body.records[0];
    console.log(`   操作人: ${log.operator}`);
    console.log(`   操作类型: ${log.action}`);
    console.log(`   状态: ${log.status}`);
  }

  console.log('\n9. 人工审核流程');
  r = await post('/api/v1/gray-rate-limit/check', {
    businessNo: 'API-TEST-REVIEW',
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'submitter',
    providedMaterials: {
      businessLicense: 'lic-001',
      idCard: 'id-001',
      contract: 'con-001'
    }
  });
  console.log(`   提交后状态: ${r.body.resultType}`);
  console.log(`   原因: ${r.body.explanation.reason}`);
  console.log(`   审核状态: ${r.body.reviewInfo.status}`);

  r = await post('/api/v1/gray-rate-limit/review', {
    businessNo: 'API-TEST-REVIEW',
    decision: 'APPROVED',
    reviewComment: '材料齐全，审批通过',
    operator: 'reviewer_admin'
  });
  console.log(`   审核结果: ${r.body.reviewResult}`);
  console.log(`   审核人: ${r.body.reviewedBy}`);

  console.log('\n10. 审计日志');
  r = await get('/api/v1/gray-rate-limit/audit?businessNo=API-TEST-001&limit=5');
  console.log(`   状态码: ${r.statusCode}`);
  console.log(`   日志总数: ${r.body.total}`);

  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
