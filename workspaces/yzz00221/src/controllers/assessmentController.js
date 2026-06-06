const { evaluateBatch } = require('../services/ruleEngine');
const { triageAssessment } = require('../services/triageService');
const { createAuditTrail, buildResponse, getBatchAuditLogs, getSystemStats } = require('../services/auditService');
const { detectMaterialMissing } = require('../middleware/validator');
const store = require('../store/memoryStore');

function createAssessment(req, res) {
  try {
    const requestData = req.body;
    const { batchNo, details } = requestData;

    const materialCheck = detectMaterialMissing(details);

    let ruleResults = null;
    if (!materialCheck.hasMissing) {
      ruleResults = evaluateBatch(details);
    } else {
      ruleResults = {
        summary: {
          totalCount: details.length,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          ruleHitCount: 0,
          overallRiskLevel: null,
          allRiskLabels: []
        },
        details: []
      };
    }

    const triageResult = triageAssessment(requestData, ruleResults, materialCheck);

    createAuditTrail(batchNo, triageResult, requestData);

    const response = buildResponse(batchNo, triageResult);

    res.status(200).json(response);
  } catch (error) {
    console.error('评估处理异常:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error.message,
      data: null
    });
  }
}

function getAssessment(req, res) {
  try {
    const { batchNo } = req.params;
    const batch = store.getBatch(batchNo);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在',
        errorCode: 'BATCH_NOT_FOUND',
        data: null
      });
    }

    const auditLogs = getBatchAuditLogs(batchNo);

    res.status(200).json({
      success: true,
      data: {
        batch,
        auditLogs
      }
    });
  } catch (error) {
    console.error('查询评估异常:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorCode: 'INTERNAL_ERROR',
      data: null
    });
  }
}

function getAuditLogs(req, res) {
  try {
    const { batchNo } = req.params;
    const result = getBatchAuditLogs(batchNo);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('查询审计日志异常:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorCode: 'INTERNAL_ERROR',
      data: null
    });
  }
}

function getStats(req, res) {
  try {
    const stats = getSystemStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计异常:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorCode: 'INTERNAL_ERROR',
      data: null
    });
  }
}

function listBatches(req, res) {
  try {
    const batches = store.getAllBatches();
    res.status(200).json({
      success: true,
      data: {
        total: batches.length,
        batches
      }
    });
  } catch (error) {
    console.error('获取批次列表异常:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorCode: 'INTERNAL_ERROR',
      data: null
    });
  }
}

module.exports = {
  createAssessment,
  getAssessment,
  getAuditLogs,
  getStats,
  listBatches
};
