const express = require('express');
const router = express.Router();
const batchService = require('../services/batchService');

router.get('/', async (req, res) => {
  try {
    const batches = await batchService.listBatches(req.query);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/qr/:qrCode', async (req, res) => {
  try {
    const batch = await batchService.getBatchByQRCode(req.params.qrCode);
    if (!batch) {
      return res.status(404).json({ success: false, error: '批次不存在' });
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: '批次不存在' });
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/collect', async (req, res) => {
  try {
    const { instrument_ids, operator, location, notes, qr_code, confirm_duplicate } = req.body;

    if (!instrument_ids || !Array.isArray(instrument_ids) || instrument_ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择至少一件器械' });
    }
    if (!operator) {
      return res.status(400).json({ success: false, error: '请指定操作人' });
    }

    if (qr_code) {
      const existingBatch = await batchService.getBatchByQRCode(qr_code);
      
      if (existingBatch) {
        if (!confirm_duplicate && existingBatch.status === 'collected') {
          return res.json({
            success: true,
            duplicate_warning: true,
            message: `该二维码已在 ${existingBatch.collected_at} 回收过，状态为「待清洗」，是否确认重复回收？`,
            existing_batch: {
              id: existingBatch.id,
              qr_code: existingBatch.qr_code,
              bag_no: existingBatch.bag_no,
              status: existingBatch.status,
              collected_at: existingBatch.collected_at,
              item_count: existingBatch.items.length,
            },
            action: 'confirm_collect',
          });
        }
        
        if (confirm_duplicate) {
          return res.status(400).json({ 
            success: false, 
            error: '同一二维码不能重复创建批次，请使用原有批次继续流程，或更换新包装袋' 
          });
        }
      }
    }

    const batch = await batchService.createBatch(instrument_ids, operator, location, notes, qr_code);
    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/scan/:action', async (req, res) => {
  try {
    const { qr_code, operator, location, notes, ...extra } = req.body;
    const action = req.params.action;

    if (!qr_code) {
      return res.status(400).json({ success: false, error: '缺少二维码' });
    }
    if (!operator) {
      return res.status(400).json({ success: false, error: '请指定操作人' });
    }

    const duplicateCheck = await batchService.checkDuplicateScan(qr_code, action);
    if (duplicateCheck.isDuplicate && !req.body.confirm_duplicate) {
      return res.json({
        success: true,
        duplicate_warning: true,
        message: duplicateCheck.message,
        last_scan: duplicateCheck.lastScan,
      });
    }

    let batch;
    switch (action) {
      case 'cleaning':
        batch = await batchService.updateBatchStatus(qr_code, 'cleaning', operator, { action, location, notes, ...extra });
        break;
      case 'cleaned':
        batch = await batchService.updateBatchStatus(qr_code, 'cleaned', operator, { action, location, notes, ...extra });
        break;
      case 'sterilizing':
        batch = await batchService.updateBatchStatus(qr_code, 'sterilizing', operator, { action, location, notes, ...extra });
        break;
      case 'sterilized':
        batch = await batchService.updateBatchStatus(qr_code, 'sterilized', operator, {
          action,
          location,
          notes,
          expire_days: extra.expire_days || 180,
          sterilizer_id: extra.sterilizer_id,
          pot_cycle: extra.pot_cycle,
        });
        break;
      case 'stored':
        batch = await batchService.updateBatchStatus(qr_code, 'stored', operator, { action, location, notes, ...extra });
        break;
      default:
        return res.status(400).json({ success: false, error: `不支持的操作: ${action}` });
    }

    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/sterilization-fail', async (req, res) => {
  try {
    const { qr_code, operator, notes } = req.body;

    if (!qr_code || !operator) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const batch = await batchService.sterilizationFail(qr_code, operator, notes);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/reprocess', async (req, res) => {
  try {
    const { qr_code, operator, notes } = req.body;

    if (!qr_code || !operator) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const batch = await batchService.reprocessFailedBatch(qr_code, operator, notes);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
