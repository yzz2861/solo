const express = require('express');
const router = express.Router();
const traceService = require('../services/traceService');

router.get('/patient/:patientId', async (req, res) => {
  try {
    const result = await traceService.traceByPatient(req.params.patientId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/instrument/:code', async (req, res) => {
  try {
    const result = await traceService.traceByInstrument(req.params.code);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/pot-cycle/:potCycle', async (req, res) => {
  try {
    const result = await traceService.traceByPotCycle(req.params.potCycle);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/qr/:qrCode', async (req, res) => {
  try {
    const result = await traceService.traceByQRCode(req.params.qrCode);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/sterilizer/:sterilizerId', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await traceService.traceBySterilizer(
      req.params.sterilizerId,
      start_date,
      end_date
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
