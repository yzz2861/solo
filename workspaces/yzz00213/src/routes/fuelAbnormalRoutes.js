const express = require('express');
const router = express.Router();
const batchService = require('../services/batchService');
const exportService = require('../services/exportService');

router.post('/batch/process', (req, res) => {
  try {
    const { batchNo, records, operator, thresholdConfig } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'records 不能为空且必须是数组'
      });
    }

    const result = batchService.processBatch({
      batchNo,
      records,
      operator,
      thresholdConfig
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量处理失败',
      error: error.message
    });
  }
});

router.get('/record/:recordId/status', (req, res) => {
  try {
    const { recordId } = req.params;
    const result = batchService.checkRecordStatus(recordId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询状态失败',
      error: error.message
    });
  }
});

router.get('/record/audit/:auditNo', (req, res) => {
  try {
    const { auditNo } = req.params;
    const result = batchService.checkRecordByAuditNo(auditNo);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: '审计编号对应的记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

router.get('/record/:recordId/detail', (req, res) => {
  try {
    const { recordId } = req.params;
    const result = batchService.getRecordDetail(recordId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询详情失败',
      error: error.message
    });
  }
});

router.get('/batch/:batchNo/records', (req, res) => {
  try {
    const { batchNo } = req.params;
    const { processStatus, vehicleId } = req.query;

    const filters = {};
    if (processStatus) filters.processStatus = processStatus;
    if (vehicleId) filters.vehicleId = vehicleId;

    const result = batchService.listBatchRecords(batchNo, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询批次记录失败',
      error: error.message
    });
  }
});

router.post('/record/:recordId/review', (req, res) => {
  try {
    const { recordId } = req.params;
    const { reviewResult, reviewComment, operator } = req.body;

    if (!reviewResult || !['APPROVE', 'REJECT', 'REVIEWING'].includes(reviewResult)) {
      return res.status(400).json({
        success: false,
        message: 'reviewResult 必须是 APPROVE、REJECT 或 REVIEWING'
      });
    }

    const result = batchService.manualReview(recordId, reviewResult, reviewComment, operator);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '人工复核失败',
      error: error.message
    });
  }
});

router.post('/record/:recordId/supplement', (req, res) => {
  try {
    const { recordId } = req.params;
    const { supplementData, operator } = req.body;

    if (!supplementData) {
      return res.status(400).json({
        success: false,
        message: 'supplementData 不能为空'
      });
    }

    const result = batchService.supplementInfo(recordId, supplementData, operator);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '补充信息失败',
      error: error.message
    });
  }
});

router.post('/record/:recordId/resolve-conflict', (req, res) => {
  try {
    const { recordId } = req.params;
    const { resolution, operator } = req.body;

    if (!resolution || !['ACCEPT_HIGH_RISK', 'REJECT_ALL', 'MANUAL_REVIEW'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: 'resolution 必须是 ACCEPT_HIGH_RISK、REJECT_ALL 或 MANUAL_REVIEW'
      });
    }

    const result = batchService.resolveConflict(recordId, resolution, operator);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '处理规则冲突失败',
      error: error.message
    });
  }
});

router.post('/record/:recordId/merge-duplicate', (req, res) => {
  try {
    const { recordId } = req.params;
    const { mergeAction, operator } = req.body;

    if (!mergeAction || !['MERGE', 'KEEP_NEW', 'DISCARD'].includes(mergeAction)) {
      return res.status(400).json({
        success: false,
        message: 'mergeAction 必须是 MERGE、KEEP_NEW 或 DISCARD'
      });
    }

    const result = batchService.mergeDuplicate(recordId, mergeAction, operator);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '处理重复记录失败',
      error: error.message
    });
  }
});

router.get('/batch/:batchNo/export', (req, res) => {
  try {
    const { batchNo } = req.params;
    const { format = 'JSON' } = req.query;

    const result = exportService.exportBatchResults(batchNo, format);

    if (!result.success) {
      return res.status(404).json(result);
    }

    if (format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="fuel-abnormal-${batchNo}.csv"`);
      return res.send(result.csvContent);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
});

router.get('/record/:recordId/trajectory', (req, res) => {
  try {
    const { recordId } = req.params;
    const result = exportService.getHistoricalTrajectory(recordId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '查询历史轨迹失败',
      error: error.message
    });
  }
});

router.get('/batch/:batchNo/statistics', (req, res) => {
  try {
    const { batchNo } = req.params;
    const result = exportService.getStatistics(batchNo);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '统计失败',
      error: error.message
    });
  }
});

module.exports = router;
