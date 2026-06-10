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
    exit_time,
    gross_weight,
    tare_weight,
    net_weight,
    weighbridge_no,
    operator,
    source = 'manual',
    source_batch_no
  } = req.body;

  if (!plate_number || !trip_no || !exit_time || gross_weight == null) {
    return res.status(400).json({ error: '缺少必填字段: plate_number, trip_no, exit_time, gross_weight' });
  }

  const { trip } = getOrCreateTrip(plate_number, trip_no);

  if (source_batch_no) {
    const existingBatch = db.prepare(
      'SELECT id FROM exit_weighbridge WHERE trip_id = ? AND source_batch_no = ?'
    ).get(trip.id, source_batch_no);
    if (existingBatch) {
      return res.status(200).json({
        message: '同一批次已存在，未重复生成磅单',
        trip_id: trip.id,
        skipped: true
      });
    }
  }

  const calculatedNet = tare_weight != null ? gross_weight - tare_weight : null;
  const finalNetWeight = net_weight != null ? net_weight : calculatedNet;

  const exitInfo = db.prepare(`
    INSERT INTO exit_weighbridge
    (trip_id, plate_number, trip_no, driver_name, exit_time, gross_weight,
     tare_weight, net_weight, weighbridge_no, operator, source, source_batch_no, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, plate_number, trip_no, driver_name, exit_time, gross_weight,
    tare_weight, finalNetWeight, weighbridge_no, operator, source, source_batch_no,
    JSON.stringify(req.body)
  );

  const updateFields = [];
  const updateValues = [];

  updateFields.push('gross_from_exit = ?');
  updateValues.push(gross_weight);
  updateFields.push('gross_weight = ?');
  updateValues.push(gross_weight);

  if (tare_weight != null) {
    updateFields.push('tare_weight = ?');
    updateValues.push(tare_weight);
  }
  if (finalNetWeight != null) {
    updateFields.push('net_weight = ?');
    updateValues.push(finalNetWeight);
  }
  if (!trip.exit_time || exit_time > trip.exit_time) {
    updateFields.push('exit_time = ?');
    updateValues.push(exit_time);
  }
  if (driver_name && !trip.driver_name) {
    updateFields.push('driver_name = ?');
    updateValues.push(driver_name);
  }
  updateFields.push('has_exit_weighbridge = 1');
  if (!trip.exit_source) {
    updateFields.push('exit_source = ?');
    updateValues.push(source);
  }
  updateFields.push("status = 'exited'");

  updateValues.push(trip.id);
  db.prepare(`
    UPDATE trips SET ${updateFields.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `).run(...updateValues);

  const anomalies = updateTripAnomalies(trip.id);
  const hasWeightAnomaly = anomalies.includes(config.ANOMALY_TYPES.WEIGHT_DIFF_EXCEEDED);

  const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id);

  res.status(201).json({
    message: '出场磅单已记录',
    trip_id: trip.id,
    exit_record_id: exitInfo.lastInsertRowid,
    trip: updatedTrip,
    weight_diff_exceeded: hasWeightAnomaly,
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
      const { trip } = getOrCreateTrip(record.plate_number, record.trip_no);

      if (source_batch_no) {
        const existingBatch = db.prepare(
          'SELECT id FROM exit_weighbridge WHERE trip_id = ? AND source_batch_no = ?'
        ).get(trip.id, source_batch_no);
        if (existingBatch) {
          skipped++;
          results.push({ plate_number: record.plate_number, trip_no: record.trip_no, skipped: true });
          continue;
        }
      }

      const calculatedNet = record.tare_weight != null ? record.gross_weight - record.tare_weight : null;
      const finalNetWeight = record.net_weight != null ? record.net_weight : calculatedNet;

      db.prepare(`
        INSERT INTO exit_weighbridge
        (trip_id, plate_number, trip_no, driver_name, exit_time, gross_weight,
         tare_weight, net_weight, weighbridge_no, operator, source, source_batch_no, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trip.id, record.plate_number, record.trip_no, record.driver_name,
        record.exit_time, record.gross_weight, record.tare_weight,
        finalNetWeight, record.weighbridge_no, record.operator,
        record.source || 'batch', source_batch_no || record.source_batch_no,
        JSON.stringify(record)
      );

      db.prepare(`
        UPDATE trips
        SET gross_from_exit = COALESCE(?, gross_from_exit),
            gross_weight = COALESCE(?, gross_weight),
            tare_weight = COALESCE(?, tare_weight),
            net_weight = COALESCE(?, net_weight),
            exit_time = COALESCE(?, exit_time),
            driver_name = COALESCE(?, driver_name),
            has_exit_weighbridge = 1,
            exit_source = COALESCE(?, exit_source),
            status = 'exited',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        record.gross_weight, record.gross_weight, record.tare_weight,
        finalNetWeight, record.exit_time, record.driver_name,
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

  let sql = 'SELECT * FROM exit_weighbridge WHERE 1=1';
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
    sql += ' AND exit_time >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND exit_time <= ?';
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY exit_time DESC LIMIT ? OFFSET ?';
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
