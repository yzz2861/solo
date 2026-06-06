const express = require('express');
const router = express.Router();
const { processBatch } = require('../src/businessService');
const { getAuditRecord, findByBatchNo, getAllRecords, clearAll } = require('../src/storage');
const { SOURCE_CHANNELS, PROCESS_ACTIONS, BUSINESS_CONCLUSIONS, RISK_TAGS, NEXT_ACTIONS } = require('../src/constants');

router.post('/vpn-remote-login/process', (req, res) => {
  try {
    const result = processBatch(req.body);

    if (!result.success && result.code === 'INVALID_INPUT') {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('处理异常:', error);
    res.status(500).json({
      success: false,
      code: 'SYSTEM_ERROR',
      message: '系统内部错误',
      error: error.message
    });
  }
});

router.get('/vpn-remote-login/audit/:auditId', (req, res) => {
  const record = getAuditRecord(req.params.auditId);
  if (!record) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: '审计记录不存在'
    });
  }
  res.json({
    success: true,
    data: record
  });
});

router.get('/vpn-remote-login/batch/:batchNo', (req, res) => {
  const records = findByBatchNo(req.params.batchNo);
  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

router.get('/vpn-remote-login/records', (req, res) => {
  const records = getAllRecords();
  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

router.get('/vpn-remote-login/meta/constants', (req, res) => {
  res.json({
    success: true,
    data: {
      sourceChannels: SOURCE_CHANNELS,
      processActions: PROCESS_ACTIONS,
      businessConclusions: BUSINESS_CONCLUSIONS,
      riskTags: RISK_TAGS,
      nextActions: NEXT_ACTIONS
    }
  });
});

router.delete('/vpn-remote-login/records', (req, res) => {
  clearAll();
  res.json({
    success: true,
    message: '所有记录已清空'
  });
});

module.exports = router;
