const store = require('../stores/memoryStore');
const { PROCESS_STATUS } = require('../models/dataModels');

function exportBatchResults(batchNo, format = 'JSON') {
  const records = store.listRecords({ batchNo });

  if (records.length === 0) {
    return { success: false, message: '批次不存在或无数据' };
  }

  const exportData = records.map(record => ({
    auditNo: record.auditNo,
    vehicleId: record.masterData?.vehicleId,
    vehiclePlate: record.masterData?.vehiclePlate,
    vehicleType: record.masterData?.vehicleType,
    reportDate: record.application?.reportDate,
    fuelConsumption: record.application?.fuelConsumption,
    mileage: record.application?.mileage,
    processStatus: record.processStatus,
    riskLevel: record.riskLevel,
    conclusionType: record.conclusion?.conclusionType,
    conclusionSummary: record.conclusion?.summary,
    hitRuleNames: record.hitRules?.map(r => r.ruleName).join(';') || '',
    nextAction: record.nextAction,
    submitTime: record.submitTime,
    updateTime: record.updateTime,
    operator: record.operator || ''
  }));

  const summary = {
    batchNo,
    exportTime: new Date().toISOString(),
    totalCount: records.length,
    statusCounts: {}
  };

  for (const status of Object.values(PROCESS_STATUS)) {
    const count = records.filter(r => r.processStatus === status).length;
    if (count > 0) {
      summary.statusCounts[status] = count;
    }
  }

  if (format === 'CSV') {
    return {
      success: true,
      format: 'CSV',
      summary,
      csvContent: convertToCSV(exportData),
      recordCount: exportData.length
    };
  }

  return {
    success: true,
    format: 'JSON',
    summary,
    data: exportData,
    recordCount: exportData.length
  };
}

function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');

  const rows = data.map(row =>
    headers.map(h => {
      let value = row[h];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value !== undefined && value !== null ? value : '';
    }).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

function getHistoricalTrajectory(recordId) {
  const record = store.getRecord(recordId);
  if (!record) {
    return { success: false, message: '记录不存在' };
  }

  const histories = store.getHistories(recordId);

  const trajectory = {
    recordId: record.recordId,
    auditNo: record.auditNo,
    currentStatus: record.processStatus,
    totalChanges: histories.length,
    timeline: histories.map(h => ({
      historyId: h.historyId,
      sequence: histories.indexOf(h) + 1,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      operator: h.operator,
      reason: h.reason,
      remark: h.remark,
      operateTime: h.operateTime,
      traceId: h.traceId
    }))
  };

  return {
    success: true,
    ...trajectory
  };
}

function getStatistics(batchNo) {
  const records = store.listRecords({ batchNo });

  if (records.length === 0) {
    return { success: false, message: '批次不存在或无数据' };
  }

  const statusStats = {};
  const riskStats = {};
  const ruleHitStats = {};
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;

  for (const record of records) {
    statusStats[record.processStatus] = (statusStats[record.processStatus] || 0) + 1;

    riskStats[record.riskLevel] = (riskStats[record.riskLevel] || 0) + 1;

    if (record.hitRules && record.hitRules.length > 0) {
      for (const rule of record.hitRules) {
        ruleHitStats[rule.ruleType] = (ruleHitStats[rule.ruleType] || 0) + 1;
      }
    }
  }

  return {
    success: true,
    batchNo,
    totalRecords: records.length,
    statusStatistics: statusStats,
    riskStatistics: riskStats,
    ruleHitStatistics: ruleHitStats,
    abnormalRate: records.filter(r => r.processStatus === 'RULE_HIT' || r.processStatus === 'RULE_CONFLICT').length / records.length
  };
}

module.exports = {
  exportBatchResults,
  getHistoricalTrajectory,
  getStatistics
};
