const express = require('express');
const router = express.Router();
const gateService = require('../services/gateService');

router.get('/plate/:plateNumber', async (req, res) => {
  const result = await gateService.getGateInfoByPlate(req.params.plateNumber);
  res.json({ success: true, data: result });
});

router.get('/card/:cardNo', async (req, res) => {
  const result = await gateService.getGateInfoByCardNo(req.params.cardNo);
  res.json({ success: true, data: result });
});

router.get('/card/:cardNo/full', async (req, res) => {
  const result = await gateService.getCardFullInfo(req.params.cardNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  res.json({ success: true, data: result });
});

module.exports = router;
