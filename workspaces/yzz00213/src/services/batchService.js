const { v4: uuidv4 } = require('uuid');
const store = require('../stores/memoryStore');
const fuelAbnormalService = require('./fuelAbnormalService');
const { PROCESS_STATUS } = require('../models/dataModels');

function processBatch(batchData) {
  const { batchNo, records, operator, thresholdConfig } = batchData;
  const actualBatchNo = batchNo || `BATCH-${Date.now()}`;

  const results = [];
  let successCount = 0;
  let failCount = 0;
  const statusSummary = {};

  for (const recordInput of records) {
    try {
      const input = {
        masterData: recordInput.masterData,
        application: recordInput.application,
        evidence: recordInput.evidence,
        historicalStatus: recordInput.historicalStatus,
        thresholdConfig: recordInput.thresholdConfig || thresholdConfig,
        operator: operator || recordInput.operator
      };

      const result = fuelAbnormalService.processSingleRecord(input, actualBatchNo);
      results.push({
        success: true,
        ...result
      });

      successCount++;
      statusSummary[result.processStatus] = (statusSummary[result.processStatus] || 0) + 1;
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        recordInput: {
          vehicleId: recordInput.masterData?.vehicleId,
          vehiclePlate: recordInput.masterData?.vehiclePlate
        }
      });
      failCount++;
    }
  }

  return {
    batchNo: actualBatchNo,
    totalCount: records.length,
    successCount,
    failCount,
    statusSummary,
    results
  };
}

function checkRecordStatus(recordId) {
  const record = store.getRecord(recordId);
  if (!record) {
    return null;
  }
  return fuelAbnormalService.buildResponse(record);
}

function checkRecordByAuditNo(auditNo) {
  const record = store.getRecordByAuditNo(auditNo);
  if (!record) {
    return null;
  }
  return fuelAbnormalService.buildResponse(record);
}

function listBatchRecords(batchNo, filters = {}) {
  const records = store.listRecords({ batchNo, ...filters });
  return {
    batchNo,
    totalCount: records.length,
    records: records.map(r => fuelAbnormalService.buildResponse(r))
  };
}

function getRecordDetail(recordId) {
  const record = store.getRecord(recordId);
  if (!record) {
    return null;
  }
  return {
    ...record,
    histories: store.getHistories(recordId)
  };
}

function manualReview(recordId, reviewResult, reviewComment, operator) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  if (record.processStatus !== PROCESS_STATUS.RULE_HIT &&
      record.processStatus !== PROCESS_STATUS.RULE_CONFLICT &&
      record.processStatus !== PROCESS_STATUS.MANUAL_REVIEW) {
    return { success: false, message: '当前状态不支持人工复核' };
  }

  const fromStatus = record.processStatus;
  const toStatus = reviewResult === 'APPROVE' ? PROCESS_STATUS.PROCESSED :
                   reviewResult === 'REJECT' ? PROCESS_STATUS.REJECTED :
                   PROCESS_STATUS.MANUAL_REVIEW;

  record.processStatus = toStatus;
  record.updateTime = new Date().toISOString();
  record.operator = operator || record.operator;

  if (reviewResult === 'APPROVE') {
    record.conclusion = {
      conclusionType: 'MANUAL_APPROVED',
      summary: '人工复核通过',
      details: reviewComment || '经人工复核，确认异常情况属实',
      suggestion: '按异常处理流程执行后续措施'
    };
    record.nextAction = 'COMPLETE';
  } else if (reviewResult === 'REJECT') {
    record.conclusion = {
      conclusionType: 'MANUAL_REJECTED',
      summary: '人工复核驳回',
      details: reviewComment || '经人工复核，判定数据异常不成立',
      suggestion: '记录归档，无需进一步处理'
    };
    record.nextAction = 'ARCHIVE';
  }

  store.saveRecord(record);

  const historyEntry = fuelAbnormalService.createHistoryEntry(
    recordId, fromStatus, toStatus,
    operator || 'MANUAL_OPERATOR',
    '人工复核',
    reviewComment || `复核结果: ${reviewResult}`
  );
  store.saveHistory(recordId, historyEntry);

  return {
    success: true,
    recordId: record.recordId,
    auditNo: record.auditNo,
    previousStatus: fromStatus,
    currentStatus: toStatus,
    reviewResult,
    reviewComment
  };
}

function supplementInfo(recordId, supplementData, operator) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  if (record.processStatus !== PROCESS_STATUS.FIELD_MISSING) {
    return { success: false, message: '当前状态不需要补充信息' };
  }

  if (supplementData.masterData) {
    record.masterData = { ...record.masterData, ...supplementData.masterData };
  }
  if (supplementData.application) {
    record.application = { ...record.application, ...supplementData.application };
  }
  if (supplementData.thresholdConfig) {
    record.thresholdConfig = { ...record.thresholdConfig, ...supplementData.thresholdConfig };
  }
  if (supplementData.evidence) {
    record.evidence = [...(record.evidence || []), ...supplementData.evidence];
  }

  const fromStatus = record.processStatus;
  record.processStatus = PROCESS_STATUS.PENDING;
  record.missingFields = [];
  record.updateTime = new Date().toISOString();

  store.saveRecord(record);

  const historyEntry = fuelAbnormalService.createHistoryEntry(
    recordId, fromStatus, PROCESS_STATUS.PENDING,
    operator || 'MANUAL_OPERATOR',
    '补充信息',
    '补充缺失字段后重新提交处理'
  );
  store.saveHistory(recordId, historyEntry);

  const reprocessResult = reprocessRecord(recordId);
  return reprocessResult;
}

function reprocessRecord(recordId) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  const input = {
    masterData: record.masterData,
    application: record.application,
    evidence: record.evidence,
    historicalStatus: record.historicalStatus,
    thresholdConfig: record.thresholdConfig,
    operator: record.operator
  };

  const fromStatus = record.processStatus;
  const newResult = fuelAbnormalService.processSingleRecord(input, record.batchNo);

  const updatedRecord = store.getRecord(recordId);
  if (updatedRecord && updatedRecord.processStatus !== fromStatus) {
    const historyEntry = fuelAbnormalService.createHistoryEntry(
      recordId, fromStatus, updatedRecord.processStatus,
      'SYSTEM',
      '重新处理',
      '补充信息后重新执行规则校验'
    );
    store.saveHistory(recordId, historyEntry);
  }

  return {
    success: true,
    recordId: newResult.recordId,
    auditNo: newResult.auditNo,
    previousStatus: fromStatus,
    currentStatus: newResult.processStatus,
    ...newResult
  };
}

function resolveConflict(recordId, resolution, operator) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  if (record.processStatus !== PROCESS_STATUS.RULE_CONFLICT) {
    return { success: false, message: '当前状态不存在规则冲突' };
  }

  const fromStatus = record.processStatus;

  if (resolution === 'ACCEPT_HIGH_RISK') {
    record.processStatus = PROCESS_STATUS.RULE_HIT;
    record.nextAction = 'MANUAL_REVIEW';
    record.conclusion = {
      conclusionType: 'CONFLICT_RESOLVED_ACCEPT_HIGH',
      summary: '规则冲突已解决，采纳高风险结论',
      details: '经判定，采纳高风险规则结论，忽略冲突',
      suggestion: '请按高风险异常进行人工复核'
    };
  } else if (resolution === 'REJECT_ALL') {
    record.processStatus = PROCESS_STATUS.REJECTED;
    record.nextAction = 'ARCHIVE';
    record.conclusion = {
      conclusionType: 'CONFLICT_RESOLVED_REJECT',
      summary: '规则冲突已解决，数据存疑驳回',
      details: '经判定，规则冲突说明数据可能存在问题，予以驳回',
      suggestion: '数据存疑，建议核实原始数据后重新提交'
    };
  } else {
    record.processStatus = PROCESS_STATUS.MANUAL_REVIEW;
    record.nextAction = 'MANUAL_REVIEW';
  }

  record.updateTime = new Date().toISOString();
  store.saveRecord(record);

  const historyEntry = fuelAbnormalService.createHistoryEntry(
    recordId, fromStatus, record.processStatus,
    operator || 'MANUAL_OPERATOR',
    '规则冲突处理',
    `冲突处理方式: ${resolution}`
  );
  store.saveHistory(recordId, historyEntry);

  return {
    success: true,
    recordId,
    auditNo: record.auditNo,
    previousStatus: fromStatus,
    currentStatus: record.processStatus,
    resolution
  };
}

function mergeDuplicate(recordId, mergeAction, operator) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  if (record.processStatus !== PROCESS_STATUS.DUPLICATE_SUBMISSION) {
    return { success: false, message: '当前状态不是重复提交' };
  }

  const fromStatus = record.processStatus;

  if (mergeAction === 'MERGE') {
    record.processStatus = PROCESS_STATUS.PROCESSED;
    record.nextAction = 'ARCHIVE';
    record.conclusion = {
      conclusionType: 'DUPLICATE_MERGED',
      summary: '重复记录已合并',
      details: `已与记录 ${record.duplicateRecordId} 合并处理`,
      suggestion: '重复记录已归档，不重复处理'
    };
  } else if (mergeAction === 'KEEP_NEW') {
    const fromStatus = record.processStatus;
    record.processStatus = PROCESS_STATUS.PENDING;
    record.duplicateRecordId = null;
    record.updateTime = new Date().toISOString();
    store.saveRecord(record);

    const historyEntry = fuelAbnormalService.createHistoryEntry(
      recordId, fromStatus, PROCESS_STATUS.PENDING,
      operator || 'MANUAL_OPERATOR',
      '保留新记录',
      '判定为非重复记录，保留新记录并重新处理'
    );
    store.saveHistory(recordId, historyEntry);

    return reprocessRecord(recordId);
  } else if (mergeAction === 'DISCARD') {
    record.processStatus = PROCESS_STATUS.REJECTED;
    record.nextAction = 'ARCHIVE';
    record.conclusion = {
      conclusionType: 'DUPLICATE_DISCARDED',
      summary: '重复记录已废弃',
      details: '判定为重复提交，废弃当前记录',
      suggestion: '请使用已有记录进行处理'
    };
  }

  record.updateTime = new Date().toISOString();
  store.saveRecord(record);

  const historyEntry = fuelAbnormalService.createHistoryEntry(
    recordId, fromStatus, record.processStatus,
    operator || 'MANUAL_OPERATOR',
    '重复记录处理',
    `处理方式: ${mergeAction}`
  );
  store.saveHistory(recordId, historyEntry);

  return {
    success: true,
    recordId,
    auditNo: record.auditNo,
    previousStatus: fromStatus,
    currentStatus: record.processStatus,
    mergeAction
  };
}

module.exports = {
  processBatch,
  checkRecordStatus,
  checkRecordByAuditNo,
  listBatchRecords,
  getRecordDetail,
  manualReview,
  supplementInfo,
  reprocessRecord,
  resolveConflict,
  mergeDuplicate
};
