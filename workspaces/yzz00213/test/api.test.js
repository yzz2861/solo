const http = require('http');
const { startServerWithFallback } = require('../src/app');

let server = null;
let BASE_OPTIONS = null;

function httpRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const options = {
      ...BASE_OPTIONS,
      path: `/api/fuel-abnormal${path}`,
      method
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('  环卫车辆油耗异常API - 综合测试');
  console.log('='.repeat(60));
  console.log();

  console.log('▶ 正在启动测试服务...');
  try {
    const result = await startServerWithFallback(3000, '127.0.0.1');
    server = result.server;
    BASE_OPTIONS = {
      hostname: result.host,
      port: result.port,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    console.log(`  测试服务已启动: http://${result.host}:${result.port}`);
    console.log();
  } catch (err) {
    console.error('  ✗ 测试服务启动失败:', err.message);
    process.exit(1);
  }

  const testResults = [];
  let testStatusCheckRecordId = null;

  try {
    console.log('【场景1】正常记录 - 油耗正常');
    const normalResult = await testNormalRecord();
    testResults.push({ name: '正常记录', passed: normalResult.passed, detail: normalResult.detail });
    console.log(normalResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景2】缺字段 - 字段校验');
    const missingResult = await testMissingFields();
    testResults.push({ name: '缺字段', passed: missingResult.passed, detail: missingResult.detail });
    console.log(missingResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景3】规则命中 - 油耗超标');
    const ruleHitResult = await testRuleHit();
    testResults.push({ name: '规则命中', passed: ruleHitResult.passed, detail: ruleHitResult.detail });
    console.log(ruleHitResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景4】规则冲突 - 多规则冲突');
    const conflictResult = await testRuleConflict();
    testResults.push({ name: '规则冲突', passed: conflictResult.passed, detail: conflictResult.detail });
    console.log(conflictResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景5】重复提交 - 同一车辆同一日期');
    const duplicateResult = await testDuplicateSubmission();
    testResults.push({ name: '重复提交', passed: duplicateResult.passed, detail: duplicateResult.detail });
    console.log(duplicateResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景6】批量处理');
    const batchResult = await testBatchProcess();
    testResults.push({ name: '批量处理', passed: batchResult.passed, detail: batchResult.detail });
    console.log(batchResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景7】状态查询');
    const statusResult = await testStatusCheck();
    testStatusCheckRecordId = statusResult.recordId;
    testResults.push({ name: '状态查询', passed: statusResult.passed, detail: statusResult.detail });
    console.log(statusResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景8】人工复核');
    const reviewResult = await testManualReview();
    testResults.push({ name: '人工复核', passed: reviewResult.passed, detail: reviewResult.detail });
    console.log(reviewResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景9】导出结果与统计');
    const exportResult = await testExport();
    testResults.push({ name: '导出结果', passed: exportResult.passed, detail: exportResult.detail });
    console.log(exportResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景10】历史轨迹');
    const trajectoryResult = await testTrajectory(testStatusCheckRecordId);
    testResults.push({ name: '历史轨迹', passed: trajectoryResult.passed, detail: trajectoryResult.detail });
    console.log(trajectoryResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

    console.log('【场景11】健康检查接口');
    const healthResult = await testHealthCheck();
    testResults.push({ name: '健康检查', passed: healthResult.passed, detail: healthResult.detail });
    console.log(healthResult.passed ? '  ✓ 通过' : '  ✗ 失败');
    console.log();

  } catch (error) {
    console.error('测试执行出错:', error.message);
    console.error(error.stack);
  }

  console.log('='.repeat(60));
  console.log('  测试结果汇总');
  console.log('='.repeat(60));
  const passedCount = testResults.filter(r => r.passed).length;
  console.log(`  通过: ${passedCount}/${testResults.length}`);
  for (const result of testResults) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.name}: ${result.detail}`);
  }
  console.log('='.repeat(60));

  if (server) {
    server.close();
  }

  const allPassed = passedCount === testResults.length;
  process.exit(allPassed ? 0 : 1);
}

async function testHealthCheck() {
  return new Promise((resolve) => {
    const options = {
      ...BASE_OPTIONS,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ok = json.status === 'OK' && json.service === 'sanitation-vehicle-fuel-api';
          resolve({
            passed: ok,
            detail: ok ? `服务:${json.service}, 版本:${json.version}` : '健康检查返回异常'
          });
        } catch (e) {
          resolve({ passed: false, detail: '响应解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ passed: false, detail: e.message });
    });

    req.end();
  });
}

async function testNormalRecord() {
  const records = [{
    masterData: {
      vehicleId: 'VH001',
      vehiclePlate: '京A12345',
      vehicleType: '洒水车'
    },
    application: {
      reportDate: '2025-01-15',
      fuelConsumption: 25,
      mileage: 100,
      idleFuel: 2,
      idleDuration: 1
    },
    evidence: [
      { evidenceType: 'FUEL_RECEIPT', evidenceUrl: 'http://example.com/receipt1.jpg', uploadTime: '2025-01-15T10:00:00Z' }
    ],
    historicalStatus: [
      { date: '2025-01-10', status: 'NORMAL' },
      { date: '2025-01-11', status: 'NORMAL' },
      { date: '2025-01-12', status: 'NORMAL' }
    ]
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const data = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-NORMAL-001', records, thresholdConfig });

    if (!data.success) return { passed: false, detail: '接口返回失败: ' + data.message };

    const result = data.data.results[0];
    const isProcessed = result.processStatus === 'PROCESSED';
    const hasConclusion = result.conclusion && result.conclusion.conclusionType === 'NORMAL';
    const hasAuditNo = !!result.auditNo;

    const passed = isProcessed && hasConclusion && hasAuditNo;
    return {
      passed,
      detail: passed
        ? `审计号:${result.auditNo}, 状态:${result.processStatus}`
        : `状态:${result.processStatus}, 结论:${result.conclusion?.conclusionType}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testMissingFields() {
  const records = [{
    masterData: {
      vehicleId: 'VH002',
      vehiclePlate: '京B67890'
    },
    application: {
      reportDate: '2025-01-16',
      fuelConsumption: 30
    },
    evidence: [],
    historicalStatus: []
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5
  };

  try {
    const data = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-MISSING-001', records, thresholdConfig });

    if (!data.success) return { passed: false, detail: '接口返回失败: ' + data.message };

    const result = data.data.results[0];
    const isFieldMissing = result.processStatus === 'FIELD_MISSING';
    const hasMissingFields = result.missingFields && result.missingFields.length > 0;
    const nextActionCorrect = result.nextAction === 'SUPPLEMENT_INFO';

    const passed = isFieldMissing && hasMissingFields && nextActionCorrect;
    return {
      passed,
      detail: passed
        ? `缺失${result.missingFields.length}个字段，动作:${result.nextAction}`
        : `状态:${result.processStatus}, 缺失字段:${result.missingFields?.length || 0}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testRuleHit() {
  const records = [{
    masterData: {
      vehicleId: 'VH003',
      vehiclePlate: '京C11111',
      vehicleType: '垃圾清运车'
    },
    application: {
      reportDate: '2025-01-17',
      fuelConsumption: 500,
      mileage: 100,
      idleFuel: 10,
      idleDuration: 2
    },
    evidence: [
      { evidenceType: 'FUEL_RECEIPT', evidenceUrl: 'http://example.com/receipt3.jpg', uploadTime: '2025-01-17T10:00:00Z' }
    ],
    historicalStatus: [
      { date: '2025-01-14', status: 'NORMAL' }
    ]
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const data = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-RULEHIT-001', records, thresholdConfig });

    if (!data.success) return { passed: false, detail: '接口返回失败: ' + data.message };

    const result = data.data.results[0];
    const isRuleHit = result.processStatus === 'RULE_HIT';
    const hasHitRules = result.hitRules && result.hitRules.length > 0;
    const hasRiskLevel = result.riskLevel === 'HIGH' || result.riskLevel === 'MEDIUM';
    const hasRiskTags = result.riskTags && result.riskTags.length > 0;

    const passed = isRuleHit && hasHitRules && hasRiskLevel && hasRiskTags;
    return {
      passed,
      detail: passed
        ? `命中${result.hitRules.length}条规则，风险:${result.riskLevel}`
        : `状态:${result.processStatus}, 规则数:${result.hitRules?.length || 0}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testRuleConflict() {
  const records = [{
    masterData: {
      vehicleId: 'VH004',
      vehiclePlate: '京D22222',
      vehicleType: '洗扫车'
    },
    application: {
      reportDate: '2025-01-18',
      fuelConsumption: 500,
      mileage: 10,
      idleFuel: 5,
      idleDuration: 1
    },
    evidence: [
      { evidenceType: 'FUEL_LEAK_REPORT', evidenceUrl: 'http://example.com/leak.jpg', uploadTime: '2025-01-18T10:00:00Z' },
      { evidenceType: 'OIL_STAIN_PHOTO', evidenceUrl: 'http://example.com/stain.jpg', uploadTime: '2025-01-18T10:05:00Z' },
      { evidenceType: 'FUEL_RECEIPT', evidenceUrl: 'http://example.com/receipt4.jpg', uploadTime: '2025-01-18T10:00:00Z' }
    ],
    historicalStatus: [
      { date: '2025-01-15', status: 'ABNORMAL' },
      { date: '2025-01-16', status: 'RULE_HIT' },
      { date: '2025-01-17', status: 'ABNORMAL' }
    ]
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const data = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-CONFLICT-001', records, thresholdConfig });

    if (!data.success) return { passed: false, detail: '接口返回失败: ' + data.message };

    const result = data.data.results[0];
    const hasConflicts = result.ruleConflicts && result.ruleConflicts.length > 0;
    const nextActionCorrect = result.nextAction === 'RESOLVE_CONFLICT';

    const passed = hasConflicts && nextActionCorrect;
    return {
      passed,
      detail: passed
        ? `冲突${result.ruleConflicts.length}个，动作:${result.nextAction}`
        : `状态:${result.processStatus}, 冲突数:${result.ruleConflicts?.length || 0}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testDuplicateSubmission() {
  const vehicleId = 'VH005';
  const reportDate = '2025-01-19';

  const records1 = [{
    masterData: {
      vehicleId,
      vehiclePlate: '京E33333',
      vehicleType: '洒水车'
    },
    application: {
      reportDate,
      fuelConsumption: 30,
      mileage: 80
    },
    evidence: [],
    historicalStatus: []
  }];

  const records2 = [{
    masterData: {
      vehicleId,
      vehiclePlate: '京E33333',
      vehicleType: '洒水车'
    },
    application: {
      reportDate,
      fuelConsumption: 35,
      mileage: 85
    },
    evidence: [],
    historicalStatus: []
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-DUP-FIRST', records: records1, thresholdConfig });

    const data2 = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-DUP-SECOND', records: records2, thresholdConfig });

    if (!data2.success) return { passed: false, detail: '第二次提交接口返回失败' };

    const result = data2.data.results[0];
    const isDuplicate = result.processStatus === 'DUPLICATE_SUBMISSION';
    const hasDuplicateId = !!result.duplicateRecordId;
    const nextActionCorrect = result.nextAction === 'MERGE_RECORD';

    const passed = isDuplicate && hasDuplicateId && nextActionCorrect;
    return {
      passed,
      detail: passed
        ? `检测到重复，原记录ID:${result.duplicateRecordId?.substring(0, 8)}...`
        : `状态:${result.processStatus}, 重复记录ID:${result.duplicateRecordId || '无'}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testBatchProcess() {
  const records = [
    {
      masterData: { vehicleId: 'VB001', vehiclePlate: '京F00001', vehicleType: '洒水车' },
      application: { reportDate: '2025-01-20', fuelConsumption: 20, mileage: 100 },
      evidence: [],
      historicalStatus: []
    },
    {
      masterData: { vehicleId: 'VB002', vehiclePlate: '京F00002' },
      application: { reportDate: '2025-01-20' },
      evidence: [],
      historicalStatus: []
    },
    {
      masterData: { vehicleId: 'VB003', vehiclePlate: '京F00003', vehicleType: '洗扫车' },
      application: { reportDate: '2025-01-20', fuelConsumption: 600, mileage: 100 },
      evidence: [],
      historicalStatus: []
    }
  ];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const data = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-BATCH-001', records, thresholdConfig });

    if (!data.success) return { passed: false, detail: '接口返回失败: ' + data.message };

    const totalCorrect = data.data.totalCount === 3;
    const hasSummary = !!data.data.statusSummary;
    const multipleStatuses = Object.keys(data.data.statusSummary).length > 1;

    const passed = totalCorrect && hasSummary && multipleStatuses;
    return {
      passed,
      detail: passed
        ? `共${data.data.totalCount}条，成功${data.data.successCount}条，状态:${Object.keys(data.data.statusSummary).join(',')}`
        : `总数:${data.data.totalCount}, 成功:${data.data.successCount}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testStatusCheck() {
  const records = [{
    masterData: { vehicleId: 'VS001', vehiclePlate: '京G00001', vehicleType: '洒水车' },
    application: { reportDate: '2025-01-21', fuelConsumption: 25, mileage: 90 },
    evidence: [],
    historicalStatus: []
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const createData = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-STATUS-001', records, thresholdConfig });

    const recordId = createData.data.results[0].recordId;
    const auditNo = createData.data.results[0].auditNo;

    const statusData = await httpRequest(`/record/${recordId}/status`, 'GET');
    const auditData = await httpRequest(`/record/audit/${auditNo}`, 'GET');

    const statusOk = statusData.success && statusData.data.recordId === recordId;
    const auditOk = auditData.success && auditData.data.auditNo === auditNo;

    const passed = statusOk && auditOk;
    return {
      passed,
      recordId,
      detail: passed
        ? `记录ID查询:${recordId.substring(0, 8)}..., 审计号:${auditNo}`
        : `状态查询:${statusOk}, 审计号查询:${auditOk}`
    };
  } catch (error) {
    return { passed: false, recordId: null, detail: error.message };
  }
}

async function testManualReview() {
  const records = [{
    masterData: { vehicleId: 'VR001', vehiclePlate: '京H00001', vehicleType: '垃圾清运车' },
    application: { reportDate: '2025-01-22', fuelConsumption: 400, mileage: 100 },
    evidence: [],
    historicalStatus: []
  }];

  const thresholdConfig = {
    maxFuelConsumptionPerKm: 3.5,
    minMileage: 50,
    maxIdleFuelRate: 3,
    fuelLeakThreshold: 0.3
  };

  try {
    const createData = await httpRequest('/batch/process', 'POST', { batchNo: 'TEST-REVIEW-001', records, thresholdConfig });

    const recordId = createData.data.results[0].recordId;

    const reviewData = await httpRequest(`/record/${recordId}/review`, 'POST', {
      reviewResult: 'APPROVE',
      reviewComment: '经核实，该车辆确实存在油耗异常情况',
      operator: '张运营'
    });

    const reviewOk = reviewData.success && reviewData.currentStatus === 'PROCESSED';

    const detailData = await httpRequest(`/record/${recordId}/detail`, 'GET');
    const hasHistories = detailData.data && detailData.data.histories && detailData.data.histories.length >= 2;

    const passed = reviewOk && hasHistories;
    return {
      passed,
      detail: passed
        ? `复核后状态:${reviewData.currentStatus}, 历史记录:${detailData.data.histories?.length || 0}条`
        : `复核成功:${reviewOk}, 历史记录:${hasHistories}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testExport() {
  try {
    const jsonData = await httpRequest('/batch/TEST-BATCH-001/export?format=JSON', 'GET');
    const statsData = await httpRequest('/batch/TEST-BATCH-001/statistics', 'GET');

    const exportOk = jsonData.success && jsonData.recordCount > 0;
    const statsOk = statsData.success && statsData.totalRecords > 0;

    const passed = exportOk && statsOk;
    return {
      passed,
      detail: passed
        ? `导出${jsonData.recordCount}条，统计${statsData.totalRecords}条，异常率:${(statsData.abnormalRate * 100).toFixed(1)}%`
        : `导出:${exportOk}, 统计:${statsOk}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

async function testTrajectory(recordId) {
  try {
    if (!recordId) {
      return { passed: false, detail: '缺少测试记录ID' };
    }

    const data = await httpRequest(`/record/${recordId}/trajectory`, 'GET');

    const hasTimeline = data.success && data.timeline && data.timeline.length > 0;
    const hasTraceId = data.timeline && data.timeline[0]?.traceId;

    const passed = hasTimeline && hasTraceId;
    return {
      passed,
      detail: passed
        ? `轨迹${data.timeline.length}条，含traceId:${data.timeline[0].traceId.substring(0, 8)}...`
        : `成功:${data.success}, 轨迹数:${data.timeline?.length || 0}`
    };
  } catch (error) {
    return { passed: false, detail: error.message };
  }
}

runTests();
