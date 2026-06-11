const express = require('express');
const router = express.Router();
const treatmentService = require('../services/treatmentService');

router.get('/', async (req, res) => {
  try {
    const treatments = await treatmentService.listTreatments(req.query);
    res.json({ success: true, data: treatments });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const treatment = await treatmentService.getTreatmentById(req.params.id);
    if (!treatment) {
      return res.status(404).json({ success: false, error: '治疗记录不存在' });
    }
    res.json({ success: true, data: treatment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const treatment = await treatmentService.createTreatment(req.body);
    res.status(201).json({ success: true, data: treatment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/pickup', async (req, res) => {
  try {
    const { qr_code, operator } = req.body;

    if (!qr_code || !operator) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const batch = await treatmentService.getBatchByQRCode(qr_code);
    if (batch) {
      const expiryCheck = await treatmentService.checkBatchExpiry(batch.id);
      if (expiryCheck.isExpired) {
        return res.status(400).json({
          success: false,
          error: '该灭菌包已过期，不能领取',
          expiry_info: expiryCheck,
        });
      }
      if (expiryCheck.isExpiringSoon) {
        return res.json({
          success: true,
          expiring_warning: true,
          message: `该灭菌包即将在 ${expiryCheck.daysRemaining} 天后过期，建议尽快使用或更换`,
          expiry_info: expiryCheck,
          action: 'confirm_pickup',
        });
      }
    }

    const treatment = await treatmentService.pickupBatchForTreatment(req.params.id, qr_code, operator);
    res.json({ success: true, data: treatment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/use', async (req, res) => {
  try {
    const { qr_code, operator } = req.body;

    if (!qr_code || !operator) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const treatment = await treatmentService.useBatchInTreatment(req.params.id, qr_code, operator);
    res.json({ success: true, data: treatment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const treatment = await treatmentService.completeTreatment(req.params.id);
    res.json({ success: true, data: treatment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/return', async (req, res) => {
  try {
    const { qr_code, operator, notes } = req.body;

    if (!qr_code || !operator) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const result = await treatmentService.returnBatchToStorage(req.params.id, qr_code, operator, notes);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id/expiring-alerts', async (req, res) => {
  try {
    const treatment = await treatmentService.getTreatmentById(req.params.id);
    if (!treatment) {
      return res.status(404).json({ success: false, error: '治疗记录不存在' });
    }

    const alerts = [];
    for (const inst of treatment.instruments) {
      if (inst.batch_status === 'stored' || inst.batch_status === 'issued') {
        const expiry = await treatmentService.checkBatchExpiry(inst.batch_id);
        if (expiry.isExpired || expiry.isExpiringSoon) {
          alerts.push({
            batch_id: inst.batch_id,
            qr_code: inst.qr_code,
            bag_no: inst.bag_no,
            ...expiry,
          });
        }
      }
    }

    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
