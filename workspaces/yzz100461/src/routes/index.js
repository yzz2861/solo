const express = require('express');
const router = express.Router();

const caseCtrl = require('../controllers/caseController');
const hearingCtrl = require('../controllers/hearingController');
const reservationCtrl = require('../controllers/reservationController');
const statusCtrl = require('../controllers/statusController');
const securityCtrl = require('../controllers/securityController');
const exportCtrl = require('../controllers/exportController');

router.get('/health', (req, res) => {
  res.json({
    code: 0,
    data: {
      service: '法院旁听预约核验 API',
      status: 'running',
      timestamp: new Date().toLocaleString('zh-CN')
    }
  });
});

router.get('/courtrooms', hearingCtrl.listCourtrooms);
router.get('/seat-types', hearingCtrl.listSeatTypes);

router.get('/cases', caseCtrl.listCases);
router.get('/cases/:id', caseCtrl.getCase);
router.post('/cases', caseCtrl.createCase);
router.put('/cases/:id', caseCtrl.updateCase);
router.delete('/cases/:id', caseCtrl.deleteCase);

router.get('/hearings', hearingCtrl.listHearings);
router.get('/hearings/:id', hearingCtrl.getHearing);
router.post('/hearings', hearingCtrl.createHearing);
router.put('/hearings/:id', hearingCtrl.updateHearing);
router.delete('/hearings/:id', hearingCtrl.deleteHearing);

router.post('/hearings/:hearing_id/close', statusCtrl.closeHearing);
router.post('/hearings/:hearing_id/reschedule', statusCtrl.rescheduleHearing);
router.post('/hearings/confirm-notice', statusCtrl.confirmNotified);

router.get('/reservations', reservationCtrl.listReservations);
router.get('/reservations/:id', reservationCtrl.getReservation);
router.post('/reservations', reservationCtrl.createReservation);
router.put('/reservations/:id', reservationCtrl.updateReservation);
router.delete('/reservations/:id', reservationCtrl.deleteReservation);
router.post('/reservations/:id/review', reservationCtrl.reviewReservation);
router.post('/reservations/batch-review', reservationCtrl.batchReviewByHearing);

router.get('/security/list', securityCtrl.getSecurityList);
router.get('/security/short-list/:courtroom_id/:date', securityCtrl.getShortListByCourtroom);
router.post('/security/verify', securityCtrl.verifyPerson);
router.get('/security/stats', securityCtrl.getVerificationStats);

router.get('/records/query', exportCtrl.queryRecords);
router.get('/records/export', exportCtrl.exportRecords);
router.get('/records/stats', exportCtrl.getStats);

router.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: `接口不存在: ${req.method} ${req.baseUrl}${req.path}`
  });
});

module.exports = router;
