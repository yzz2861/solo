const express = require('express');
const router = express.Router();
const adjustmentService = require('../services/adjustmentService');
const { getCardByNo } = require('../services/cardService');

router.post('/adjustments', async (req, res) => {
  try {
    const card = await getCardByNo(req.body.card_no);
    if (!card) {
      return res.status(404).json({ success: false, message: '月卡不存在' });
    }

    const result = await adjustmentService.createManualAdjustment({
      card_id: card.id,
      adjust_type: req.body.adjust_type,
      adjust_days: req.body.adjust_days,
      adjust_amount: req.body.adjust_amount,
      new_end_date: req.body.new_end_date,
      reason: req.body.reason,
      operator: req.body.operator
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/adjustments', async (req, res) => {
  const result = await adjustmentService.listAdjustments(req.query);
  res.json({ success: true, data: result });
});

router.get('/adjustments/:adjustmentNo', async (req, res) => {
  const result = await adjustmentService.getAdjustmentByNo(req.params.adjustmentNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '调整记录不存在' });
  }
  res.json({ success: true, data: result });
});

module.exports = router;
