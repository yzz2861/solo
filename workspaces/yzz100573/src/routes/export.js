const express = require('express');
const router = express.Router();
const db = require('../database');
const { Parser } = require('json2csv');
const { checkExpiredItems } = require('./items');

function getMonthRange(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return {
    start: startDate.toISOString().split('T')[0] + ' 00:00:00',
    end: endDate.toISOString().split('T')[0] + ' 23:59:59'
  };
}

router.get('/returned', (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份参数（year, month）' });
    }

    const range = getMonthRange(parseInt(year), parseInt(month));

    const returnedItems = db.prepare(`
      SELECT
        c.id as claim_id,
        i.id as item_id,
        i.type,
        i.brand,
        i.color,
        i.features,
        i.location as found_location,
        i.found_time,
        i.storage_location,
        i.locker_number,
        i.is_valuable,
        c.applicant_name,
        c.applicant_phone,
        c.student_id,
        c.receiver_name,
        c.receiver_id_last_four,
        c.handler,
        c.return_time,
        c.verification_level
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.status = 'returned'
        AND c.return_time BETWEEN ? AND ?
      ORDER BY c.return_time DESC
    `).all(range.start, range.end);

    if (format === 'csv') {
      const fields = [
        'claim_id', 'item_id', 'type', 'brand', 'color', 'features',
        'found_location', 'found_time', 'storage_location', 'locker_number',
        'is_valuable', 'applicant_name', 'applicant_phone', 'student_id',
        'receiver_name', 'receiver_id_last_four', 'handler', 'return_time', 'verification_level'
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(returnedItems);

      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`returned_items_${year}_${month}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.json({
        period: `${year}年${month}月`,
        total: returnedItems.length,
        items: returnedItems
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/unclaimed', (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份参数（year, month）' });
    }

    const range = getMonthRange(parseInt(year), parseInt(month));

    checkExpiredItems();

    const unclaimedItems = db.prepare(`
      SELECT
        id,
        type,
        brand,
        color,
        features,
        location,
        found_time,
        storage_location,
        locker_number,
        is_valuable,
        status,
        storage_period_days,
        created_at
      FROM items
      WHERE status IN ('pending', 'disposed', 'claimed', 'disputed')
        AND found_time BETWEEN ? AND ?
      ORDER BY found_time DESC
    `).all(range.start, range.end);

    if (format === 'csv') {
      const fields = [
        'id', 'type', 'brand', 'color', 'features', 'location',
        'found_time', 'storage_location', 'locker_number',
        'is_valuable', 'status', 'storage_period_days', 'created_at'
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(unclaimedItems);

      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`unclaimed_items_${year}_${month}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      const stats = {
        total: unclaimedItems.length,
        pending: unclaimedItems.filter(i => i.status === 'pending').length,
        claimed: unclaimedItems.filter(i => i.status === 'claimed').length,
        disputed: unclaimedItems.filter(i => i.status === 'disputed').length,
        disposed: unclaimedItems.filter(i => i.status === 'disposed').length
      };

      res.json({
        period: `${year}年${month}月`,
        stats,
        items: unclaimedItems
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/disputed', (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份参数（year, month）' });
    }

    const range = getMonthRange(parseInt(year), parseInt(month));

    const disputedClaims = db.prepare(`
      SELECT
        c.id as claim_id,
        i.id as item_id,
        i.type,
        i.brand,
        i.color,
        i.features,
        i.location as found_location,
        i.found_time,
        i.storage_location,
        i.locker_number,
        i.is_valuable,
        c.applicant_name,
        c.applicant_phone,
        c.student_id,
        c.description as claim_description,
        c.status as claim_status,
        c.verification_level,
        c.first_verifier,
        c.second_verifier,
        c.created_at as claim_time
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE i.status = 'disputed'
        AND c.created_at BETWEEN ? AND ?
      ORDER BY c.created_at DESC
    `).all(range.start, range.end);

    const itemGroups = {};
    disputedClaims.forEach(claim => {
      if (!itemGroups[claim.item_id]) {
        itemGroups[claim.item_id] = {
          item_id: claim.item_id,
          type: claim.type,
          brand: claim.brand,
          color: claim.color,
          found_location: claim.found_location,
          found_time: claim.found_time,
          storage_location: claim.storage_location,
          locker_number: claim.locker_number,
          is_valuable: claim.is_valuable,
          claim_count: 0,
          claims: []
        };
      }
      itemGroups[claim.item_id].claim_count++;
      itemGroups[claim.item_id].claims.push({
        claim_id: claim.claim_id,
        applicant_name: claim.applicant_name,
        applicant_phone: claim.applicant_phone,
        student_id: claim.student_id,
        claim_description: claim.claim_description,
        claim_status: claim.claim_status,
        verification_level: claim.verification_level,
        first_verifier: claim.first_verifier,
        second_verifier: claim.second_verifier,
        claim_time: claim.claim_time
      });
    });

    const result = Object.values(itemGroups);

    if (format === 'csv') {
      const fields = [
        'item_id', 'type', 'brand', 'color', 'claim_count',
        'found_location', 'found_time', 'storage_location', 'locker_number',
        'is_valuable'
      ];
      const csvData = result.map(item => ({
        item_id: item.item_id,
        type: item.type,
        brand: item.brand,
        color: item.color,
        claim_count: item.claim_count,
        found_location: item.found_location,
        found_time: item.found_time,
        storage_location: item.storage_location,
        locker_number: item.locker_number,
        is_valuable: item.is_valuable ? '是' : '否'
      }));

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(csvData);

      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`disputed_items_${year}_${month}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.json({
        period: `${year}年${month}月`,
        total_items: result.length,
        total_claims: disputedClaims.length,
        items: result
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/summary', (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '请提供年份和月份参数（year, month）' });
    }

    const range = getMonthRange(parseInt(year), parseInt(month));
    checkExpiredItems();

    const returnedCount = db.prepare(`
      SELECT COUNT(*) as count FROM claims
      WHERE status = 'returned' AND return_time BETWEEN ? AND ?
    `).get(range.start, range.end).count;

    const newItemsCount = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE created_at BETWEEN ? AND ?
    `).get(range.start, range.end).count;

    const newClaimsCount = db.prepare(`
      SELECT COUNT(*) as count FROM claims
      WHERE created_at BETWEEN ? AND ?
    `).get(range.start, range.end).count;

    const pendingItems = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE status = 'pending'
    `).get().count;

    const disposedItems = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE status = 'disposed'
    `).get().count;

    const disputedItems = db.prepare(`
      SELECT COUNT(DISTINCT item_id) as count FROM claims
      WHERE item_id IN (SELECT id FROM items WHERE status = 'disputed')
    `).get().count;

    const byType = db.prepare(`
      SELECT i.type, COUNT(*) as count
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.status = 'returned' AND c.return_time BETWEEN ? AND ?
      GROUP BY i.type
      ORDER BY count DESC
    `).all(range.start, range.end);

    res.json({
      period: `${year}年${month}月`,
      summary: {
        new_items: newItemsCount,
        new_claims: newClaimsCount,
        returned_items: returnedCount,
        pending_items: pendingItems,
        disposed_items: disposedItems,
        disputed_items: disputedItems
      },
      returned_by_type: byType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
