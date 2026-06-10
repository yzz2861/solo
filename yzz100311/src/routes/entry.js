const express = require('express');
const { db } = require('../db');
const { getOrCreateTrip, updateTripAnomalies } = require('../utils/tripService');
const config = require('../config');

const router = express.Router();

router.post('/', (req, res) => {
  const {
    plate_number,
    trip_no,
    driver_name,
    driver_id_card,
    driver_phone,
    entry_time,
    entry_gate,
    tare_weight,
    material,
    origin,
    destination,
    source = 'manual',
    source_batch_no
  } = req.body;

  if (!plate_number || !trip_no || !entry_time) {
    return res.status(400).json({ error: '缺少必填字段: plate_number, trip_no, entry_time' });
  }

  const { trip, created } = getOrCreateTrip(plate_number, trip_no);

  if (!created && source_batch_no) {
    const existingBatch = db.prepare(
      'SELECT id FROM entry_records WHERE trip_id = ? AND source_batch_no = ?'
    ).get(trip.id, source_batch_no);
    if (existingBatch) {
      return res.status(200).json({
        message: '同一批次已存在，未重复生成车次',
        trip_id: trip.id,
        skipped: true
      });
    }
  }

  const entryInfo = db.prepare(`
    INSERT INTO entry_records
    (trip_id, plate_number, trip_no, driver_name, driver_id_card, driver_phone,
     entry_time, entry_gate, tare_weight, material, origin, destination, source, source_batch_no, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, plate_number, trip_no, driver_name, driver_id_card, driver_phone,
    entry_time, entry_gate, tare_weight, material, origin, destination, source, source_batch_no,
    JSON.stringify(req.body)
  );

  const updateFields = [];
  const updateValues = [];

  if (!trip.entry_time || entry_time < trip.entry_time) {
    updateFields.push('entry_time = ?');
    updateValues.push(entry_time);
  }
  if (driver_name && !trip.driver_name) {
    updateFields.push('driver_name = ?');
    updateValues.push(driver_name);
  }
  if (material && !trip.material) {
    updateFields.push('material = ?');
    updateValues.push(material);
  }
  if (origin && !trip.origin) {
    updateFields.push('origin = ?');
    updateValues.push(origin);
  }
  if (destination && !trip.destination) {
    updateFields.push('destination = ?');
    updateValues.push(destination);
  }
  if (tare_weight != null && trip.tare_from_entry == null) {
    updateFields.push('tare_from_entry = ?');
    updateValues.push(tare_weight);
    updateFields.push('tare_weight = ?');
    updateValues.push(tare_weight);
    updateFields.push('has_entry_weighbridge = 1');
  }
  if (!trip.entry_source) {
    updateFields.push('entry_source = ?');
    updateValues.push(source);
  }
  if (!trip.status || trip.status === 'entered') {
    updateFields.push("status = 'loading'");
  }

  if (updateFields.length > 0) {
    updateValues.push(trip.id);
    db.prepare(`
      UPDATE trips SET ${updateFields.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `).run(...updateValues);
  }

  const anomalies = updateTripAnomalies(trip.id);

  const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id);

  res.status(created ? 201 : 200).json({
    message: created ? '进场记录已创建' : '进场记录已追加',
    trip_id: trip.id,
    entry_record_id: entryInfo.lastInsertRowid,
    trip: updatedTrip,
    is_new_trip: created,
    anomalies
  });
});

router.post('/batch', (req, res) => {
  const records = req.body.records || [];
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records 必须是非空数组' });
  }

  const source_batch_no = req.body.source_batch_no;

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const record of records) {
    try {
      const reqMock = {
        body: {
          ...record,
          source_batch_no: source_batch_no || record.source_batch_no
        }
      };
      const { trip, created: isNew } = getOrCreateTrip(record.plate_number, record.trip_no);

      if (!isNew && source_batch_no) {
        const existingBatch = db.prepare(
          'SELECT id FROM entry_records WHERE trip_id = ? AND source_batch_no = ?'
        ).get(trip.id, source_batch_no);
        if (existingBatch) {
          skipped++;
          results.push({ plate_number: record.plate_number, trip_no: record.trip_no, skipped: true });
          continue;
        }
      }

      db.prepare(`
        INSERT INTO entry_records
        (trip_id, plate_number, trip_no, driver_name, driver_id_card, driver_phone,
         entry_time, entry_gate, tare_weight, material, origin, destination, source, source_batch_no, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trip.id, record.plate_number, record.trip_no,
        record.driver_name, record.driver_id_card, record.driver_phone,
        record.entry_time, record.entry_gate, record.tare_weight,
        record.material, record.origin, record.destination,
        record.source || 'batch', source_batch_no || record.source_batch_no,
        JSON.stringify(record)
      );

      db.prepare(`
        UPDATE trips
        SET entry_time = COALESCE(?, entry_time),
            driver_name = COALESCE(?, driver_name),
            material = COALESCE(?, material),
            origin = COALESCE(?, origin),
            destination = COALESCE(?, destination),
            tare_from_entry = COALESCE(?, tare_from_entry),
            tare_weight = COALESCE(?, tare_weight),
            has_entry_weighbridge = CASE WHEN ? IS NOT NULL THEN 1 ELSE has_entry_weighbridge END,
            entry_source = COALESCE(?, entry_source),
            status = CASE WHEN status = 'entered' THEN 'loading' ELSE status END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        record.entry_time, record.driver_name, record.material,
        record.origin, record.destination,
        record.tare_weight, record.tare_weight, record.tare_weight,
        record.source || 'batch', trip.id
      );

      updateTripAnomalies(trip.id);

      created++;
      results.push({ plate_number: record.plate_number, trip_no: record.trip_no, trip_id: trip.id, success: true });
    } catch (e) {
      failed++;
      results.push({ plate_number: record.plate_number, trip_no: record.trip_no, error: e.message });
    }
  }

  res.json({
    total: records.length,
    created,
    skipped,
    failed,
    results
  });
});

router.get('/', (req, res) => {
  const { plate_number, trip_no, start_date, end_date, page = 1, page_size = 20 } = req.query;

  let sql = 'SELECT * FROM entry_records WHERE 1=1';
  const params = [];

  if (plate_number) {
    sql += ' AND plate_number = ?';
    params.push(plate_number);
  }
  if (trip_no) {
    sql += ' AND trip_no = ?';
    params.push(trip_no);
  }
  if (start_date) {
    sql += ' AND entry_time >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND entry_time <= ?';
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY entry_time DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

module.exports = router;
