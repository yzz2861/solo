const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkExpiredItems } = require('./items');

router.post('/', (req, res) => {
  try {
    checkExpiredItems();

    const { item_id, applicant_name, applicant_phone, student_id, id_last_four, description } = req.body;

    if (!item_id || !applicant_name || !applicant_phone || !description) {
      return res.status(400).json({ error: '缺少必填字段：item_id, applicant_name, applicant_phone, description' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }

    if (item.status === 'returned') {
      return res.status(400).json({ error: '该物品已归还，无法申请认领' });
    }

    if (item.status === 'disposed') {
      return res.status(400).json({ error: '该物品已超过保管期，转为待处置状态' });
    }

    const existingClaims = db.prepare(`
      SELECT COUNT(*) as count FROM claims
      WHERE item_id = ? AND status IN ('pending', 'verified', 'approved')
    `).get(item_id).count;

    const stmt = db.prepare(`
      INSERT INTO claims (item_id, applicant_name, applicant_phone, student_id, id_last_four, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(item_id, applicant_name, applicant_phone, student_id || null, id_last_four || null, description);

    if (existingClaims >= 1) {
      db.prepare(`UPDATE items SET status = 'disputed', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(item_id);
    } else if (item.status === 'pending') {
      db.prepare(`UPDATE items SET status = 'claimed', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(item_id);
    }

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(result.lastInsertRowid);
    const statusText = existingClaims >= 1
      ? '申请提交成功，已有多人申请该物品，已进入争议核验流程'
      : '申请提交成功，等待核验';

    res.status(201).json({ message: statusText, claim });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/', (req, res) => {
  try {
    const { status, item_id, applicant_phone, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }
    if (item_id) {
      whereClauses.push('c.item_id = ?');
      params.push(item_id);
    }
    if (applicant_phone) {
      whereClauses.push('c.applicant_phone = ?');
      params.push(applicant_phone);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const claims = db.prepare(`
      SELECT c.*, i.type, i.brand, i.color, i.photo, i.storage_location, i.locker_number, i.is_valuable
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM claims c ${whereSql}
    `).get(...params).count;

    res.json({
      claims,
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

router.get('/:id', (req, res) => {
  try {
    const claim = db.prepare(`
      SELECT c.*, i.type, i.brand, i.color, i.features, i.location, i.found_time,
             i.photo, i.storage_location, i.locker_number, i.is_valuable, i.status as item_status
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: '申请记录不存在' });
    }

    res.json({ claim });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/verify/first', (req, res) => {
  try {
    const { verifier, pass, reject_reason } = req.body;

    if (!verifier) {
      return res.status(400).json({ error: '缺少核验人信息' });
    }

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: '申请记录不存在' });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({ error: '该申请状态不允许初次核验' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(claim.item_id);

    if (pass) {
      if (item.is_valuable) {
        db.prepare(`
          UPDATE claims SET
            status = 'first_verified',
            verification_level = 1,
            first_verifier = ?,
            first_verify_time = datetime('now', 'localtime'),
            updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(verifier, req.params.id);

        res.json({ message: '初次核验通过，贵重物品需进行二次核验', need_second_verify: true });
      } else {
        db.prepare(`
          UPDATE claims SET
            status = 'verified',
            verification_level = 1,
            first_verifier = ?,
            first_verify_time = datetime('now', 'localtime'),
            updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(verifier, req.params.id);

        res.json({ message: '核验通过，可安排领取', need_second_verify: false });
      }
    } else {
      db.prepare(`
        UPDATE claims SET
          status = 'rejected',
          first_verifier = ?,
          first_verify_time = datetime('now', 'localtime'),
          reject_reason = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(verifier, reject_reason || '核验不通过', req.params.id);

      const pendingCount = db.prepare(`
        SELECT COUNT(*) as count FROM claims
        WHERE item_id = ? AND status IN ('pending', 'verified', 'first_verified', 'approved')
      `).get(claim.item_id).count;

      if (pendingCount === 0) {
        db.prepare(`UPDATE items SET status = 'pending', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(claim.item_id);
      }

      res.json({ message: '核验已拒绝' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/verify/second', (req, res) => {
  try {
    const { verifier, pass, reject_reason } = req.body;

    if (!verifier) {
      return res.status(400).json({ error: '缺少核验人信息' });
    }

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: '申请记录不存在' });
    }

    if (claim.status !== 'first_verified') {
      return res.status(400).json({ error: '该申请状态不允许二次核验' });
    }

    if (pass) {
      db.prepare(`
        UPDATE claims SET
          status = 'verified',
          verification_level = 2,
          second_verifier = ?,
          second_verify_time = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(verifier, req.params.id);

      res.json({ message: '二次核验通过，可安排领取' });
    } else {
      db.prepare(`
        UPDATE claims SET
          status = 'rejected',
          second_verifier = ?,
          second_verify_time = datetime('now', 'localtime'),
          reject_reason = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(verifier, reject_reason || '二次核验不通过', req.params.id);

      const pendingCount = db.prepare(`
        SELECT COUNT(*) as count FROM claims
        WHERE item_id = ? AND status IN ('pending', 'verified', 'first_verified', 'approved')
      `).get(claim.item_id).count;

      if (pendingCount === 0) {
        db.prepare(`UPDATE items SET status = 'pending', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(claim.item_id);
      }

      res.json({ message: '二次核验未通过' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/return', (req, res) => {
  try {
    const { handler, receiver_name, receiver_id_last_four } = req.body;

    if (!handler || !receiver_name || !receiver_id_last_four) {
      return res.status(400).json({ error: '缺少必填字段：handler, receiver_name, receiver_id_last_four' });
    }

    if (receiver_id_last_four.length !== 4 || !/^\d+$/.test(receiver_id_last_four)) {
      return res.status(400).json({ error: '证件后四位必须是4位数字' });
    }

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: '申请记录不存在' });
    }

    if (claim.status !== 'verified') {
      return res.status(400).json({ error: '该申请尚未通过核验，无法办理归还' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(claim.item_id);
    if (item.is_valuable && claim.verification_level < 2) {
      return res.status(400).json({ error: '贵重物品必须经过二次核验后才能归还' });
    }

    const updateClaim = db.prepare(`
      UPDATE claims SET
        status = 'returned',
        receiver_name = ?,
        receiver_id_last_four = ?,
        handler = ?,
        return_time = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    updateClaim.run(receiver_name, receiver_id_last_four, handler, req.params.id);

    db.prepare(`
      UPDATE items SET status = 'returned', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(claim.item_id);

    db.prepare(`
      UPDATE claims SET status = 'closed', updated_at = datetime('now', 'localtime')
      WHERE item_id = ? AND id != ? AND status != 'returned'
    `).run(claim.item_id, req.params.id);

    const updatedClaim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);

    res.json({
      message: '物品已成功归还',
      claim: updatedClaim,
      receiver: {
        name: receiver_name,
        id_last_four: receiver_id_last_four
      },
      handler
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/by-phone/:phone', (req, res) => {
  try {
    const claims = db.prepare(`
      SELECT c.*, i.type, i.brand, i.color, i.photo, i.status as item_status
      FROM claims c
      LEFT JOIN items i ON c.item_id = i.id
      WHERE c.applicant_phone = ?
      ORDER BY c.created_at DESC
    `).all(req.params.phone);

    res.json({ claims });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
