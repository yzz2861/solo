const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware, logOperation } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DEPOSIT_AMOUNT = parseFloat(process.env.DEPOSIT_AMOUNT || 50);

router.use(authMiddleware);

function checkSameRoomDailyReissues(roomId, excludeReissueId = null) {
  const today = new Date().toISOString().split('T')[0];
  let sql = `
    SELECT COUNT(*) as count 
    FROM card_reissues 
    WHERE room_id = ? AND DATE(reported_at) = ? AND status != 'cancelled'
  `;
  const params = [roomId, today];
  
  if (excludeReissueId) {
    sql += ' AND id != ?';
    params.push(excludeReissueId);
  }
  
  const result = db.prepare(sql).get(...params);
  return result.count;
}

router.post('/', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { oldCardNumber, roomId, ownerId, notes, depositAmount, payDepositNow } = req.body;
  
  if (!oldCardNumber || !roomId || !ownerId) {
    return res.status(400).json({ error: '旧卡号、房间ID、业主ID不能为空' });
  }

  const oldCard = db.prepare('SELECT * FROM access_cards WHERE card_number = ?').get(oldCardNumber);
  if (!oldCard) {
    return res.status(404).json({ error: '旧卡号不存在' });
  }
  
  if (oldCard.room_id != roomId || oldCard.owner_id != ownerId) {
    return res.status(400).json({ error: '旧卡号与房间或业主信息不匹配' });
  }
  
  if (oldCard.status === 'disabled' || oldCard.status === 'replaced') {
    return res.status(400).json({ error: '该卡已停用或已更换，请检查' });
  }

  const pendingReissue = db.prepare(`
    SELECT * FROM card_reissues 
    WHERE old_card_id = ? AND status IN ('pending_stop', 'stopped', 'new_card_issued')
    LIMIT 1
  `).get(oldCard.id);
  if (pendingReissue) {
    return res.status(400).json({ 
      error: '该卡已有未完成的补办流程',
      reissueId: pendingReissue.id,
      status: pendingReissue.status
    });
  }

  const dailyCount = checkSameRoomDailyReissues(roomId);
  let warningFlags = null;
  if (dailyCount >= 1) {
    warningFlags = `same_room_daily_count_${dailyCount + 1}`;
  }

  const actualDeposit = depositAmount || DEPOSIT_AMOUNT;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE access_cards SET status = 'lost', lost_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(oldCard.id);
    
    const result = db.prepare(`
      INSERT INTO card_reissues 
      (old_card_id, room_id, owner_id, status, reported_by, deposit_amount, deposit_status, warning_flags, notes)
      VALUES (?, ?, ?, 'pending_stop', ?, ?, ?, ?, ?)
    `).run(
      oldCard.id, roomId, ownerId, req.user.id, 
      actualDeposit, 
      payDepositNow ? 'paid' : 'unpaid',
      warningFlags, notes || null
    );

    if (payDepositNow) {
      db.prepare(`
        INSERT INTO deposit_records (reissue_id, type, amount, handler, notes)
        VALUES (?, 'collect', ?, ?, ?)
      `).run(result.lastInsertRowid, actualDeposit, req.user.id, '补办时收取押金');
    }

    return db.prepare(`
      SELECT cr.*, 
             oc.card_number as old_card_number,
             r.room_number, r.building, r.unit,
             o.name as owner_name, o.phone,
             u1.real_name as reported_by_name,
             CASE WHEN cr.warning_flags IS NOT NULL THEN 1 ELSE 0 END as has_warning
      FROM card_reissues cr
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      JOIN users u1 ON cr.reported_by = u1.id
      WHERE cr.id = ?
    `).get(result.lastInsertRowid);
  });

  try {
    const reissue = tx();
    
    logOperation(req.user.id, 'create_reissue', 'card_reissue', reissue.id, {
      oldCardNumber,
      roomNumber: reissue.room_number,
      depositAmount: actualDeposit,
      dailyCount: dailyCount + 1
    }, req.ip);

    const response = { ...reissue };
    if (reissue.has_warning) {
      response.warning = `⚠️ 提醒：该房号今日已补办 ${dailyCount} 次，本次为第 ${dailyCount + 1} 次，请核实情况`;
    }

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: '创建补办记录失败: ' + err.message });
  }
});

router.get('/', (req, res) => {
  const { status, roomId, ownerName, startDate, endDate, cardNumber, view } = req.query;
  
  const userRole = req.user.role;
  
  let sql = `
    SELECT cr.*, 
           oc.card_number as old_card_number,
           nc.card_number as new_card_number,
           r.room_number, r.building, r.unit,
           o.name as owner_name, o.phone,
           u1.real_name as reported_by_name,
           u2.real_name as stopped_by_name,
           u3.real_name as new_issued_by_name,
           u4.real_name as deposit_handler_name,
           CASE WHEN cr.warning_flags IS NOT NULL THEN 1 ELSE 0 END as has_warning
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    LEFT JOIN access_cards nc ON cr.new_card_id = nc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u1 ON cr.reported_by = u1.id
    LEFT JOIN users u2 ON cr.stopped_by = u2.id
    LEFT JOIN users u3 ON cr.new_issued_by = u3.id
    LEFT JOIN users u4 ON cr.deposit_handler = u4.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += ' AND cr.status = ?';
    params.push(status);
  }
  if (roomId) {
    sql += ' AND cr.room_id = ?';
    params.push(roomId);
  }
  if (ownerName) {
    sql += ' AND o.name LIKE ?';
    params.push(`%${ownerName}%`);
  }
  if (cardNumber) {
    sql += ' AND (oc.card_number LIKE ? OR nc.card_number LIKE ?)';
    params.push(`%${cardNumber}%`, `%${cardNumber}%`);
  }
  if (startDate) {
    sql += ' AND DATE(cr.reported_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND DATE(cr.reported_at) <= ?';
    params.push(endDate);
  }

  if (view === 'security') {
    sql += ' AND cr.status IN (?, ?, ?)';
    params.push('pending_stop', 'stopped', 'new_card_issued');
  }
  
  sql += ' ORDER BY cr.reported_at DESC LIMIT 500';
  
  let reissues = db.prepare(sql).all(...params);
  
  if (userRole === 'security') {
    reissues = reissues.map(r => {
      const { deposit_amount, deposit_status, deposit_paid_at, deposit_refunded_at, deposit_handler, 
              deposit_handler_name, ...rest } = r;
      return rest;
    });
  }
  
  res.json(reissues);
});

router.get('/disabled-cards-list', roleMiddleware('security', 'receptionist', 'admin'), (req, res) => {
  const { startDate, endDate, includeNewlyIssued } = req.query;
  
  let sql = `
    SELECT 
      c.card_number,
      c.status,
      c.disabled_at,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      o.phone,
      u.real_name as disabled_by_name
    FROM access_cards c
    JOIN rooms r ON c.room_id = r.id
    JOIN owners o ON c.owner_id = o.id
    LEFT JOIN users u ON c.disabled_by = u.id
    WHERE c.status IN ('disabled', 'lost')
  `;
  const params = [];
  
  if (startDate) {
    sql += ' AND DATE(COALESCE(c.disabled_at, c.lost_at)) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND DATE(COALESCE(c.disabled_at, c.lost_at)) <= ?';
    params.push(endDate);
  }
  
  sql += ' ORDER BY COALESCE(c.disabled_at, c.lost_at) DESC LIMIT 500';
  
  let result = { disabledCards: db.prepare(sql).all(...params) };
  
  if (includeNewlyIssued === 'true') {
    let newCardSql = `
      SELECT 
        cr.id as reissue_id,
        nc.card_number,
        nc.issued_at,
        nc.status,
        r.room_number,
        r.building,
        r.unit,
        o.name as owner_name,
        oc.card_number as old_card_number,
        oc.status as old_card_status
      FROM card_reissues cr
      JOIN access_cards nc ON cr.new_card_id = nc.id
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      WHERE cr.new_card_id IS NOT NULL
    `;
    const ncParams = [];
    if (startDate) {
      newCardSql += ' AND DATE(cr.new_issued_at) >= ?';
      ncParams.push(startDate);
    }
    if (endDate) {
      newCardSql += ' AND DATE(cr.new_issued_at) <= ?';
      ncParams.push(endDate);
    }
    newCardSql += ' ORDER BY cr.new_issued_at DESC LIMIT 500';
    result.newlyIssuedCards = db.prepare(newCardSql).all(...ncParams);
  }
  
  res.json(result);
});

router.get('/pending-stops', roleMiddleware('security', 'receptionist', 'admin'), (req, res) => {
  const reissues = db.prepare(`
    SELECT cr.id, cr.reported_at, cr.status,
           oc.card_number as old_card_number, oc.status as old_card_status,
           r.room_number, r.building, r.unit,
           o.name as owner_name, o.phone,
           u1.real_name as reported_by_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    JOIN users u1 ON cr.reported_by = u1.id
    WHERE cr.status = 'pending_stop' OR (cr.status = 'stopped' AND cr.new_card_id IS NULL)
    ORDER BY cr.reported_at ASC
  `).all();
  
  res.json(reissues);
});

router.get('/:id', (req, res) => {
  const userRole = req.user.role;
  
  let reissue = db.prepare(`
    SELECT cr.*, 
           oc.card_number as old_card_number,
           oc.status as old_card_status,
           nc.card_number as new_card_number,
           nc.status as new_card_status,
           r.room_number, r.building, r.unit,
           o.name as owner_name, o.phone,
           u1.real_name as reported_by_name,
           u2.real_name as stopped_by_name,
           u3.real_name as new_issued_by_name,
           u4.real_name as deposit_handler_name,
           CASE WHEN cr.warning_flags IS NOT NULL THEN 1 ELSE 0 END as has_warning
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    LEFT JOIN access_cards nc ON cr.new_card_id = nc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u1 ON cr.reported_by = u1.id
    LEFT JOIN users u2 ON cr.stopped_by = u2.id
    LEFT JOIN users u3 ON cr.new_issued_by = u3.id
    LEFT JOIN users u4 ON cr.deposit_handler = u4.id
    WHERE cr.id = ?
  `).get(req.params.id);
  
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }

  if (reissue.has_warning) {
    const dailyCount = checkSameRoomDailyReissues(reissue.room_id, reissue.id);
    reissue.warningMessage = `⚠️ 该房号今日累计补办 ${dailyCount + 1} 次`;
  }

  if (userRole === 'security') {
    const { deposit_amount, deposit_status, deposit_paid_at, deposit_refunded_at, deposit_handler, 
            deposit_handler_name, notes, ...rest } = reissue;
    reissue = rest;
  } else {
    const depositRecords = db.prepare(`
      SELECT dr.*, u.real_name as handler_name
      FROM deposit_records dr
      JOIN users u ON dr.handler = u.id
      WHERE dr.reissue_id = ?
      ORDER BY dr.handled_at ASC
    `).all(req.params.id);
    reissue.depositRecords = depositRecords;
  }
  
  res.json(reissue);
});

router.post('/:id/confirm-stop', roleMiddleware('security', 'receptionist', 'admin'), (req, res) => {
  const reissue = db.prepare('SELECT * FROM card_reissues WHERE id = ?').get(req.params.id);
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }
  if (reissue.status !== 'pending_stop') {
    return res.status(400).json({ error: '当前状态不能确认停用，状态: ' + reissue.status });
  }

  const oldCard = db.prepare('SELECT * FROM access_cards WHERE id = ?').get(reissue.old_card_id);
  
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE access_cards 
      SET status = 'disabled', disabled_at = CURRENT_TIMESTAMP, disabled_by = ?
      WHERE id = ?
    `).run(req.user.id, reissue.old_card_id);
    
    db.prepare(`
      UPDATE card_reissues 
      SET status = 'stopped', stopped_by = ?, stopped_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, reissue.id);
  });

  try {
    tx();
    logOperation(req.user.id, 'confirm_card_stop', 'card_reissue', reissue.id, { oldCardId: reissue.old_card_id }, req.ip);
    res.json({ message: '旧卡已确认停用', oldCardNumber: oldCard.card_number });
  } catch (err) {
    res.status(500).json({ error: '确认停用失败: ' + err.message });
  }
});

router.post('/:id/issue-new-card', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { newCardNumber } = req.body;
  
  if (!newCardNumber) {
    return res.status(400).json({ error: '新卡号不能为空' });
  }

  const reissue = db.prepare('SELECT * FROM card_reissues WHERE id = ?').get(req.params.id);
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }
  if (reissue.status !== 'stopped') {
    return res.status(400).json({ 
      error: '旧卡未停用，不能发放新卡。当前状态: ' + reissue.status + '，请先让保安确认停用旧卡'
    });
  }
  if (reissue.new_card_id) {
    return res.status(400).json({ error: '该补办记录已发放过新卡' });
  }

  const existingCard = db.prepare('SELECT * FROM access_cards WHERE card_number = ?').get(newCardNumber);
  if (existingCard) {
    return res.status(400).json({ error: '该新卡号已存在，请更换卡号' });
  }

  const tx = db.transaction(() => {
    const newCardResult = db.prepare(`
      INSERT INTO access_cards (card_number, owner_id, room_id, status, issued_at)
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `).run(newCardNumber, reissue.owner_id, reissue.room_id);
    
    db.prepare(`
      UPDATE card_reissues 
      SET new_card_id = ?, status = 'new_card_issued', new_issued_by = ?, new_issued_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newCardResult.lastInsertRowid, req.user.id, reissue.id);
    
    db.prepare(`
      UPDATE access_cards SET status = 'replaced' WHERE id = ?
    `).run(reissue.old_card_id);
  });

  try {
    tx();
    logOperation(req.user.id, 'issue_new_card', 'card_reissue', reissue.id, { newCardNumber }, req.ip);
    res.json({ 
      message: '新卡已发放并生效',
      newCardNumber,
      oldCardReplaced: true
    });
  } catch (err) {
    res.status(500).json({ error: '发放新卡失败: ' + err.message });
  }
});

router.post('/:id/complete', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const reissue = db.prepare('SELECT * FROM card_reissues WHERE id = ?').get(req.params.id);
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }
  if (reissue.status !== 'new_card_issued') {
    return res.status(400).json({ error: '当前状态不能完成补办，状态: ' + reissue.status });
  }

  db.prepare(`
    UPDATE card_reissues SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(reissue.id);
  
  logOperation(req.user.id, 'complete_reissue', 'card_reissue', reissue.id, {}, req.ip);
  
  res.json({ message: '补办流程已完成' });
});

router.post('/:id/deposit', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { action, amount, notes } = req.body;
  
  if (!action || !['collect', 'refund'].includes(action)) {
    return res.status(400).json({ error: '操作类型必须是 collect 或 refund' });
  }
  
  const reissue = db.prepare('SELECT * FROM card_reissues WHERE id = ?').get(req.params.id);
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }

  const actualAmount = amount || reissue.deposit_amount;

  if (action === 'collect') {
    if (reissue.deposit_status === 'paid' || reissue.deposit_status === 'refunded') {
      return res.status(400).json({ error: '押金已收取或已退还，不能重复收取' });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO deposit_records (reissue_id, type, amount, handler, notes)
        VALUES (?, 'collect', ?, ?, ?)
      `).run(reissue.id, actualAmount, req.user.id, notes || '收取押金');
      
      db.prepare(`
        UPDATE card_reissues 
        SET deposit_status = 'paid', deposit_paid_at = CURRENT_TIMESTAMP, deposit_handler = ?
        WHERE id = ?
      `).run(req.user.id, reissue.id);
    });
    
    try {
      tx();
      logOperation(req.user.id, 'collect_deposit', 'card_reissue', reissue.id, { amount: actualAmount }, req.ip);
      return res.json({ message: '押金收取成功', amount: actualAmount });
    } catch (err) {
      return res.status(500).json({ error: '收取押金失败: ' + err.message });
    }
  }
  
  if (action === 'refund') {
    const { noRefundReason } = req.body;
    
    if (reissue.deposit_status === 'refunded' || reissue.deposit_status === 'no_refund') {
      return res.status(400).json({ error: '押金已处理' });
    }
    if (reissue.deposit_status !== 'paid') {
      return res.status(400).json({ error: '押金尚未收取，无法退还' });
    }

    if (noRefundReason) {
      db.prepare(`
        INSERT INTO deposit_records (reissue_id, type, amount, handler, notes)
        VALUES (?, 'refund', 0, ?, ?)
      `).run(reissue.id, req.user.id, noRefundReason);
      
      db.prepare(`
        UPDATE card_reissues 
        SET deposit_status = 'no_refund', deposit_refunded_at = CURRENT_TIMESTAMP, deposit_handler = ?, notes = COALESCE(notes, '') || '\n不退押金原因: ' || ?
        WHERE id = ?
      `).run(req.user.id, noRefundReason, reissue.id);
      
      logOperation(req.user.id, 'deposit_no_refund', 'card_reissue', reissue.id, { reason: noRefundReason }, req.ip);
      return res.json({ message: '已记录押金不退原因', noRefundReason });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO deposit_records (reissue_id, type, amount, handler, notes)
        VALUES (?, 'refund', ?, ?, ?)
      `).run(reissue.id, actualAmount, req.user.id, notes || '退还押金');
      
      db.prepare(`
        UPDATE card_reissues 
        SET deposit_status = 'refunded', deposit_refunded_at = CURRENT_TIMESTAMP, deposit_handler = ?
        WHERE id = ?
      `).run(req.user.id, reissue.id);
    });
    
    try {
      tx();
      logOperation(req.user.id, 'refund_deposit', 'card_reissue', reissue.id, { amount: actualAmount }, req.ip);
      return res.json({ message: '押金退还成功', amount: actualAmount });
    } catch (err) {
      return res.status(500).json({ error: '退还押金失败: ' + err.message });
    }
  }
});

router.get('/:id/receipt', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const reissue = db.prepare(`
    SELECT cr.*, 
           oc.card_number as old_card_number,
           nc.card_number as new_card_number,
           r.room_number, r.building, r.unit,
           o.name as owner_name, o.phone,
           u1.real_name as reported_by_name,
           u2.real_name as stopped_by_name,
           u3.real_name as new_issued_by_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    LEFT JOIN access_cards nc ON cr.new_card_id = nc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u1 ON cr.reported_by = u1.id
    LEFT JOIN users u2 ON cr.stopped_by = u2.id
    LEFT JOIN users u3 ON cr.new_issued_by = u3.id
    WHERE cr.id = ?
  `).get(req.params.id);
  
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }

  const statusMap = {
    'pending_stop': '挂失待停用',
    'stopped': '旧卡已停用',
    'new_card_issued': '新卡已发放',
    'completed': '补办完成',
    'cancelled': '已取消',
    'old_card_recovered': '旧卡已找回'
  };

  res.setHeader('Content-Type', 'application/pdf');
  const safeFileName = `reissue_receipt_${reissue.room_number}_${reissue.id}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text('门禁卡补办回执', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(10).text(`回执编号: BR-${String(reissue.id).padStart(6, '0')}`);
  doc.text(`打印时间: ${new Date().toLocaleString('zh-CN')}`);
  doc.moveDown();
  
  doc.fontSize(12).text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  doc.moveDown(0.5);
  
  doc.fontSize(11).text(`业主姓名: ${reissue.owner_name}`);
  doc.text(`联系电话: ${reissue.phone || '-'}`);
  doc.text(`房间信息: ${reissue.building}栋 ${reissue.unit ? reissue.unit + '单元 ' : ''}${reissue.room_number}`);
  doc.moveDown();
  
  doc.text(`旧卡卡号: ${reissue.old_card_number}`);
  doc.text(`挂失时间: ${new Date(reissue.reported_at).toLocaleString('zh-CN')}`);
  doc.text(`经办人: ${reissue.reported_by_name}`);
  doc.moveDown();
  
  if (reissue.stopped_at) {
    doc.text(`✅ 旧卡停用时间: ${new Date(reissue.stopped_at).toLocaleString('zh-CN')}`);
    doc.text(`   停用人: ${reissue.stopped_by_name || '-'}`);
  } else {
    doc.text(`⏳ 旧卡状态: 待停用`);
  }
  doc.moveDown();
  
  if (reissue.new_card_number) {
    doc.text(`新卡卡号: ${reissue.new_card_number}`);
    doc.text(`新卡发放时间: ${new Date(reissue.new_issued_at).toLocaleString('zh-CN')}`);
    doc.text(`发放人: ${reissue.new_issued_by_name || '-'}`);
  }
  doc.moveDown();
  
  doc.text(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  doc.moveDown(0.5);
  doc.fontSize(11).text(`押金金额: ¥${reissue.deposit_amount.toFixed(2)}`);
  const depositStatusMap = {
    'unpaid': '未缴纳',
    'paid': '已缴纳',
    'refunded': '已退还',
    'no_refund': '不予退还'
  };
  doc.text(`押金状态: ${depositStatusMap[reissue.deposit_status]}`);
  if (reissue.deposit_paid_at) {
    doc.text(`收取时间: ${new Date(reissue.deposit_paid_at).toLocaleString('zh-CN')}`);
  }
  if (reissue.deposit_refunded_at) {
    doc.text(`处理时间: ${new Date(reissue.deposit_refunded_at).toLocaleString('zh-CN')}`);
  }
  doc.moveDown();
  
  doc.text(`补办状态: ${statusMap[reissue.status]}`);
  if (reissue.notes) {
    doc.text(`备注: ${reissue.notes}`);
  }
  doc.moveDown(2);
  
  doc.fontSize(9).text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  doc.text('温馨提示：请妥善保管好您的门禁卡，押金凭此回执退还。');
  doc.text('如有问题请联系物业服务中心。', { align: 'left' });
  
  doc.moveDown(1);
  doc.fontSize(10).text('业主签字: _______________', 40, doc.y);
  doc.text('经办人签字: _______________', 250, doc.y - 14);

  doc.end();
  
  logOperation(req.user.id, 'print_receipt', 'card_reissue', reissue.id, {}, req.ip);
});

router.post('/:id/cancel', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const reissue = db.prepare('SELECT * FROM card_reissues WHERE id = ?').get(req.params.id);
  if (!reissue) {
    return res.status(404).json({ error: '补办记录不存在' });
  }
  if (reissue.status === 'completed' || reissue.status === 'new_card_issued') {
    return res.status(400).json({ error: '已发放新卡的补办记录不能取消' });
  }

  const tx = db.transaction(() => {
    const oldCard = db.prepare('SELECT * FROM access_cards WHERE id = ?').get(reissue.old_card_id);
    if (oldCard.status === 'lost' || oldCard.status === 'disabled') {
      db.prepare(`
        UPDATE access_cards SET status = 'active', disabled_at = NULL, disabled_by = NULL WHERE id = ?
      `).run(reissue.old_card_id);
    }
    
    db.prepare(`
      UPDATE card_reissues SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(reissue.id);
  });

  try {
    tx();
    logOperation(req.user.id, 'cancel_reissue', 'card_reissue', reissue.id, {}, req.ip);
    res.json({ message: '补办记录已取消，旧卡已恢复使用' });
  } catch (err) {
    res.status(500).json({ error: '取消补办失败: ' + err.message });
  }
});

module.exports = router;
