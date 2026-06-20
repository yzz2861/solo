const express = require('express');
const router = express.Router();
const cardService = require('../services/cardService');

router.post('/owners', async (req, res) => {
  try {
    const result = await cardService.createOwner(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/owners/:ownerNo', async (req, res) => {
  const result = await cardService.getOwnerByNo(req.params.ownerNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '车主不存在' });
  }
  res.json({ success: true, data: result });
});

router.post('/cards', async (req, res) => {
  try {
    const result = await cardService.createCard(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/cards', async (req, res) => {
  const result = await cardService.listCards(req.query);
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo', async (req, res) => {
  const result = await cardService.getCardByNo(req.params.cardNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/cards/plate/:plateNumber', async (req, res) => {
  const result = await cardService.getCardByPlate(req.params.plateNumber);
  if (!result) {
    return res.status(404).json({ success: false, message: '未找到该车牌对应的月卡' });
  }
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo/status', async (req, res) => {
  const result = await cardService.getCardStatus(req.params.cardNo);
  if (!result) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/cards/:cardNo/can-extend', async (req, res) => {
  const card = await cardService.getCardByNo(req.params.cardNo);
  if (!card) {
    return res.status(404).json({ success: false, message: '月卡不存在' });
  }
  const result = await cardService.checkCanExtend(card.id, req.query.reason_type || 'other');
  res.json({ success: true, data: result });
});

module.exports = router;
