const { routeStatus } = require('../services/statusRouter');
const {
  checkBatchExists,
  getBatchResult,
  saveBatchResult,
  getAuditLogs,
  getBatchCount,
  getItemCount,
  getAuditCount,
  getItemRecord
} = require('../services/auditService');
const { RULE_VERSION, STATUS } = require('../config/constants');

function processEvidence(req, res) {
  const { batchNo, items, sourceChannel, action, reviewOpinion, operator } = req.body;

  if (checkBatchExists(batchNo)) {
    const existingResult = getBatchResult(batchNo);
    return res.status(200).json({
      success: true,
      code: 'DUPLICATE_BATCH',
      message: '批次已存在，返回首次处理结果（幂等性保证）',
      data: existingResult
    });
  }

  const itemResults = items.map(item => {
    const existingRecord = getItemRecord(item.itemId);
    return routeStatus(item, action, reviewOpinion, existingRecord);
  });

  const savedResult = saveBatchResult(
    batchNo,
    operator,
    sourceChannel,
    action,
    reviewOpinion,
    itemResults
  );

  const statusSummary = calculateStatusSummary(itemResults);
  const riskSummary = calculateRiskSummary(itemResults);

  res.status(200).json({
    success: true,
    code: 'SUCCESS',
    message: '批次处理完成',
    data: {
      ...savedResult,
      statusSummary,
      riskSummary
    }
  });
}

function calculateStatusSummary(items) {
  const summary = {
    [STATUS.PROCESSABLE]: 0,
    [STATUS.SUPPLEMENT]: 0,
    [STATUS.LOCKED]: 0,
    [STATUS.FAILED]: 0,
    total: items.length
  };

  items.forEach(item => {
    if (summary.hasOwnProperty(item.status)) {
      summary[item.status]++;
    }
  });

  return summary;
}

function calculateRiskSummary(items) {
  const summary = {
    '低风险': 0,
    '中风险': 0,
    '高风险': 0,
    '无法判定': 0,
    total: 0
  };

  items.forEach(item => {
    if (item.riskLevel) {
      summary[item.riskLevel] = (summary[item.riskLevel] || 0) + 1;
      summary.total++;
    }
  });

  return summary;
}

function getBatch(req, res) {
  const { batchNo } = req.params;

  if (!checkBatchExists(batchNo)) {
    return res.status(404).json({
      success: false,
      code: 'BATCH_NOT_FOUND',
      message: `批次 ${batchNo} 不存在`,
      timestamp: new Date().toISOString()
    });
  }

  const result = getBatchResult(batchNo);
  delete result.isDuplicate;
  delete result.duplicateHint;

  res.status(200).json({
    success: true,
    code: 'SUCCESS',
    message: '查询成功',
    data: result
  });
}

function getItem(req, res) {
  const { itemId } = req.params;
  const item = getItemRecord(itemId);

  if (!item) {
    return res.status(404).json({
      success: false,
      code: 'ITEM_NOT_FOUND',
      message: `明细项 ${itemId} 不存在`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    code: 'SUCCESS',
    message: '查询成功',
    data: item
  });
}

function queryAuditLogs(req, res) {
  const { batchNo, operator, operationType, limit = 50, offset = 0 } = req.query;

  const filter = {};
  if (batchNo) filter.batchNo = batchNo;
  if (operator) filter.operator = operator;
  if (operationType) filter.operationType = operationType;

  const allLogs = getAuditLogs(filter);
  const paginatedLogs = allLogs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.status(200).json({
    success: true,
    code: 'SUCCESS',
    message: '查询成功',
    data: {
      total: allLogs.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      logs: paginatedLogs
    }
  });
}

function getStats(req, res) {
  res.status(200).json({
    success: true,
    code: 'SUCCESS',
    message: '统计信息查询成功',
    data: {
      ruleVersion: RULE_VERSION,
      batchCount: getBatchCount(),
      itemCount: getItemCount(),
      auditLogCount: getAuditCount(),
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  processEvidence,
  getBatch,
  getItem,
  queryAuditLogs,
  getStats
};
