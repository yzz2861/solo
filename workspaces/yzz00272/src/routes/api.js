const express = require('express');
const { processBridgeDockingRequest, queryAudit } = require('../services/bridgeSafetyService');
const { loadConfig, resetConfig, updateConfig } = require('../config/config');
const { getAuditCount, getAllAudits, clearAll } = require('../store/auditStore');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/bridge-docking/process', (req, res) => {
  try {
    const result = processBridgeDockingRequest(req.body);
    const statusCode = result.code === 0 ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('处理廊桥靠接请求异常', { error: error.message, stack: error.stack });
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: {
        error: error.message
      }
    });
  }
});

router.get('/audit/:auditNo', (req, res) => {
  try {
    const result = queryAudit(req.params.auditNo);
    const statusCode = result.code === 0 ? 200 : 404;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('查询审计记录异常', { error: error.message });
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/config', (req, res) => {
  try {
    const config = loadConfig();
    res.json({
      code: 0,
      message: 'success',
      data: {
        ruleVersion: config.ruleVersion,
        enabled: config.enabled,
        timeWindow: config.timeWindow,
        validSourceChannels: config.validSourceChannels,
        riskRuleCount: config.riskRules?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.put('/config', (req, res) => {
  try {
    const config = updateConfig(req.body || {});
    res.json({
      code: 0,
      message: '配置已更新',
      data: { ruleVersion: config.ruleVersion }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.post('/config/reset', (req, res) => {
  try {
    const config = resetConfig();
    res.json({
      code: 0,
      message: '配置已重置',
      data: { ruleVersion: config.ruleVersion }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.get('/admin/audit-count', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: { count: getAuditCount() }
  });
});

router.get('/admin/audits', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: getAllAudits()
  });
});

router.post('/admin/clear', (req, res) => {
  clearAll();
  res.json({ code: 0, message: '缓存已清空' });
});

router.get('/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'UP' } });
});

module.exports = router;
