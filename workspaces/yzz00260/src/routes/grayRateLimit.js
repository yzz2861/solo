const express = require('express');
const router = express.Router();
const grayRateLimitService = require('../services/grayRateLimitService');
const ruleEngine = require('../services/ruleEngine');

router.post('/check', (req, res) => {
  const result = grayRateLimitService.processRequest(req.body);
  res.status(result.code).json(result.data);
});

router.post('/lock', (req, res) => {
  const result = grayRateLimitService.lockBusiness(req.body);
  res.status(result.code).json(result.data);
});

router.post('/unlock', (req, res) => {
  const result = grayRateLimitService.unlockBusiness(req.body);
  res.status(result.code).json(result.data);
});

router.post('/review', (req, res) => {
  const result = grayRateLimitService.reviewDecision(req.body);
  res.status(result.code).json(result.data);
});

router.get('/trace/:traceId', (req, res) => {
  const result = grayRateLimitService.getTrace(req.params.traceId);
  res.status(result.code).json(result.data);
});

router.get('/audit', (req, res) => {
  const { businessNo, limit } = req.query;
  const result = grayRateLimitService.getAuditLogs(businessNo, limit ? parseInt(limit) : 50);
  res.status(result.code).json(result.data);
});

router.get('/rules', (req, res) => {
  const { version } = req.query;
  const rules = ruleEngine.getRuleInfo(version);
  res.json({
    requestId: 'REQ-' + Date.now(),
    total: rules.length,
    rules
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway-gray-rate-limit',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
