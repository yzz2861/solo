const http = require('http');

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, detail) {
  if (condition) {
    passed++;
    results.push({ name: testName, status: 'PASS', detail: detail || '' });
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', detail: detail || '' });
    console.log(`  ❌ ${testName} - ${detail || ''}`);
  }
}

function httpRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

const testCases = {
  compliant: {
    batchNo: 'BATCH-COMPLIANT-001',
    sourceChannel: '病房护士站',
    processAction: 'submit',
    operator: '张护士',
    details: [
      {
        patientId: 'P001',
        patientName: '王建国',
        age: 45,
        gender: '男',
        department: '普外科',
        bedNo: '3-12床',
        admissionDate: '2026-06-01',
        assessor: '李护士',
        assessmentTime: '2026-06-06T08:00:00Z',
        medicalHistory: ['高血压'],
        braden: {
          sensoryPerception: 4,
          moisture: 4,
          activity: 3,
          mobility: 3,
          nutrition: 3,
          frictionShear: 3
        }
      },
      {
        patientId: 'P002',
        patientName: '李明华',
        age: 52,
        gender: '女',
        department: '普外科',
        bedNo: '3-13床',
        admissionDate: '2026-06-02',
        assessor: '李护士',
        assessmentTime: '2026-06-06T08:15:00Z',
        medicalHistory: [],
        braden: {
          sensoryPerception: 4,
          moisture: 4,
          activity: 4,
          mobility: 4,
          nutrition: 4,
          frictionShear: 3
        }
      }
    ]
  },

  overThreshold: {
    batchNo: 'BATCH-OVER-THRESHOLD-002',
    sourceChannel: 'ICU',
    processAction: 'submit',
    operator: '王护士',
    details: [
      {
        patientId: 'P101',
        patientName: '赵重症',
        age: 78,
        gender: '男',
        department: 'ICU',
        bedNo: 'ICU-05床',
        admissionDate: '2026-06-03',
        assessor: 'ICU张护士',
        assessmentTime: '2026-06-06T09:00:00Z',
        medicalHistory: ['糖尿病', '压疮史'],
        braden: {
          sensoryPerception: 1,
          moisture: 1,
          activity: 1,
          mobility: 1,
          nutrition: 2,
          frictionShear: 1
        }
      },
      {
        patientId: 'P102',
        patientName: '钱高危',
        age: 65,
        gender: '女',
        department: 'ICU',
        bedNo: 'ICU-08床',
        admissionDate: '2026-06-04',
        assessor: 'ICU张护士',
        assessmentTime: '2026-06-06T09:30:00Z',
        medicalHistory: ['高血压'],
        braden: {
          sensoryPerception: 2,
          moisture: 2,
          activity: 2,
          mobility: 2,
          nutrition: 2,
          frictionShear: 2
        }
      },
      {
        patientId: 'P103',
        patientName: '孙中危',
        age: 72,
        gender: '男',
        department: 'ICU',
        bedNo: 'ICU-10床',
        admissionDate: '2026-06-05',
        assessor: 'ICU张护士',
        assessmentTime: '2026-06-06T10:00:00Z',
        medicalHistory: [],
        braden: {
          sensoryPerception: 3,
          moisture: 3,
          activity: 3,
          mobility: 3,
          nutrition: 3,
          frictionShear: 2
        }
      }
    ]
  },

  materialMissing: {
    batchNo: 'BATCH-MISSING-003',
    sourceChannel: '急诊',
    processAction: 'submit',
    operator: '急诊护士',
    details: [
      {
        patientId: 'P201',
        patientName: '周急诊',
        age: 58,
        braden: {
          sensoryPerception: 3,
          moisture: 3,
          activity: 3,
          mobility: 3,
          nutrition: 3,
          frictionShear: 3
        }
      },
      {
        patientId: 'P202',
        patientName: '吴缺料',
        age: 67,
        gender: '男',
        department: '急诊科',
        braden: {
          sensoryPerception: 2,
          moisture: 3,
          activity: 3,
          mobility: 3,
          nutrition: 3,
          frictionShear: 3
        }
      }
    ]
  },

  duplicate: {
    batchNo: 'BATCH-COMPLIANT-001',
    sourceChannel: '病房护士站',
    processAction: 'submit',
    operator: '重复提交者',
    details: [
      {
        patientId: 'P001',
        patientName: '王建国',
        age: 45,
        gender: '男',
        department: '普外科',
        bedNo: '3-12床',
        admissionDate: '2026-06-01',
        assessor: '李护士',
        assessmentTime: '2026-06-06T08:00:00Z',
        medicalHistory: ['高血压'],
        braden: {
          sensoryPerception: 4,
          moisture: 4,
          activity: 3,
          mobility: 3,
          nutrition: 3,
          frictionShear: 3
        }
      }
    ]
  }
};

async function runTests() {
  console.log('\n');
  console.log('========================================');
  console.log('  住院压疮风险评估API - 验收测试');
  console.log('========================================');
  console.log('');

  try {
    console.log('检查服务健康状态...');
    const health = await httpRequest('/health', 'GET');
    if (health.status !== 200 || health.body.status !== 'ok') {
      console.error('❌ 服务未启动，请先运行 npm start');
      process.exit(1);
    }
    console.log('  ✅ 服务运行正常');

    console.log('重置测试数据...');
    const reset = await httpRequest('/api/pressure-ulcer/reset', 'POST');
    if (reset.status === 200 && reset.body.success) {
      console.log('  ✅ 数据已重置');
    }
    console.log('');
  } catch (e) {
    console.error('❌ 无法连接服务，请先运行 npm start');
    console.error('   错误:', e.message);
    process.exit(1);
  }

  console.log('【测试用例 1: 合规样例');
  console.log('----------------------------------------');
  const compliantRes = await httpRequest('/api/pressure-ulcer/assessment', 'POST', testCases.compliant);
  const compliantData = compliantRes.body.data;

  assert(compliantRes.status === 200, '请求成功返回HTTP 200');
  assert(compliantData.businessConclusion === '合规通过', '业务结论为合规通过',
    `实际: ${compliantData.businessConclusion}`);
  assert(compliantData.riskLevel === '无风险', '风险等级为无风险',
  `实际: ${compliantData.riskLevel}`);
  assert(Array.isArray(compliantData.riskLabels) && compliantData.riskLabels.length === 0,
    '风险标签为空数组',
    `实际数量: ${compliantData.riskLabels?.length || 0}`);
  assert(compliantData.summary && compliantData.summary.totalCount === 2,
    '汇总数量为2',
    `实际: ${compliantData.summary?.totalCount}`);
  assert(compliantData.summary.ruleHitCount === 0,
  '明细规则命中数量为0',
  `实际: ${compliantData.summary?.ruleHitCount}`);
  assert(compliantData.triageCategory === 'NORMAL',
    '分流类别为NORMAL',
    `实际: ${compliantData.triageCategory}`);
  assert(compliantData.auditNo && compliantData.auditNo.startsWith('AU-'),
    '审计编号格式正确',
    `实际: ${compliantData.auditNo}`);
  assert(Array.isArray(compliantData.nextActions) && compliantData.nextActions.length > 0,
    '下一步动作非空');
  assert(compliantData.reason && compliantData.reason.length > 0,
    '有明确原因说明',
    `原因: ${compliantData.reason}`);

  const auditRes = await httpRequest(`/api/pressure-ulcer/assessment/${testCases.compliant.batchNo}/audit-logs`, 'GET');
  assert(auditRes.status === 200, '审计日志查询成功');
  assert(auditRes.body.data.logCount >= 1,
    '审计日志数量≥1条',
    `实际: ${auditRes.body.data.logCount}`);
  const logEntry = auditRes.body.data.logs[0];
  assert(logEntry.action === 'submit', '日志记录动作正确',
    `实际: ${logEntry.action}`);
  assert(logEntry.conclusion === '合规通过', '日志结论正确',
    `实际: ${logEntry.conclusion}`);
  assert(logEntry.detailCount === 2, '日志明细数量正确',
    `实际: ${logEntry.detailCount}`);

  console.log('');

  console.log('【测试用例 2: 超阈值样例');
  console.log('----------------------------------------');
  const overRes = await httpRequest('/api/pressure-ulcer/assessment', 'POST', testCases.overThreshold);
  const overData = overRes.body.data;

  assert(overRes.status === 200, '请求成功返回HTTP 200');
  assert(overData.businessConclusion === '超阈值预警', '业务结论为超阈值预警',
    `实际: ${overData.businessConclusion}`);
  assert(overData.riskLevel === '极高度风险' || overData.riskLevel === '高度风险',
    '风险等级为高度/极高度风险',
    `实际: ${overData.riskLevel}`);
  assert(overData.riskLabels && overData.riskLabels.length > 0,
    '风险标签非空',
    `标签数量: ${overData.riskLabels?.length || 0}`);
  assert(overData.summary && overData.summary.totalCount === 3,
    '汇总数量为3',
    `实际: ${overData.summary?.totalCount}`);
  assert(overData.summary.ruleHitCount === 3,
  '明细规则命中数量为3',
  `实际: ${overData.summary?.ruleHitCount}`);
  assert(overData.summary.highRiskCount >= 1,
    '高风险数量≥1',
    `实际: ${overData.summary?.highRiskCount}`);
  assert(overData.triageCategory === 'RULE_HIT',
    '分流类别为RULE_HIT',
    `实际: ${overData.triageCategory}`);
  assert(overData.riskLabels.includes('Braden低分值'),
    '风险标签包含Braden低分值');
  assert(overData.nextActions && overData.nextActions.includes('通知病区护士'),
    '下一步动作包含通知病区护士');
  assert(overData.reason && overData.reason.includes('规则命中'),
    '原因说明包含"规则命中"',
    `原因: ${overData.reason}`);
  assert(overData.details && overData.details.length === 3,
    '明细项数量为3',
    `实际: ${overData.details?.length || 0}`);

  const detail1 = overData.details.find(d => d.patientId === 'P101');
  assert(detail1 && detail1.bradenScore === 7,
    'P101 Braden评分为7分(极高度风险)',
    `实际: ${detail1?.bradenScore}`);
  assert(detail1 && detail1.riskLevel === '极高度风险',
    'P101 风险等级为极高度风险',
    `实际: ${detail1?.riskLevel}`);
  assert(detail1 && detail1.hitRules && detail1.hitRules.length >= 3,
    'P101 命中规则≥3条',
    `实际: ${detail1?.hitRules?.length || 0}`);

  const overAuditRes = await httpRequest(`/api/pressure-ulcer/assessment/${testCases.overThreshold.batchNo}/audit-logs`, 'GET');
  assert(overAuditRes.body.data.logCount >= 1,
    '审计日志≥1条',
    `实际: ${overAuditRes.body.data.logCount}`);
  const overLog = overAuditRes.body.data.logs[0];
  assert(overLog.triageCategory === 'RULE_HIT',
    '日志分流类别正确',
    `实际: ${overLog.triageCategory}`);
  assert(overLog.riskLabels && overLog.riskLabels.length > 0,
    '日志记录风险标签',
    `数量: ${overLog.riskLabels?.length || 0}`);

  console.log('');

  console.log('【测试用例 3: 材料缺失样例');
  console.log('----------------------------------------');
  const missingRes = await httpRequest('/api/pressure-ulcer/assessment', 'POST', testCases.materialMissing);
  const missingData = missingRes.body.data;

  assert(missingRes.status === 200, '请求成功返回HTTP 200');
  assert(missingData.businessConclusion === '材料缺失',
    '业务结论为材料缺失',
    `实际: ${missingData.businessConclusion}`);
  assert(missingData.riskLevel === null,
    '风险等级为空',
    `实际: ${missingData.riskLevel}`);
  assert(Array.isArray(missingData.riskLabels) && missingData.riskLabels.length === 0,
    '风险标签为空',
    `数量: ${missingData.riskLabels?.length || 0}`);
  assert(missingData.summary && missingData.summary.totalCount === 2,
    '汇总数量为2',
    `实际: ${missingData.summary?.totalCount}`);
  assert(missingData.summary.missingCount === 2,
    '材料缺失数量为2',
    `实际: ${missingData.summary?.missingCount}`);
  assert(missingData.missingItems && missingData.missingItems.length === 2,
    '缺失明细列表有2项',
    `实际: ${missingData.missingItems?.length || 0}`);
  assert(missingData.nextActions && missingData.nextActions.includes('补充材料后重新提交'),
    '下一步动作包含补充材料后重新提交');
  assert(missingData.reason && missingData.reason.includes('材料缺失'),
    '原因说明包含"材料缺失"',
    `原因: ${missingData.reason}`);

  const missingItem1 = missingData.missingItems.find(m => m.patientId === 'P201');
  assert(missingItem1 && missingItem1.missingFields && missingItem1.missingFields.length >= 4,
    'P201 缺失字段≥4个',
    `实际缺失: ${missingItem1?.missingFields?.join(', ') || '无'}`);
  assert(missingItem1 && missingItem1.missingFields.includes('科室'),
    'P201 缺失"科室"字段');

  const missingAuditRes = await httpRequest(`/api/pressure-ulcer/assessment/${testCases.materialMissing.batchNo}/audit-logs`, 'GET');
  assert(missingAuditRes.body.data.logCount >= 1,
    '审计日志≥1条');

  console.log('');

  console.log('【测试用例 4: 重复提交样例');
  console.log('----------------------------------------');
  const dupRes = await httpRequest('/api/pressure-ulcer/assessment', 'POST', testCases.duplicate);
  const dupData = dupRes.body.data;

  assert(dupRes.status === 200, '请求成功返回HTTP 200');
  assert(dupData.businessConclusion === '重复提交',
    '业务结论为重复提交',
    `实际: ${dupData.businessConclusion}`);
  assert(dupData.triageCategory === 'DUPLICATE',
    '分流类别为DUPLICATE',
    `实际: ${dupData.triageCategory}`);
  assert(dupData.originalBatch !== null && dupData.originalBatch !== undefined,
    '返回原批次信息');
  assert(dupData.originalBatch && dupData.originalBatch.conclusion === '合规通过',
    '原批次结论为合规通过',
    `实际: ${dupData.originalBatch?.conclusion}`);
  assert(dupData.nextActions && dupData.nextActions.includes('重新评估'),
    '下一步动作包含重新评估');
  assert(dupData.reason && dupData.reason.includes('重复提交'),
    '原因说明包含"重复提交"',
    `原因: ${dupData.reason}`);
  assert(dupData.auditNo && dupData.auditNo.startsWith('AU-'),
    '审计编号格式正确');

  const dupAuditRes = await httpRequest(`/api/pressure-ulcer/assessment/${testCases.duplicate.batchNo}/audit-logs`, 'GET');
  assert(dupAuditRes.body.data.logCount >= 2,
    '审计日志≥2条（首次提交+重复提交',
    `实际: ${dupAuditRes.body.data.logCount}`);

  console.log('');

  console.log('【测试用例 5: 历史回放样例');
  console.log('----------------------------------------');

  const replayData = {
    batchNo: 'BATCH-OVER-THRESHOLD-002',
    sourceChannel: '病房护士站',
    processAction: 'replay',
    operator: '质控员',
    details: testCases.overThreshold.details
  };

  const replayRes = await httpRequest('/api/pressure-ulcer/assessment', 'POST', replayData);
  const replayResult = replayRes.body.data;

  assert(replayRes.status === 200, '请求成功返回HTTP 200');
  assert(replayResult.businessConclusion === '历史回放',
    '业务结论为历史回放',
    `实际: ${replayResult.businessConclusion}`);
  assert(replayResult.triageCategory === 'REPLAY',
    '分流类别为REPLAY',
    `实际: ${replayResult.triageCategory}`);
  assert(replayResult.originalBatch !== null && replayResult.originalBatch !== undefined,
    '返回原批次信息');
  assert(replayResult.originalBatch && replayResult.originalBatch.conclusion === '超阈值预警',
    '原批次结论为超阈值预警',
    `实际: ${replayResult.originalBatch?.conclusion}`);
  assert(replayResult.riskLevel === replayResult.originalBatch.riskLevel,
    '回放风险等级与原批次一致');
  assert(replayResult.reason && replayResult.reason.includes('历史回放成功'),
    '原因说明包含"历史回放成功"',
    `原因: ${replayResult.reason}`);
  assert(replayResult.nextActions && replayResult.nextActions.includes('归档结案'),
    '下一步动作包含归档结案');
  assert(replayResult.summary && replayResult.summary.totalCount === 3,
    '汇总数量与原批次一致',
    `实际: ${replayResult.summary?.totalCount}`);

  console.log('');

  console.log('【测试用例 6: 汇总统计验证');
  console.log('----------------------------------------');
  const statsRes = await httpRequest('/api/pressure-ulcer/stats', 'GET');
  const stats = statsRes.body.data;

  assert(statsRes.status === 200, '统计接口返回成功');
  assert(stats.totalBatches >= 3,
    '总批次数量≥3',
    `实际: ${stats.totalBatches}`);
  assert(stats.totalAuditLogs >= 5,
    '总审计日志≥5条',
    `实际: ${stats.totalAuditLogs}`);
  assert(stats.byConclusion && stats.byConclusion.compliant >= 1,
    '合规通过批次≥1',
    `实际: ${stats.byConclusion?.compliant}`);
  assert(stats.byConclusion && stats.byConclusion.overThreshold >= 1,
    '超阈值预警批次≥1',
    `实际: ${stats.byConclusion?.overThreshold}`);
  assert(stats.byConclusion && stats.byConclusion.missing >= 1,
    '材料缺失批次≥1',
    `实际: ${stats.byConclusion?.missing}`);
  assert(stats.byConclusion && stats.byConclusion.duplicate >= 0,
    '重复提交批次计数正常');

  console.log('');
  console.log('========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log(`  总计: ${passed + failed} 项`);
  console.log(`  通过: ${passed} 项 ✅`);
  console.log(`  失败: ${failed} 项 ❌`);
  console.log('========================================');
  console.log('');

  if (failed > 0) {
    console.log('失败的测试:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.detail) console.log(`     ${r.detail}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 所有验收测试通过！');
    console.log('');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
