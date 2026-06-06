const express = require('express')
const router = express.Router()
const {
  calculateSubsidy,
  getAuditDetail,
  getAuditReplay,
  getBusinessHistory,
  listAudits,
  reviewSubsidy
} = require('../controllers/subsidyController')

router.post('/calculate', calculateSubsidy)
router.get('/audit/:auditNo', getAuditDetail)
router.get('/audit/:auditNo/replay', getAuditReplay)
router.get('/business/:businessNo/history', getBusinessHistory)
router.get('/audits', listAudits)
router.post('/audit/:auditNo/review', reviewSubsidy)

module.exports = router
