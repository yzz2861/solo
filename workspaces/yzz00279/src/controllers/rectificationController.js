const RectificationService = require('../services/rectificationService');
const { getAuditLog, getBatchHistory, clearAllRecords } = require('../services/auditService');

const defaultConfig = {
  acceptancePrepTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  validBatchPrefixes: ['WF', 'WY', 'XM', 'GC'],
  rectificationDeadlineDays: 30,
  reviewDepartments: ['工程部', '品质部', '客服部'],
  strictMode: false
};

function processRectification(req, res, next) {
  try {
    const payload = req.body;
    const config = { ...defaultConfig };
    const service = new RectificationService(config);
    const result = service.processRectification(payload);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
}

function getAuditRecord(req, res, next) {
  try {
    const { auditId } = req.params;
    const record = getAuditLog(auditId);

    if (!record) {
      return res.status(404).json({
        success: false,
        businessConclusion: 'NOT_FOUND',
        errorCode: 'AUDIT_NOT_FOUND',
        message: '审计记录不存在',
        auditId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

function getBatchRecords(req, res, next) {
  try {
    const { batchNumber } = req.params;
    const records = getBatchHistory(batchNumber);

    res.json({
      success: true,
      data: records,
      count: records.length,
      batchNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

function healthCheck(req, res) {
  res.json({
    success: true,
    status: 'OK',
    service: 'house-delivery-rectification-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}

function resetRecords(req, res, next) {
  try {
    clearAllRecords();
    res.json({
      success: true,
      message: '所有记录已清空',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processRectification,
  getAuditRecord,
  getBatchRecords,
  healthCheck,
  resetRecords,
  defaultConfig
};
