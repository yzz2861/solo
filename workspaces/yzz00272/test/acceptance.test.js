const http = require('http');

const HOST = 'localhost';
const PORT = 3000;
const PREFIX = '/api/v1';

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const fullPath = PREFIX + path;
    const options = {
      hostname: HOST,
      port: PORT,
      path: fullPath,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', message });
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', message });
    console.log(`  ❌ ${message}`);
  }
}

async function runTest(name, testFn) {
  console.log(`\n📋 测试场景: ${name}`);
  console.log('─'.repeat(60));
  try {
    await testFn();
  } catch (e) {
    failed++;
    results.push({ status: 'ERROR', message: `${name}: ${e.message}` });
    console.log(`  ❌ 异常: ${e.message}`);
  }
}

function formatDate(daysOffset = 0, hoursOffset = 0, minutesOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(d.getHours() + hoursOffset);
  d.setMinutes(d.getMinutes() + minutesOffset);
  return d.toISOString();
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  机场廊桥靠接安全API - 验收测试');
  console.log('═'.repeat(60));

  try {
    await request('/health');
  } catch (e) {
    console.log('❌ 无法连接到服务，请先启动服务: npm start');
    process.exit(1);
  }

  await request('/admin/clear', 'POST');
  await request('/config/reset', 'POST');

  await runTest('场景一: 完整数据 - 正常靠接作业', testCompleteData);

  await runTest('场景二: 时间越界 - 靠接时间超出作业窗口', testTimeOutOfBounds);

  await runTest('场景三: 编号错误 - 批次号/明细编号格式错误', testInvalidIds);

  await runTest('场景四: 配置缺失 - 风险规则被清空', testMissingConfig);

  await runTest('场景五: 幂等性验证 - 重复请求稳定结论', testIdempotency);

  await runTest('场景六: 边界场景互斥 - 不同场景风险标签不覆盖', testBoundaryExclusive);

  await runTest('场景七: 汇总校验 - 数量合计与风险标签验证', testSummaryVerification);

  console.log('\n' + '═'.repeat(60));
  console.log('  测试结果汇总');
  console.log('═'.repeat(60));
  console.log(`  总用例: ${passed + failed}`);
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n❌ 存在失败用例:');
    results.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`  - [${r.status}] ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ 所有验收测试通过!');
    process.exit(0);
  }
}

async function testCompleteData() {
  const batchNo = 'BATCH-20260607-0001';
  const payload = {
    batchNo,
    sourceChannel: 'AOC',
    action: 'SUBMIT',
    reviewComment: '',
    operator: 'zhang.san',
    details: [
      {
        detailId: 'DET-20260607-000001',
        bridgeCode: 'T1-B03',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA1234',
        dockingTime: formatDate(0, 0, 10),
        windSpeed: 8,
        visibility: 1500,
        positionDeviation: 2.3,
        hasAlarm: false,
        operatorCertified: true
      },
      {
        detailId: 'DET-20260607-000002',
        bridgeCode: 'T2-B05',
        bridgeStatus: 'APPROACHING',
        flightNo: 'MU5678',
        dockingTime: formatDate(0, 0, 25),
        windSpeed: 5,
        visibility: 2000,
        positionDeviation: 0.5,
        hasAlarm: false,
        operatorCertified: true
      },
      {
        detailId: 'DET-20260607-000003',
        bridgeCode: 'T1-B12',
        bridgeStatus: 'DOCKED',
        flightNo: 'CZ9012',
        dockingTime: formatDate(0, -0, -15),
        windSpeed: 12,
        visibility: 800,
        positionDeviation: -1.8,
        hasAlarm: false,
        operatorCertified: true
      }
    ]
  };

  const res = await request('/bridge-docking/process', 'POST', payload);
  const data = res.body.data;

  assert(res.status === 200, 'HTTP 状态码为 200');
  assert(res.body.code === 0, '业务返回码为 0');
  assert(data.batchNo === batchNo, '批次号正确返回');
  assert(!!data.auditNo, '返回审计编号');
  assert(data.auditNo.startsWith('AUD-'), '审计编号格式正确 AUD-开头');
  assert(!!data.ruleVersion, '返回规则版本号');
  assert(data.operator === 'zhang.san', '操作人正确返回');
  assert(Array.isArray(data.riskTags), '风险标签为数组');
  assert(!!data.nextAction, '返回下一步动作');
  assert(!!data.businessConclusion, '返回业务结论');
  assert(!!data.closedLoop, '返回闭环信息');
  assert(data.closedLoop.currentAction === 'SUBMIT', '闭环记录当前动作');
  assert(data.closedLoop.operator === 'zhang.san', '闭环记录操作人');

  assert(data.summary.totalCount === 3, `汇总总数为3，实际: ${data.summary.totalCount}`);
  assert(data.details.length === 3, `明细数量为3，实际: ${data.details.length}`);
  assert(
    data.summary.highRiskCount + data.summary.mediumRiskCount +
    data.summary.lowRiskCount + data.summary.infoCount === 3,
    '各风险等级数量之和等于总数'
  );

  const auditRes = await request(`/audit/${data.auditNo}`);
  assert(auditRes.status === 200, '审计记录可查询');
  assert(auditRes.body.data.batchNo === batchNo, '审计记录中批次号一致');
}

async function testTimeOutOfBounds() {
  const batchNo = 'BATCH-20260607-0002';
  const payload = {
    batchNo,
    sourceChannel: 'TOWER',
    action: 'SUBMIT',
    reviewComment: '超时作业申请',
    operator: 'li.si',
    details: [
      {
        detailId: 'DET-20260607-000004',
        bridgeCode: 'T1-B07',
        bridgeStatus: 'DOCKING',
        flightNo: 'HU3456',
        dockingTime: formatDate(0, 5, 0),
        windSpeed: 6,
        visibility: 1000,
        hasAlarm: false,
        operatorCertified: true
      },
      {
        detailId: 'DET-20260607-000005',
        bridgeCode: 'T2-B02',
        bridgeStatus: 'DOCKING',
        flightNo: 'ZH7890',
        dockingTime: formatDate(0, -2, 0),
        windSpeed: 7,
        visibility: 1200,
        hasAlarm: false,
        operatorCertified: true
      }
    ]
  };

  const res = await request('/bridge-docking/process', 'POST', payload);
  const data = res.body.data;

  assert(res.status === 200, 'HTTP 状态码为 200');
  assert(res.body.code === 0, '业务返回码为 0 (校验通过)');
  assert(data.summary.totalCount === 2, '总明细数为2');

  const hasTimeRiskTag = data.riskTags.some(tag => tag.includes('R002'));
  assert(hasTimeRiskTag, '包含时间越界风险标签 R002');

  assert(data.summary.highRiskCount >= 1, '至少有1个高风险项（时间越界）');

  const timeOutDetail = data.details.find(d => d.detailId === 'DET-20260607-000004');
  assert(timeOutDetail.riskLevel === 'HIGH', '时间越界的明细风险等级为 HIGH');

  assert(data.businessConclusion === 'FAIL' || data.businessConclusion === 'ESCALATE' || data.businessConclusion === 'PENDING',
    `业务结论为非通过状态，实际: ${data.businessConclusion}`);

  assert(data.nextAction !== '继续靠接作业', '下一步动作不是继续作业');
}

async function testInvalidIds() {
  const payload = {
    batchNo: 'INVALID_BATCH_NO',
    sourceChannel: 'AOC',
    action: 'SUBMIT',
    reviewComment: '',
    operator: 'wang.wu',
    details: [
      {
        detailId: 'BAD_DET_001',
        bridgeCode: 'BAD-BRIDGE',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA1234'
      }
    ]
  };

  const res = await request('/bridge-docking/process', 'POST', payload);
  const data = res.body.data;

  assert(res.status === 400, 'HTTP 状态码为 400 (校验失败)');
  assert(res.body.code === 400, '业务返回码为 400');
  assert(data.businessConclusion === 'FAIL', '业务结论为 FAIL');

  assert(Array.isArray(data.validationErrors) && data.validationErrors.length > 0,
    '返回校验错误列表');

  const hasBatchError = data.validationErrors.some(e => e.includes('批次号'));
  assert(hasBatchError, '包含批次号格式错误');

  const hasDetailError = data.validationErrors.some(e => e.includes('明细编号') || e.includes('明细[0]'));
  assert(hasDetailError, '包含明细编号格式错误');

  assert(data.summary.totalCount === 0, '校验失败时汇总总数为0');
  assert(data.details.length === 0, '校验失败时明细列表为空');
  assert(!!data.auditNo, '校验失败也返回审计编号');

  const auditRes = await request(`/audit/${data.auditNo}`);
  assert(auditRes.status === 200, '校验失败的记录也可审计追溯');
}

async function testMissingConfig() {
  await request('/config/reset', 'POST');

  const clearPayload = {
    riskRules: [],
    batchNoPattern: null,
    detailIdPattern: null,
    bridgeCodePattern: null
  };
  await request('/config', 'PUT', clearPayload);

  const configRes = await request('/config');
  assert(configRes.body.data.riskRuleCount === 0, '风险规则已被清空 (0条)');

  const batchNo = 'BATCH-20260607-0099';
  const payload = {
    batchNo,
    sourceChannel: 'AOC',
    action: 'APPROVE',
    reviewComment: '配置缺失环境测试',
    operator: 'zhao.liu',
    details: [
      {
        detailId: 'DET-20260607-009901',
        bridgeCode: 'T3-B01',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA9999',
        dockingTime: formatDate(0, 0, 30),
        windSpeed: 20,
        visibility: 200,
        hasAlarm: true,
        operatorCertified: false
      }
    ]
  };

  const res = await request('/bridge-docking/process', 'POST', payload);
  const data = res.body.data;

  assert(res.status === 200, '配置缺失时服务仍能正常响应');
  assert(res.body.code === 0, '配置缺失时业务返回码为0');

  assert(data.riskTags.length === 0, '无风险规则时风险标签为空');
  assert(data.summary.highRiskCount === 0, '无风险规则时高风险数为0');
  assert(data.summary.infoCount === 1, '无风险规则时全部为INFO级');

  assert(data.businessConclusion === 'PASS', '无风险规则时业务结论为 PASS');
  assert(data.nextAction === '继续靠接作业', '无风险规则时下一步动作为继续');

  assert(!!data.ruleVersion, '配置缺失时仍保留规则版本号');
  assert(!!data.auditNo, '配置缺失时仍生成审计编号');

  await request('/config/reset', 'POST');
  const resetRes = await request('/config');
  assert(resetRes.body.data.riskRuleCount > 0, '配置可重置恢复');
}

async function testIdempotency() {
  await request('/admin/clear', 'POST');

  const batchNo = 'BATCH-20260607-0010';
  const payload = {
    batchNo,
    sourceChannel: 'BRIDGE_TEAM',
    action: 'SUBMIT',
    reviewComment: '幂等性测试',
    operator: 'test.user',
    details: [
      {
        detailId: 'DET-20260607-001001',
        bridgeCode: 'T1-B05',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA1111',
        dockingTime: formatDate(0, 0, 15),
        windSpeed: 10,
        hasAlarm: false,
        operatorCertified: true
      }
    ]
  };

  const res1 = await request('/bridge-docking/process', 'POST', payload);
  const res2 = await request('/bridge-docking/process', 'POST', payload);
  const res3 = await request('/bridge-docking/process', 'POST', payload);

  assert(res1.body.data.auditNo === res2.body.data.auditNo,
    '两次请求返回相同的审计编号');
  assert(res2.body.data.auditNo === res3.body.data.auditNo,
    '三次请求返回相同的审计编号');

  assert(res1.body.data.businessConclusion === res2.body.data.businessConclusion,
    '两次请求业务结论一致');
  assert(JSON.stringify(res1.body.data.riskTags) === JSON.stringify(res2.body.data.riskTags),
    '两次请求风险标签一致');
  assert(res1.body.data.nextAction === res2.body.data.nextAction,
    '两次请求下一步动作一致');
  assert(JSON.stringify(res1.body.data.summary) === JSON.stringify(res2.body.data.summary),
    '两次请求汇总数据一致');

  const countRes = await request('/admin/audit-count');
  const count = countRes.body.data.count;
  assert(count === 1, `重复请求只生成1条审计记录，实际: ${count}`);
}

async function testBoundaryExclusive() {
  await request('/admin/clear', 'POST');
  await request('/config/reset', 'POST');

  const resultA = await request('/bridge-docking/process', 'POST', {
    batchNo: 'BATCH-20260607-0020',
    sourceChannel: 'AOC',
    action: 'SUBMIT',
    operator: 'test.a',
    details: [{
      detailId: 'DET-20260607-002001',
      bridgeCode: 'T1-B01',
      bridgeStatus: 'DOCKING',
      flightNo: 'CA2001',
      dockingTime: formatDate(0, 0, 10),
      windSpeed: 5,
      hasAlarm: false,
      operatorCertified: true
    }]
  });

  const resultB = await request('/bridge-docking/process', 'POST', {
    batchNo: 'BATCH-20260607-0021',
    sourceChannel: 'AOC',
    action: 'SUBMIT',
    operator: 'test.b',
    details: [{
      detailId: 'DET-20260607-002101',
      bridgeCode: 'T1-B02',
      bridgeStatus: 'DOCKING',
      flightNo: 'CA2002',
      dockingTime: formatDate(0, 4, 0),
      windSpeed: 5,
      hasAlarm: false,
      operatorCertified: true
    }]
  });

  const tagsA = resultA.body.data.riskTags;
  const tagsB = resultB.body.data.riskTags;

  const hasR002inA = tagsA.some(t => t.includes('R002'));
  const hasR002inB = tagsB.some(t => t.includes('R002'));

  assert(!hasR002inA && hasR002inB,
    '正常时间无R002标签，越界时间有R002标签，边界场景互斥');

  const resultC = await request('/bridge-docking/process', 'POST', {
    batchNo: 'BATCH-20260607-0022',
    sourceChannel: 'AOC',
    action: 'SUBMIT',
    operator: 'test.c',
    details: [{
      detailId: 'DET-20260607-002201',
      bridgeCode: 'T1-B03',
      bridgeStatus: 'UNKNOWN_STATUS',
      flightNo: 'CA2003',
      dockingTime: formatDate(0, 0, 10),
      windSpeed: 5,
      hasAlarm: false,
      operatorCertified: true
    }]
  });

  const tagsC = resultC.body.data.riskTags;
  const hasR001inC = tagsC.some(t => t.includes('R001'));
  const hasR002inC = tagsC.some(t => t.includes('R002'));

  assert(hasR001inC && !hasR002inC,
    '状态异常场景有R001标签，无R002标签，不同边界场景不互相覆盖');
}

async function testSummaryVerification() {
  await request('/admin/clear', 'POST');
  await request('/config/reset', 'POST');

  const payload = {
    batchNo: 'BATCH-20260607-0030',
    sourceChannel: 'MAINTENANCE',
    action: 'SUBMIT',
    reviewComment: '汇总校验测试',
    operator: 'test.summary',
    details: [
      {
        detailId: 'DET-20260607-003001',
        bridgeCode: 'T1-B01',
        bridgeStatus: 'FAULT',
        flightNo: '',
        dockingTime: formatDate(0, 3, 0),
        windSpeed: 20,
        visibility: 100,
        hasAlarm: true,
        operatorCertified: false
      },
      {
        detailId: 'DET-20260607-003002',
        bridgeCode: 'T2-B02',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA3002',
        dockingTime: formatDate(0, 0, 20),
        windSpeed: 18,
        visibility: 300,
        positionDeviation: 10,
        hasAlarm: false,
        operatorCertified: true
      },
      {
        detailId: 'DET-20260607-003003',
        bridgeCode: 'T1-B03',
        bridgeStatus: 'DOCKING',
        flightNo: 'CA3003',
        dockingTime: formatDate(0, 0, 5),
        windSpeed: 3,
        visibility: 3000,
        hasAlarm: false,
        operatorCertified: true
      },
      {
        detailId: 'DET-20260607-003004',
        bridgeCode: 'T3-B05',
        bridgeStatus: 'IDLE',
        flightNo: 'CA3004',
        dockingTime: formatDate(0, 0, 60),
        windSpeed: 8,
        visibility: 1500,
        hasAlarm: false,
        operatorCertified: true
      }
    ]
  };

  const res = await request('/bridge-docking/process', 'POST', payload);
  const data = res.body.data;

  assert(res.status === 200, 'HTTP 状态码 200');
  assert(data.summary.totalCount === 4, `总明细数为4，实际: ${data.summary.totalCount}`);
  assert(data.details.length === 4, `明细列表长度为4，实际: ${data.details.length}`);

  const sumRisks = data.summary.highRiskCount + data.summary.mediumRiskCount +
    data.summary.lowRiskCount + data.summary.infoCount;
  assert(sumRisks === data.summary.totalCount,
    `风险等级合计(${sumRisks}) = 总数(${data.summary.totalCount})`);

  const detailRiskCounts = data.details.reduce((acc, d) => {
    acc[d.riskLevel] = (acc[d.riskLevel] || 0) + 1;
    return acc;
  }, {});

  assert(detailRiskCounts.HIGH === data.summary.highRiskCount,
    `明细高风险数(${detailRiskCounts.HIGH || 0}) = 汇总高风险数(${data.summary.highRiskCount})`);
  assert((detailRiskCounts.MEDIUM || 0) === data.summary.mediumRiskCount,
    `明细中风险数 = 汇总中风险数`);
  assert((detailRiskCounts.LOW || 0) === data.summary.lowRiskCount,
    `明细低风险数 = 汇总低风险数`);

  const allDetailTags = [...new Set(data.details.flatMap(d => d.riskTags))];
  assert(allDetailTags.length === data.riskTags.length,
    `明细风险标签去重后数量(${allDetailTags.length}) = 汇总风险标签数量(${data.riskTags.length})`);

  const d1 = data.details.find(d => d.detailId === 'DET-20260607-003001');
  assert(d1.riskLevel === 'HIGH', '高危明细(设备告警+无证+时间越界+低能见度)风险等级为 HIGH');
  assert(d1.requiresAttention === true, '高危明细需关注标志为 true');

  const d3 = data.details.find(d => d.detailId === 'DET-20260607-003003');
  assert(d3.riskLevel === 'INFO' || d3.riskLevel === 'LOW', '正常明细风险等级为 INFO/LOW');

  assert(!!data.auditNo, '存在审计编号');

  const auditsRes = await request('/admin/audits');
  const audits = auditsRes.body.data;
  assert(audits.length >= 1, '审计日志记录数 >= 1');

  const thisAudit = audits.find(a => a.auditNo === data.auditNo);
  assert(!!thisAudit, `审计日志中可找到当前记录 ${data.auditNo}`);
  assert(thisAudit.type === 'PROCESS_SUCCESS', '审计记录类型为 PROCESS_SUCCESS');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
