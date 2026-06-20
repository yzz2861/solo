const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

function checkExpiredItems() {
  const items = db.prepare(`
    SELECT id, found_time, storage_period_days, status
    FROM items
    WHERE status IN ('pending', 'claimed')
  `).all();

  const now = new Date();
  const updateStmt = db.prepare(`
    UPDATE items SET status = 'disposed', updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  items.forEach(item => {
    const foundDate = new Date(item.found_time);
    const expireDate = new Date(foundDate.getTime() + item.storage_period_days * 24 * 60 * 60 * 1000);
    if (now > expireDate) {
      updateStmt.run(item.id);
    }
  });
}

router.post('/', upload.single('photo'), (req, res) => {
  try {
    const {
      type, brand, color, features, location, found_time,
      storage_location, locker_number, is_valuable, storage_period_days
    } = req.body;

    if (!type || !location || !found_time || !storage_location || !locker_number) {
      return res.status(400).json({ error: '缺少必填字段：type, location, found_time, storage_location, locker_number' });
    }

    const photo = req.file ? '/uploads/' + req.file.filename : null;

    const stmt = db.prepare(`
      INSERT INTO items (type, brand, color, features, location, found_time, photo, storage_location, locker_number, is_valuable, storage_period_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const isValuableInt = is_valuable === true || is_valuable === '1' || is_valuable === 1 ? 1 : 0;
    const storagePeriod = parseInt(storage_period_days) || 30;

    const result = stmt.run(
      type, brand || null, color || null, features || null,
      location, found_time, photo,
      storage_location, locker_number,
      isValuableInt,
      storagePeriod
    );

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '失物登记成功', item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/', (req, res) => {
  try {
    checkExpiredItems();

    const { status, type, keyword, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }
    if (keyword) {
      whereClauses.push('(brand LIKE ? OR color LIKE ? OR features LIKE ? OR location LIKE ?)');
      const kw = '%' + keyword + '%';
      params.push(kw, kw, kw, kw);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const items = db.prepare(`
      SELECT * FROM items ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`SELECT COUNT(*) as count FROM items ${whereSql}`).get(...params).count;

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/stats', (req, res) => {
  try {
    checkExpiredItems();

    const stats = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM items
      GROUP BY status
    `).all();

    const typeStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as count
      FROM items
      GROUP BY type
      ORDER BY count DESC
    `).all();

    const result = {
      total: 0,
      pending: 0,
      claimed: 0,
      returned: 0,
      disposed: 0,
      disputed: 0,
      by_type: typeStats
    };

    stats.forEach(s => {
      result.total += s.count;
      result[s.status] = s.count;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', (req, res) => {
  try {
    checkExpiredItems();

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }

    const claims = db.prepare(`
      SELECT * FROM claims WHERE item_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({ item, claims });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id', upload.single('photo'), (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }

    const {
      type, brand, color, features, location, found_time,
      storage_location, locker_number, is_valuable, storage_period_days, status
    } = req.body;

    const photo = req.file ? '/uploads/' + req.file.filename : item.photo;

    let isValuableValue = null;
    if (is_valuable !== undefined && is_valuable !== null && is_valuable !== '') {
      isValuableValue = (is_valuable === true || is_valuable === '1' || is_valuable === 1) ? 1 : 0;
    }

    const storagePeriodValue = storage_period_days !== undefined && storage_period_days !== ''
      ? (parseInt(storage_period_days) || null)
      : null;

    const stmt = db.prepare(`
      UPDATE items SET
        type = COALESCE(?, type),
        brand = COALESCE(?, brand),
        color = COALESCE(?, color),
        features = COALESCE(?, features),
        location = COALESCE(?, location),
        found_time = COALESCE(?, found_time),
        photo = COALESCE(?, photo),
        storage_location = COALESCE(?, storage_location),
        locker_number = COALESCE(?, locker_number),
        is_valuable = COALESCE(?, is_valuable),
        storage_period_days = COALESCE(?, storage_period_days),
        status = COALESCE(?, status),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    stmt.run(
      type || null, brand || null, color || null, features || null,
      location || null, found_time || null, photo,
      storage_location || null, locker_number || null,
      isValuableValue,
      storagePeriodValue,
      status || null,
      req.params.id
    );

    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', item: updatedItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }

    db.prepare('DELETE FROM claims WHERE item_id = ?').run(req.params.id);
    db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
module.exports.checkExpiredItems = checkExpiredItems;
