const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  importMaterialsCSV,
  importChannelFeedbackJSON,
  importReviewCSV,
  getImportBatches,
} = require('../db/importer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

router.get('/batches', (req, res) => {
  try {
    const batches = getImportBatches();
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/materials', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const result = await importMaterialsCSV(req.file.path, req.file.originalname);
    res.json({
      success: true,
      ...result,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/channel-feedback', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const result = await importChannelFeedbackJSON(req.file.path, req.file.originalname);
    res.json({
      success: true,
      ...result,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reviews', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const result = await importReviewCSV(req.file.path, req.file.originalname);
    res.json({
      success: true,
      ...result,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
