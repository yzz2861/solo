const express = require('express');
const router = express.Router();
const { validateAssessmentRequest } = require('../middleware/validator');
const {
  createAssessment,
  getAssessment,
  getAuditLogs,
  getStats,
  listBatches
} = require('../controllers/assessmentController');

router.post('/assessment', validateAssessmentRequest, createAssessment);

router.get('/assessment/:batchNo', getAssessment);

router.get('/assessment/:batchNo/audit-logs', getAuditLogs);

router.get('/stats', getStats);

router.get('/batches', listBatches);

router.post('/reset', (req, res) => {
  const store = require('../store/memoryStore');
  store.clear();
  res.json({ success: true, data: { message: '数据已重置' } });
});

module.exports = router;
