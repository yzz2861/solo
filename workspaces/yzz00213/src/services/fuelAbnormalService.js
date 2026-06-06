const { v4: uuidv4 } = require('uuid');
const store = require('../stores/memoryStore');
const {
  PROCESS_STATUS,
  RISK_LEVELS,
  NEXT_ACTIONS,
  RULE_TYPES,
  generateAuditNo,
  generateTraceId
} = require('../models/dataModels');

const REQUIRED_MASTER_FIELDS = ['vehicleId', 'vehiclePlate', 'vehicleType'];
const REQUIRED_APPLICATION_FIELDS = ['reportDate', 'fuelConsumption', 'mileage'];
const REQUIRED_THRESHOLD_FIELDS = ['maxFuelConsumptionPerKm', 'minMileage', 'maxIdleFuelRate'];

function validateRequiredFields(obj, requiredFields, prefix) {
  const missing = [];
  if (!obj) {
    return requiredFields.map(f => `${prefix}.${f}`);
  }
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(`${prefix}.${field}`);
    }
  }
  return missing;
}

function validateInput(masterData, application, thresholdConfig) {
  const missingFields = [];
  missingFields.push(...validateRequiredFields(masterData, REQUIRED_MASTER_FIELDS, 'masterData'));
  missingFields.push(...validateRequiredFields(application, REQUIRED_APPLICATION_FIELDS, 'application'));
  missingFields.push(...validateRequiredFields(thresholdConfig, REQUIRED_THRESHOLD_FIELDS, 'thresholdConfig'));
  return missingFields;
}

function checkDuplicate(vehicleId, reportDate, batchNo) {
  return store.findDuplicate(vehicleId, reportDate, batchNo);
}

function executeRules(masterData, application, evidence, historicalStatus, thresholdConfig) {
  const hitRules = [];
  const { fuelConsumption, mileage, idleFuel = 0, idleDuration = 0 } = application;
  const { maxFuelConsumptionPerKm, minMileage, maxIdleFuelRate, fuelLeakThreshold = 0.3 } = thresholdConfig;

  if (mileage > 0) {
    const fuelPerKm = fuelConsumption / mileage;
    if (fuelPerKm > maxFuelConsumptionPerKm) {
      hitRules.push({
        ruleType: RULE_TYPES.FUEL_CONSUMPTION_EXCEED,
        ruleName: '百公里油耗超标',
        riskLevel: RISK_LEVELS.HIGH,
        actualValue: parseFloat(fuelPerKm.toFixed(4)),
        threshold: maxFuelConsumptionPerKm,
        description: `百公里油耗 ${fuelPerKm.toFixed(2)}L 超过阈值 ${maxFuelConsumptionPerKm}L`
      });
    }
  }

  if (mileage < minMileage && fuelConsumption > 0) {
    hitRules.push({
      ruleType: RULE_TYPES.MILEAGE_ABNORMAL,
      ruleName: '里程异常偏低',
      riskLevel: RISK_LEVELS.MEDIUM,
      actualValue: mileage,
      threshold: minMileage,
      description: `行驶里程 ${mileage}km 低于阈值 ${minMileage}km，但有油耗记录`
    });
  }

  if (idleDuration > 0 && idleFuel > 0) {
    const idleFuelRate = idleFuel / idleDuration;
    if (idleFuelRate > maxIdleFuelRate) {
      hitRules.push({
        ruleType: RULE_TYPES.IDLE_FUEL_WASTE,
        ruleName: '怠速油耗过高',
        riskLevel: RISK_LEVELS.MEDIUM,
        actualValue: parseFloat(idleFuelRate.toFixed(4)),
        threshold: maxIdleFuelRate,
        description: `怠速油耗率 ${idleFuelRate.toFixed(2)}L/h 超过阈值 ${maxIdleFuelRate}L/h`
      });
    }
  }

  if (evidence && evidence.length > 0) {
    const leakEvidence = evidence.filter(e => e.evidenceType === 'FUEL_LEAK_REPORT' || e.evidenceType === 'OIL_STAIN_PHOTO');
    if (leakEvidence.length > 0 && fuelConsumption > 0) {
      const leakRatio = leakEvidence.length / evidence.length;
      if (leakRatio >= fuelLeakThreshold) {
        hitRules.push({
          ruleType: RULE_TYPES.FUEL_LEAK_SUSPECTED,
          ruleName: '疑似油品泄漏',
          riskLevel: RISK_LEVELS.HIGH,
          actualValue: leakEvidence.length,
          threshold: Math.ceil(evidence.length * fuelLeakThreshold),
          description: `发现 ${leakEvidence.length} 份漏油相关佐证材料，疑似油品泄漏`
        });
      }
    }
  }

  if (historicalStatus && historicalStatus.length > 0) {
    const recentAbnormal = historicalStatus.filter(h =>
      h.status === 'ABNORMAL' || h.status === 'RULE_HIT'
    ).length;
    if (recentAbnormal >= 3) {
      hitRules.push({
        ruleType: RULE_TYPES.ROUTE_DEVIATION,
        ruleName: '历史异常频繁',
        riskLevel: RISK_LEVELS.HIGH,
        actualValue: recentAbnormal,
        threshold: 3,
        description: `近 ${historicalStatus.length} 条历史记录中有 ${recentAbnormal} 条异常记录`
      });
    }
  }

  return hitRules;
}

function detectRuleConflict(hitRules) {
  const conflicts = [];
  const highRiskRules = hitRules.filter(r => r.riskLevel === RISK_LEVELS.HIGH);
  const mediumRiskRules = hitRules.filter(r => r.riskLevel === RISK_LEVELS.MEDIUM);

  if (highRiskRules.length > 1) {
    const ruleTypes = highRiskRules.map(r => r.ruleType).join(' + ');
    conflicts.push({
      conflictType: 'MULTIPLE_HIGH_RISK',
      description: `同时命中多个高风险规则: ${ruleTypes}`,
      involvedRules: highRiskRules.map(r => r.ruleType)
    });
  }

  const fuelExceed = hitRules.find(r => r.ruleType === RULE_TYPES.FUEL_CONSUMPTION_EXCEED);
  const mileageAbnormal = hitRules.find(r => r.ruleType === RULE_TYPES.MILEAGE_ABNORMAL);
  if (fuelExceed && mileageAbnormal) {
    conflicts.push({
      conflictType: 'FUEL_MILEAGE_CONTRADICTION',
      description: '油耗超标与里程偏低同时存在，需核实数据一致性',
      involvedRules: [RULE_TYPES.FUEL_CONSUMPTION_EXCEED, RULE_TYPES.MILEAGE_ABNORMAL]
    });
  }

  return conflicts;
}

function determineRiskLevel(hitRules) {
  if (hitRules.length === 0) return RISK_LEVELS.LOW;
  const levels = hitRules.map(r => r.riskLevel);
  if (levels.includes(RISK_LEVELS.HIGH)) return RISK_LEVELS.HIGH;
  if (levels.includes(RISK_LEVELS.MEDIUM)) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

function determineNextAction(processStatus, hitRules, conflicts) {
  switch (processStatus) {
    case PROCESS_STATUS.FIELD_MISSING:
      return NEXT_ACTIONS.SUPPLEMENT_INFO;
    case PROCESS_STATUS.DUPLICATE_SUBMISSION:
      return NEXT_ACTIONS.MERGE_RECORD;
    case PROCESS_STATUS.RULE_CONFLICT:
      return NEXT_ACTIONS.RESOLVE_CONFLICT;
    case PROCESS_STATUS.RULE_HIT:
      const highRiskCount = hitRules.filter(r => r.riskLevel === RISK_LEVELS.HIGH).length;
      if (highRiskCount >= 2) {
        return NEXT_ACTIONS.MANUAL_REVIEW;
      }
      return NEXT_ACTIONS.MANUAL_REVIEW;
    case PROCESS_STATUS.MANUAL_REVIEW:
      return NEXT_ACTIONS.MANUAL_REVIEW;
    default:
      return NEXT_ACTIONS.AUTO_APPROVE;
  }
}

function generateConclusion(processStatus, hitRules, conflicts, missingFields) {
  switch (processStatus) {
    case PROCESS_STATUS.FIELD_MISSING:
      return {
        conclusionType: 'DATA_INCOMPLETE',
        summary: '数据不完整，缺少必要字段',
        details: `缺失字段: ${missingFields.join(', ')}`,
        suggestion: '请补充完整缺失的字段信息后重新提交'
      };
    case PROCESS_STATUS.DUPLICATE_SUBMISSION:
      return {
        conclusionType: 'DUPLICATE_RECORD',
        summary: '重复提交记录',
        details: '同一车辆同一报告日期存在已处理的记录',
        suggestion: '请确认是否需要合并或忽略重复记录'
      };
    case PROCESS_STATUS.RULE_CONFLICT:
      return {
        conclusionType: 'RULE_CONFLICT',
        summary: '规则命中存在冲突',
        details: conflicts.map(c => c.description).join('; '),
        suggestion: '请人工介入核实并解决规则冲突'
      };
    case PROCESS_STATUS.RULE_HIT:
      const ruleNames = hitRules.map(r => r.ruleName).join('、');
      return {
        conclusionType: 'ABNORMAL_CONFIRMED',
        summary: `命中异常规则: ${ruleNames}`,
        details: hitRules.map(r => r.description).join('; '),
        suggestion: '请运营人员复核异常情况并采取相应措施'
      };
    case PROCESS_STATUS.PROCESSED:
      return {
        conclusionType: 'NORMAL',
        summary: '油耗数据正常',
        details: '未命中任何异常规则，数据在正常范围内',
        suggestion: '无需特殊处理，按正常流程归档'
      };
    default:
      return {
        conclusionType: 'PENDING',
        summary: '待处理',
        details: '记录已接收，等待处理',
        suggestion: '请等待系统处理完成'
      };
  }
}

function createHistoryEntry(recordId, fromStatus, toStatus, operator, reason, remark) {
  return {
    historyId: uuidv4(),
    recordId,
    fromStatus,
    toStatus,
    operator: operator || 'SYSTEM',
    reason,
    remark: remark || '',
    operateTime: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

function processSingleRecord(input, batchNo) {
  const { masterData, application, evidence, historicalStatus, thresholdConfig, operator } = input;

  const recordId = uuidv4();
  const auditNo = generateAuditNo();
  const traceId = generateTraceId();
  const submitTime = new Date().toISOString();

  const missingFields = validateInput(masterData, application, thresholdConfig);
  if (missingFields.length > 0) {
    const processStatus = PROCESS_STATUS.FIELD_MISSING;
    const conclusion = generateConclusion(processStatus, [], [], missingFields);
    const nextAction = determineNextAction(processStatus, [], []);

    const record = {
      recordId,
      auditNo,
      traceId,
      batchNo,
      submitTime,
      processStatus,
      masterData,
      application,
      evidence: evidence || [],
      historicalStatus: historicalStatus || [],
      thresholdConfig,
      hitRules: [],
      ruleConflicts: [],
      missingFields,
      riskLevel: RISK_LEVELS.LOW,
      riskTags: [],
      nextAction,
      conclusion,
      duplicateRecordId: null,
      operator: operator || null,
      updateTime: submitTime
    };

    store.saveRecord(record);
    const historyEntry = createHistoryEntry(
      recordId, null, processStatus, 'SYSTEM',
      '字段校验不通过', `缺失字段: ${missingFields.join(', ')}`
    );
    store.saveHistory(recordId, historyEntry);

    return buildResponse(record);
  }

  const duplicateRecord = checkDuplicate(masterData.vehicleId, application.reportDate, batchNo);
  if (duplicateRecord) {
    const processStatus = PROCESS_STATUS.DUPLICATE_SUBMISSION;
    const conclusion = generateConclusion(processStatus, [], [], []);
    const nextAction = determineNextAction(processStatus, [], []);

    const record = {
      recordId,
      auditNo,
      traceId,
      batchNo,
      submitTime,
      processStatus,
      masterData,
      application,
      evidence: evidence || [],
      historicalStatus: historicalStatus || [],
      thresholdConfig,
      hitRules: [],
      ruleConflicts: [],
      missingFields: [],
      riskLevel: RISK_LEVELS.LOW,
      riskTags: [],
      nextAction,
      conclusion,
      duplicateRecordId: duplicateRecord.recordId,
      operator: operator || null,
      updateTime: submitTime
    };

    store.saveRecord(record);
    const historyEntry = createHistoryEntry(
      recordId, null, processStatus, 'SYSTEM',
      '重复提交检测', `与记录 ${duplicateRecord.auditNo} 重复`
    );
    store.saveHistory(recordId, historyEntry);

    return buildResponse(record);
  }

  const hitRules = executeRules(masterData, application, evidence, historicalStatus, thresholdConfig);
  const conflicts = detectRuleConflict(hitRules);
  const riskLevel = determineRiskLevel(hitRules);
  const riskTags = buildRiskTags(hitRules, riskLevel);

  let processStatus;
  if (conflicts.length > 0) {
    processStatus = PROCESS_STATUS.RULE_CONFLICT;
  } else if (hitRules.length > 0) {
    processStatus = PROCESS_STATUS.RULE_HIT;
  } else {
    processStatus = PROCESS_STATUS.PROCESSED;
  }

  const conclusion = generateConclusion(processStatus, hitRules, conflicts, []);
  const nextAction = determineNextAction(processStatus, hitRules, conflicts);

  const record = {
    recordId,
    auditNo,
    traceId,
    batchNo,
    submitTime,
    processStatus,
    masterData,
    application,
    evidence: evidence || [],
    historicalStatus: historicalStatus || [],
    thresholdConfig,
    hitRules,
    ruleConflicts: conflicts,
    missingFields: [],
    riskLevel,
    riskTags,
    nextAction,
    conclusion,
    duplicateRecordId: null,
    operator: operator || null,
    updateTime: submitTime
  };

  store.saveRecord(record);

  let ruleReason = '规则引擎校验';
  if (hitRules.length > 0) {
    ruleReason = `命中 ${hitRules.length} 条规则`;
  } else {
    ruleReason = '未命中异常规则';
  }
  const historyEntry = createHistoryEntry(
    recordId, null, processStatus, 'SYSTEM',
    ruleReason,
    hitRules.length > 0 ? hitRules.map(r => r.ruleName).join('、') : '数据正常'
  );
  store.saveHistory(recordId, historyEntry);

  return buildResponse(record);
}

function buildRiskTags(hitRules, riskLevel) {
  const tags = [];
  tags.push({
    tagCode: `RISK_${riskLevel}`,
    tagName: riskLevel === RISK_LEVELS.HIGH ? '高风险' : riskLevel === RISK_LEVELS.MEDIUM ? '中风险' : '低风险',
    tagType: 'RISK_LEVEL'
  });

  for (const rule of hitRules) {
    tags.push({
      tagCode: rule.ruleType,
      tagName: rule.ruleName,
      tagType: 'RULE_HIT'
    });
  }

  return tags;
}

function buildResponse(record) {
  return {
    recordId: record.recordId,
    auditNo: record.auditNo,
    processStatus: record.processStatus,
    riskLevel: record.riskLevel,
    riskTags: record.riskTags,
    nextAction: record.nextAction,
    conclusion: record.conclusion,
    hitRules: record.hitRules,
    ruleConflicts: record.ruleConflicts,
    missingFields: record.missingFields,
    duplicateRecordId: record.duplicateRecordId,
    submitTime: record.submitTime,
    updateTime: record.updateTime
  };
}

module.exports = {
  processSingleRecord,
  validateInput,
  checkDuplicate,
  executeRules,
  detectRuleConflict,
  determineRiskLevel,
  determineNextAction,
  generateConclusion,
  createHistoryEntry,
  buildResponse
};
