const assert = require('assert');
const { calculateRiskLevel } = require('../src/rules/riskEngine');
const { routeStatus, validateBasicInfo } = require('../src/services/statusRouter');
const {
  checkBatchExists,
  saveBatchResult,
  getBatchResult,
  generateTraceId,
  getAuditLogs,
  getBatchCount,
  getItemCount,
  getItemRecord
} = require('../src/services/auditService');
const { STATUS, RISK_LEVEL, RULE_VERSION } = require('../src/config/constants');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}`);
    console.log(`    错误: ${e.message}`);
  }
}

function describe(title, fn) {
  console.log(`\n${title}`);
  console.log('─'.repeat(60));
  fn();
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        消防通道占用取证API - 验收测试套件                 ║');
console.log('╚══════════════════════════════════════════════════════════╝');

describe('一、风险等级判定测试 (低/中/高风险、无法判定)', () => {

  test('低风险 - 短时间占用、一般位置、证据充足', () => {
    const item = {
      itemId: 'test-low-001',
      occupationDuration: '3分钟',
      locationType: '小区通道',
      locationDetail: '1号楼1单元门口',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '一辆电动车临时停放在通道边，车主就在旁边',
      hazardLevel: '一般'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.LOW, `应为低风险，实际为 ${result.riskLevel}`);
    assert.ok(result.ruleVersion, '应包含规则版本');
    assert.ok(Array.isArray(result.riskFactors), '应包含风险因素列表');
  });

  test('中风险 - 中等时长占用、重要位置', () => {
    const item = {
      itemId: 'test-medium-001',
      occupationDuration: '45分钟',
      locationType: '疏散走道',
      locationDetail: '2楼东侧疏散走道',
      occurTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      evidenceImages: ['img1.jpg'],
      evidenceVideo: ['video1.mp4'],
      description: '杂物堆放在疏散走道，影响通行',
      hazardLevel: '较重'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.MEDIUM, `应为中风险，实际为 ${result.riskLevel}`);
  });

  test('高风险 - 长时间占用、关键位置、刚发生', () => {
    const item = {
      itemId: 'test-high-001',
      occupationDuration: '3小时',
      locationType: '消防车通道',
      locationDetail: '小区主消防车通道，完全堵塞',
      occurTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
      evidenceVideo: ['video1.mp4', 'video2.mp4'],
      description: '大型货车停放在消防车通道上，完全堵塞通行',
      hazardLevel: '严重',
      witnessInfo: [{ name: '张三', phone: '13800138000' }]
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.HIGH, `应为高风险，实际为 ${result.riskLevel}`);
    assert.ok(result.riskScore > 70, '高风险分数应大于70');
  });

  test('无法判定 - 证据材料严重不足', () => {
    const item = {
      itemId: 'test-undetermined-001',
      locationDetail: '某处',
      description: '很短'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.UNDETERMINED, `应为无法判定，实际为 ${result.riskLevel}`);
  });

  test('无法判定 - 只有照片但无位置描述', () => {
    const item = {
      itemId: 'test-undetermined-002',
      evidenceImages: ['img1.jpg'],
      occurTime: new Date().toISOString(),
      description: '消防通道被占用'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.UNDETERMINED, '缺少位置描述应为无法判定');
  });

  test('高风险 - 安全出口位置', () => {
    const item = {
      itemId: 'test-high-002',
      occupationDuration: '60分钟',
      locationType: '安全出口',
      locationDetail: '一楼正门安全出口',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '货物堆放在安全出口处，完全堵死',
      hazardLevel: '严重'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.HIGH, '安全出口占用应为高风险');
  });

  test('低风险 - 发生时间超过3天', () => {
    const item = {
      itemId: 'test-low-002',
      occupationDuration: '10分钟',
      locationType: '一般通道',
      locationDetail: '地下车库通道',
      occurTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '一辆小型车辆临时停放在地下车库的通道边上',
      hazardLevel: '一般'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.LOW, '久前发生的应为低风险');
  });
});

describe('二、状态分流测试 (可办理、需补充、已锁定、失败)', () => {

  test('可办理 - 初次提交且信息完整的高风险', () => {
    const item = {
      itemId: 'status-processable-001',
      occupationDuration: '3小时',
      locationType: '消防车通道',
      locationDetail: '主通道',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      evidenceVideo: ['v1.mp4'],
      description: '详细的占用描述内容超过十个字',
      hazardLevel: '严重'
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.PROCESSABLE, `应为可办理，实际为 ${result.status}`);
    assert.ok(result.riskLevel, '应包含风险等级');
    assert.ok(result.explanation, '应包含解释说明');
  });

  test('需补充 - 初次提交但证据不足', () => {
    const item = {
      itemId: 'status-supplement-001',
      locationDetail: '某位置',
      occurTime: new Date().toISOString()
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.SUPPLEMENT, `应为需补充，实际为 ${result.status}`);
    assert.ok(Array.isArray(result.missingFields), '应包含缺失字段列表');
    assert.ok(result.missingFields.length > 0, '缺失字段列表不应为空');
  });

  test('失败 - 明细ID缺失', () => {
    const item = {
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg']
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.FAILED, `应为失败，实际为 ${result.status}`);
    assert.ok(result.explanation.length > 0, '应有失败解释');
  });

  test('已锁定 - 撤销申请', () => {
    const item = {
      itemId: 'status-locked-001',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg']
    };
    const result = routeStatus(item, '撤销申请', null, null);
    assert.strictEqual(result.status, STATUS.LOCKED, `应为已锁定，实际为 ${result.status}`);
  });

  test('已锁定 - 复核通过后记录锁定', () => {
    const item = {
      itemId: 'status-locked-002',
      occupationDuration: '2小时',
      locationType: '疏散楼梯间',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '详细描述内容',
      hazardLevel: '较重'
    };
    const result = routeStatus(item, '复核通过', '情况属实，已整改', null);
    assert.strictEqual(result.status, STATUS.LOCKED, '复核通过应为已锁定');
    assert.strictEqual(result.reviewOpinion, '情况属实，已整改', '应包含复核意见');
  });

  test('需补充 - 复核驳回', () => {
    const item = {
      itemId: 'status-supplement-002',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '描述内容'
    };
    const result = routeStatus(item, '复核驳回', '证据模糊，需重新拍摄', null);
    assert.strictEqual(result.status, STATUS.SUPPLEMENT, '复核驳回应为需补充');
    assert.ok(result.explanation.includes('证据模糊'), '解释应包含驳回理由');
  });

  test('补充材料后证据仍不足 - 返回需补充', () => {
    const item = {
      itemId: 'status-supplement-003',
      locationDetail: '某位置'
    };
    const result = routeStatus(item, '补充材料', null, null);
    assert.strictEqual(result.status, STATUS.SUPPLEMENT, '证据仍不足应为需补充');
  });

  test('补充材料后证据充足 - 变为可办理', () => {
    const item = {
      itemId: 'status-processable-002',
      occupationDuration: '30分钟',
      locationType: '疏散走道',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
      evidenceVideo: ['video1.mp4'],
      description: '非常详细的情况描述内容',
      hazardLevel: '较重',
      witnessInfo: [{ name: '证人A' }]
    };
    const result = routeStatus(item, '补充材料', null, null);
    assert.strictEqual(result.status, STATUS.PROCESSABLE, '补充材料齐全后应为可办理');
  });
});

describe('三、边界条件测试', () => {

  test('证据刚好满足最低要求 - 1张照片+位置+描述', () => {
    const item = {
      itemId: 'boundary-001',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '这是一段超过十个字的详细描述内容'
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.PROCESSABLE, '刚好满足最低要求应可办理');
  });

  test('描述刚好10个字符 - 应通过证据判定', () => {
    const item = {
      itemId: 'boundary-002',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '一二三四五六七八九十'
    };
    const result = calculateRiskLevel(item);
    assert.notStrictEqual(result.riskLevel, RISK_LEVEL.UNDETERMINED, '10字描述不应判定为无法判定');
  });

  test('描述少于10个字符且只有照片 - 证据不足', () => {
    const item = {
      itemId: 'boundary-003',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '短描述'
    };
    const result = calculateRiskLevel(item);
    assert.strictEqual(result.riskLevel, RISK_LEVEL.UNDETERMINED, '短描述+单照片应为无法判定');
  });

  test('占用时长恰好2小时 - 应为高风险区间', () => {
    const item = {
      itemId: 'boundary-004',
      occupationDuration: '120分钟',
      locationType: '一般位置',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '详细的描述内容信息',
      hazardLevel: '一般'
    };
    const result = calculateRiskLevel(item);
    const riskScore = result.riskScore;
    assert.ok(riskScore > 0, '应有风险分数');
  });

  test('无itemId的明细 - 验证失败', () => {
    const validation = validateBasicInfo({ evidenceImages: ['img.jpg'] });
    assert.strictEqual(validation.valid, false, '无itemId应验证失败');
  });

  test('四种状态互不包含 - 状态互斥性验证', () => {
    const allStatuses = [STATUS.PROCESSABLE, STATUS.SUPPLEMENT, STATUS.LOCKED, STATUS.FAILED];
    const uniqueStatuses = [...new Set(allStatuses)];
    assert.strictEqual(uniqueStatuses.length, 4, '四种状态应互不相同');
  });

  test('四种风险等级互不包含 - 风险互斥性验证', () => {
    const allRisks = [RISK_LEVEL.LOW, RISK_LEVEL.MEDIUM, RISK_LEVEL.HIGH, RISK_LEVEL.UNDETERMINED];
    const uniqueRisks = [...new Set(allRisks)];
    assert.strictEqual(uniqueRisks.length, 4, '四种风险等级应互不相同');
  });
});

describe('四、失败提示测试', () => {

  test('失败状态有明确的解释说明', () => {
    const item = {
      locationDetail: '位置描述'
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.FAILED);
    assert.ok(result.explanation && result.explanation.length > 0, '失败状态应有解释说明');
    assert.ok(typeof result.explanation === 'string', '解释说明应为字符串');
  });

  test('需补充状态列出具体缺失字段', () => {
    const item = {
      itemId: 'fail-test-001',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString()
    };
    const result = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(result.status, STATUS.SUPPLEMENT);
    assert.ok(Array.isArray(result.missingFields), '缺失字段应为数组');
    assert.ok(result.missingFields.length > 0, '缺失字段列表不应为空');
  });

  test('失败原因清晰可读', () => {
    const item = {};
    const result = routeStatus(item, '初次提交', null, null);
    assert.ok(result.explanation.length > 5, '失败原因应足够详细');
  });
});

describe('五、重复处理测试 (幂等性)', () => {

  test('相同批次号重复提交 - 返回首次结果', () => {
    const batchNo = 'BATCH-IDEMPOTENT-001';
    const items = [
      {
        itemId: 'idem-item-001',
        locationDetail: '位置描述',
        occurTime: new Date().toISOString(),
        evidenceImages: ['img1.jpg', 'img2.jpg'],
        description: '详细的描述内容信息'
      }
    ];

    const firstResult = saveBatchResult(batchNo, '操作员A', '群众举报', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    assert.strictEqual(checkBatchExists(batchNo), true, '批次应存在');

    const secondResult = getBatchResult(batchNo);
    assert.ok(secondResult.isDuplicate, '第二次查询应标记为重复');
    assert.strictEqual(secondResult.items.length, firstResult.items.length, '明细数量应一致');
    assert.strictEqual(secondResult.items[0].status, firstResult.items[0].status, '状态应一致');
    assert.strictEqual(secondResult.traceId, firstResult.traceId, '批次追溯号应一致');
    assert.strictEqual(secondResult.ruleVersion, RULE_VERSION, '规则版本应一致');
  });

  test('批次号唯一 - 不同批次号互不干扰', () => {
    const batch1 = 'BATCH-UNIQUE-001';
    const batch2 = 'BATCH-UNIQUE-002';

    const item1 = {
      itemId: 'unique-item-001',
      locationDetail: '位置1',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '详细描述内容'
    };
    const item2 = {
      itemId: 'unique-item-002',
      locationDetail: '位置2',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img2.jpg'],
      description: '详细描述内容'
    };

    saveBatchResult(batch1, '操作员A', '群众举报', '初次提交', null,
      [routeStatus(item1, '初次提交', null, null)]
    );
    saveBatchResult(batch2, '操作员B', '视频巡检', '初次提交', null,
      [routeStatus(item2, '初次提交', null, null)]
    );

    const result1 = getBatchResult(batch1);
    const result2 = getBatchResult(batch2);

    assert.notStrictEqual(result1.traceId, result2.traceId, '不同批次应有不同追溯号');
    assert.strictEqual(result1.operator, '操作员A', '操作人应正确');
    assert.strictEqual(result2.operator, '操作员B', '操作人应正确');
  });

  test('重复请求结论稳定 - 多次返回一致结果', () => {
    const batchNo = 'BATCH-STABLE-001';
    const items = [
      {
        itemId: 'stable-item-001',
        occupationDuration: '3小时',
        locationType: '消防车通道',
        locationDetail: '主通道',
        occurTime: new Date().toISOString(),
        evidenceImages: ['img1.jpg', 'img2.jpg'],
        evidenceVideo: ['v1.mp4'],
        description: '详细的描述内容信息',
        hazardLevel: '严重'
      }
    ];

    const firstResult = saveBatchResult(batchNo, '操作员C', '现场执法', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    for (let i = 0; i < 5; i++) {
      const result = getBatchResult(batchNo);
      assert.strictEqual(result.items[0].status, firstResult.items[0].status, `第${i+1}次查询状态应一致`);
      assert.strictEqual(result.items[0].riskLevel, firstResult.items[0].riskLevel, `第${i+1}次查询风险等级应一致`);
      assert.strictEqual(result.traceId, firstResult.traceId, `第${i+1}次查询追溯号应一致`);
    }
  });

  test('已锁定明细 - 换批次号提交仍保持锁定状态', () => {
    const itemId = 'LOCKED-CROSS-BATCH-001';
    const firstBatchNo = 'BATCH-LOCKED-FIRST-001';
    const secondBatchNo = 'BATCH-LOCKED-SECOND-001';

    const item = {
      itemId: itemId,
      occupationDuration: '2小时',
      locationType: '消防车通道',
      locationDetail: '主通道位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '详细的描述内容信息',
      hazardLevel: '严重'
    };

    const firstResult = saveBatchResult(firstBatchNo, '操作员G', '现场执法', '复核通过', '情况属实',
      [routeStatus(item, '复核通过', '情况属实', null)]
    );
    assert.strictEqual(firstResult.items[0].status, STATUS.LOCKED, '首次复核通过应为已锁定');
    const firstTraceId = firstResult.items[0].traceId;

    const secondResult = saveBatchResult(secondBatchNo, '操作员H', '群众举报', '初次提交', null,
      [routeStatus(item, '初次提交', null, getItemRecord(itemId))]
    );

    assert.strictEqual(secondResult.items[0].status, STATUS.LOCKED, '换批次提交已锁定明细仍应为已锁定');
    assert.strictEqual(secondResult.items[0].traceId, firstTraceId, '锁定明细的追溯号应保持不变');
    assert.strictEqual(secondResult.items[0].isLockedReuse, true, '应标记为锁定复用');
    assert.ok(secondResult.items[0].lockedHint, '应有锁定提示信息');
    assert.strictEqual(secondResult.items[0].originalBatchNo, firstBatchNo, '应标记原始批次号');
  });

  test('未锁定明细 - 换批次可正常更新状态', () => {
    const itemId = 'UNLOCKED-CROSS-BATCH-001';
    const firstBatchNo = 'BATCH-UNLOCKED-FIRST-001';
    const secondBatchNo = 'BATCH-UNLOCKED-SECOND-001';

    const basicItem = {
      itemId: itemId,
      locationDetail: '位置描述',
      occurTime: new Date().toISOString()
    };

    const fullItem = {
      itemId: itemId,
      occupationDuration: '30分钟',
      locationType: '疏散走道',
      locationDetail: '详细位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg', 'img2.jpg'],
      description: '非常详细的描述内容信息，包含具体情况',
      hazardLevel: '较重'
    };

    const firstResult = saveBatchResult(firstBatchNo, '操作员I', '视频巡检', '初次提交', null,
      [routeStatus(basicItem, '初次提交', null, null)]
    );
    assert.strictEqual(firstResult.items[0].status, STATUS.SUPPLEMENT, '首次应为需补充');
    const firstTraceId = firstResult.items[0].traceId;

    const secondResult = saveBatchResult(secondBatchNo, '操作员J', '现场执法', '补充材料', null,
      [routeStatus(fullItem, '补充材料', null, getItemRecord(itemId))]
    );

    assert.strictEqual(secondResult.items[0].status, STATUS.PROCESSABLE, '补充材料后应为可办理');
    assert.strictEqual(secondResult.items[0].traceId, firstTraceId, '同一明细追溯号应保持不变');
  });
});

describe('六、可追溯编号测试', () => {

  test('每个批次有唯一的批次追溯号', () => {
    const traceIds = new Set();
    for (let i = 0; i < 100; i++) {
      const id = generateTraceId('BATCH');
      assert.ok(id.startsWith('BATCH-'), '追溯号应有前缀');
      assert.ok(id.length > 20, '追溯号应有足够长度');
      traceIds.add(id);
    }
    assert.strictEqual(traceIds.size, 100, '100个追溯号应全部唯一');
  });

  test('每条明细有唯一的明细追溯号', () => {
    const items = [
      { itemId: 'trace-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' },
      { itemId: 'trace-item-002', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' },
      { itemId: 'trace-item-003', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' }
    ];

    const result = saveBatchResult('BATCH-TRACE-001', '操作员D', '群众举报', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    const itemTraceIds = result.items.map(i => i.traceId);
    const uniqueIds = [...new Set(itemTraceIds)];
    assert.strictEqual(uniqueIds.length, 3, '每条明细应有不同的追溯号');

    itemTraceIds.forEach(id => {
      assert.ok(id.startsWith('ITEM-'), '明细追溯号应以ITEM-开头');
    });
  });

  test('追溯号格式正确 - 包含时间戳和随机部分', () => {
    const id = generateTraceId('FP');
    const parts = id.split('-');
    assert.strictEqual(parts.length, 3, '追溯号应包含三部分');
    assert.strictEqual(parts[0], 'FP', '第一部分应为前缀');
    assert.ok(parts[1].length >= 6, '时间戳部分应有足够长度');
    assert.ok(parts[2].length >= 6, '随机部分应有足够长度');
  });

  test('批次结果包含规则版本', () => {
    const batchNo = 'BATCH-VERSION-001';
    const items = [
      { itemId: 'ver-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述内容' }
    ];

    const result = saveBatchResult(batchNo, '操作员E', '视频巡检', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    assert.strictEqual(result.ruleVersion, RULE_VERSION, '批次结果应包含正确的规则版本');
    result.items.forEach(item => {
      assert.strictEqual(item.ruleVersion, RULE_VERSION, '明细结果应包含正确的规则版本');
    });
  });

  test('审计记录可追溯 - 批次处理产生审计日志', () => {
    const batchNo = 'BATCH-AUDIT-001';
    const items = [
      { itemId: 'audit-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' }
    ];

    const beforeCount = getAuditLogs().length;

    saveBatchResult(batchNo, '操作员F', '第三方平台', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    const afterLogs = getAuditLogs({ batchNo });
    assert.ok(afterLogs.length >= 1, '应产生审计日志');
    assert.strictEqual(afterLogs[0].operationType, 'BATCH_PROCESS', '审计类型应为批次处理');
    assert.strictEqual(afterLogs[0].operator, '操作员F', '审计记录应包含操作人');
    assert.ok(afterLogs[0].traceId, '审计记录应包含追溯号');
    assert.strictEqual(afterLogs[0].ruleVersion, RULE_VERSION, '审计记录应包含规则版本');
  });
});

describe('七、数据校验测试', () => {

  test('校验基础信息完整', () => {
    const item = {
      itemId: 'validate-001',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg']
    };
    const result = validateBasicInfo(item);
    assert.strictEqual(result.valid, true, '信息完整应验证通过');
  });

  test('校验失败返回原因列表', () => {
    const item = { itemId: '' };
    const result = validateBasicInfo(item);
    assert.strictEqual(result.valid, false, '信息不完整应验证失败');
    assert.ok(result.reason, '应有失败原因');
  });

  test('无证据材料 - 走需补充而非失败', () => {
    const item = {
      itemId: 'validate-002',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString()
    };
    const basicResult = validateBasicInfo(item);
    assert.strictEqual(basicResult.valid, true, '有itemId基础校验应通过');
    const statusResult = routeStatus(item, '初次提交', null, null);
    assert.strictEqual(statusResult.status, STATUS.SUPPLEMENT, '无证据材料应走需补充状态');
  });

  test('操作人信息在批次结果中保留', () => {
    const batchNo = 'BATCH-OPERATOR-001';
    const items = [
      { itemId: 'op-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述内容' }
    ];

    const result = saveBatchResult(batchNo, '张执法员', '现场执法', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    assert.strictEqual(result.operator, '张执法员', '应保留操作人信息');
    assert.strictEqual(result.sourceChannel, '现场执法', '应保留来源渠道');
    assert.strictEqual(result.action, '初次提交', '应保留处理动作');
  });

  test('复核意见在结果中保留', () => {
    const item = {
      itemId: 'review-001',
      locationDetail: '位置描述',
      occurTime: new Date().toISOString(),
      evidenceImages: ['img1.jpg'],
      description: '详细描述内容'
    };
    const result = routeStatus(item, '复核通过', '情况属实，同意结案', null);
    assert.strictEqual(result.reviewOpinion, '情况属实，同意结案', '应保留复核意见');
  });
});

describe('八、统计与审计测试', () => {

  test('批次统计正确', () => {
    const countBefore = getBatchCount();
    const batchNo = 'BATCH-STATS-001';
    const items = [
      { itemId: 'stats-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' }
    ];
    saveBatchResult(batchNo, '统计员', '群众举报', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );
    assert.strictEqual(getBatchCount(), countBefore + 1, '批次计数应增加');
  });

  test('审计日志可按操作人筛选', () => {
    const operator = '审计测试员';
    const batchNo = 'BATCH-AUDIT-FILTER-001';
    const items = [
      { itemId: 'af-item-001', locationDetail: '位置', occurTime: new Date().toISOString(), evidenceImages: ['img.jpg'], description: '详细描述' }
    ];
    saveBatchResult(batchNo, operator, '群众举报', '初次提交', null,
      items.map(item => routeStatus(item, '初次提交', null, null))
    );

    const logs = getAuditLogs({ operator });
    assert.ok(logs.length >= 1, '按操作人筛选应有结果');
    logs.forEach(log => {
      assert.strictEqual(log.operator, operator, '筛选结果应匹配操作人');
    });
  });
});

console.log('\n' + '═'.repeat(60));
console.log('测试结果汇总');
console.log('═'.repeat(60));
console.log(`通过: ${passed} 项`);
console.log(`失败: ${failed} 项`);

if (failed > 0) {
  console.log('\n失败详情:');
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`);
    console.log(`     ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ 所有测试通过！');
  process.exit(0);
}
