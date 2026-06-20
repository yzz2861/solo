const express = require('express');
const router = express.Router();
const feeService = require('../services/feeService');
const { getCardByNo, updateCardEndDate } = require('../services/cardService');
const { calculateRefundFee, addDays } = require('../utils/helpers');

router.get('/transactions', async (req, res) => {
  const result = await feeService.listTransactions(req.query);
  res.json({ success: true, data: result });
});

router.get('/transactions/:transactionNo', async (req, res) => {
  const result = await feeService.getTransactionByNo(req.params.transactionNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '流水不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo/transactions', async (req, res) => {
  const card = await getCardByNo(req.params.cardNo);
  if (!card) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  const result = await feeService.getTransactionsByCard(card.id);
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo/fee-summary', async (req, res) => {
  const card = await getCardByNo(req.params.cardNo);
  if (!card) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  const result = await feeService.getFeeSummary(card.id);
  res.json({ success: true, data: result });
});

router.post('/refunds', async (req, res) => {
  try {
    const card = await getCardByNo(req.body.card_no);
    if (!card) {
      return res.status(404).json({ success: false, message: '月卡不存在' });
    }

    const refundDays = req.body.refund_days;
    const feeCalc = calculateRefundFee(card.monthly_fee, refundDays);
    const newEndDate = addDays(card.end_date, -refundDays);

    const result = await feeService.createRefund({
      card_id: card.id,
      owner_id: card.owner_id,
      refund_days: refundDays,
      refund_amount: feeCalc.amount,
      reason: req.body.reason,
      original_end_date: card.end_date,
      new_end_date: newEndDate,
      operator: req.body.operator,
      calc_detail: feeCalc
    });

    await updateCardEndDate(card.id, newEndDate);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/refunds', async (req, res) => {
  const result = await feeService.listRefunds(req.query);
  res.json({ success: true, data: result });
});

router.get('/refunds/:refundNo', async (req, res) => {
  const refund = await feeService.getRefundByNo(req.params.refundNo);
  if (!refund) {
    return res.status(404).json({ success: false, message: '退款记录不存在' });
  }
  res.json({ success: true, data: refund });
});

module.exports = router;
