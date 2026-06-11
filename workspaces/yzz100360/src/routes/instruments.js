const express = require('express');
const router = express.Router();
const instrumentService = require('../services/instrumentService');

router.get('/', async (req, res) => {
  try {
    const instruments = await instrumentService.listInstruments(req.query);
    res.json({ success: true, data: instruments });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const instrument = await instrumentService.getInstrumentById(req.params.id);
    if (!instrument) {
      return res.status(404).json({ success: false, error: '器械不存在' });
    }
    res.json({ success: true, data: instrument });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const instrument = await instrumentService.createInstrument(req.body);
    res.status(201).json({ success: true, data: instrument });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const instrument = await instrumentService.updateInstrument(req.params.id, req.body);
    if (!instrument) {
      return res.status(404).json({ success: false, error: '器械不存在' });
    }
    res.json({ success: true, data: instrument });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await instrumentService.deleteInstrument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '器械不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
