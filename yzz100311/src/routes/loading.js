const express = require('express');
const { db } = require('../db');
const { getOrCreateTrip, updateTripAnomalies } = require('../utils/tripService');
const config = require('../config');

const router = express.Router();

function getLastStartLoading(tripId) {
  return db.prepare(`
    SELECT * FROM loading_records
    WHERE trip_id = ? AND loading_action = 'start'
    ORDER BY loading_time DESC LIMIT 1
  `).get(tripId);
}

function getLastCompleteLoading(tripId) {
  return db.prepare(`
    SELECT * FROM loading_records
    WHERE trip_id = ? AND loading_action = 'complete'
    ORDER BY loading_time DESC LIMIT 1
  `).get(tripId);
}

router.post('/start', (req, res) => {
  const {
    plate_number,
    trip_no,
    loading_time,
    loader,
    loading_point,
    operator,
    source = 'manual',
    source_batch_no
  } = req.body;

  if (!plate_number || !trip_no || !loading_time) {
    return res.status(400).json({ error: '缺少必填字段: plate_number, trip_no, loading_time' });
  }

  const { trip } = getOrCreateTrip(plate_number, trip_no);

  if (source_batch_no) {
    const existingBatch = db.prepare(
      `SELECT id FROM loading_records WHERE trip_id = ? AND source_batch_no = ? AND loading_action = 'start'`
    ).get(trip.id, source_batch_no);
    if (existingBatch) {
      return res.status(200).json({
        message: '同一批次已存在，未重复生成装载开始记录',
        trip_id: trip.id,
        skipped: true
      });
    }
  }

  const loadingInfo = db.prepare(`
    INSERT INTO loading_records
    (trip_id, plate_number, trip_no, loading_action, loading_time,
     loader, loading_point, operator, source, source_batch_no, raw_data)
    VALUES (?, ?, ?, 'start', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, plate_number, trip_no, loading_time,
    loader, loading_point, operator, source, source_batch_no,
    JSON.stringify(req.body)
  );

  const updateFields = [];
  const updateValues = [];

  if (trip.status !== config.STATUS.EXITED && trip.status !== config.STATUS.REVIEWED) {
    updateFields.push('status = ?');
    updateValues.push(config.STATUS.LOADING);
  }
  if (!trip.entry_time) {
    updateFields.push('entry_time = ?');
    updateValues.push(loading_time);
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

  res.status(201).json({
    message: '装载开始已记录',
    trip_id: trip.id,
    loading_record_id: loadingInfo.lastInsertRowid,
    trip: updatedTrip,
    anomalies
  });
});

router.post('/start/batch', (req, res) => {
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
          `SELECT id FROM loading_records WHERE trip_id = ? AND source_batch_no = ? AND loading_action = 'start'`
        ).get(trip.id, source_batch_no);
        if (existingBatch) {
          skipped++;
          results.push({ plate_number: record.plate_number, trip_no: record.trip_no, skipped: true });
          continue;
        }
      }

      db.prepare(`
        INSERT INTO loading_records
        (trip_id, plate_number, trip_no, loading_action, loading_time,
         loader, loading_point, operator, source, source_batch_no, raw_data)
        VALUES (?, ?, ?, 'start', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trip.id, record.plate_number, record.trip_no, record.loading_time,
        record.loader, record.loading_point, record.operator,
        record.source || 'batch', source_batch_no || record.source_batch_no,
        JSON.stringify(record)
      );

      db.prepare(`
        UPDATE trips
        SET status = CASE WHEN status NOT IN ('exited', 'reviewed') THEN 'loading' ELSE status END,
            entry_time = COALESCE(entry_time, ?),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(record.loading_time, trip.id);

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

router.post('/complete', (req, res) => {
  const {
    plate_number,
    trip_no,
    loading_time,
    loaded_weight,
    loader,
    loading_point,
    operator,
    source = 'manual',
    source_batch_no
  } = req.body;

  if (!plate_number || !trip_no || !loading_time) {
    return res.status(400).json({ error: '缺少必填字段: plate_number, trip_no, loading_time' });
  }

  const { trip } = getOrCreateTrip(plate_number, trip_no);

  if (source_batch_no) {
    const existingBatch = db.prepare(
      `SELECT id FROM loading_records WHERE trip_id = ? AND source_batch_no = ? AND loading_action = 'complete'`
    ).get(trip.id, source_batch_no);
    if (existingBatch) {
      return res.status(200).json({
        message: '同一批次已存在，未重复生成装载完成记录',
        trip_id: trip.id,
        skipped: true
      });
    }
  }

  const lastStart = getLastStartLoading(trip.id);
  let loadingDuration = null;
  if (lastStart) {
    const startMs = new Date(lastStart.loading_time).getTime();
    const completeMs = new Date(loading_time).getTime();
    if (!isNaN(startMs) && !isNaN(completeMs) && completeMs >= startMs) {
      loadingDuration = (completeMs - startMs) / 60000;
    }
  }

  const loadingInfo = db.prepare(`
    INSERT INTO loading_records
    (trip_id, plate_number, trip_no, loading_action, loading_time,
     loaded_weight, loading_duration, loader, loading_point, operator,
     source, source_batch_no, raw_data)
    VALUES (?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, plate_number, trip_no, loading_time,
    loaded_weight, loadingDuration, loader, loading_point, operator,
    source, source_batch_no,
    JSON.stringify(req.body)
  );

  const updateFields = [];
  const updateValues = [];

  updateFields.push('loading_time = ?');
  updateValues.push(loading_time);

  if (loaded_weight != null) {
    if (trip.gross_weight == null && trip.tare_weight != null) {
      const calcGross = loaded_weight + trip.tare_weight;
      updateFields.push('gross_weight = ?');
      updateValues.push(calcGross);
      updateFields.push('net_weight = ?');
      updateValues.push(loaded_weight);
    } else if (trip.net_weight == null) {
      updateFields.push('net_weight = ?');
      updateValues.push(loaded_weight);
    }
  }

  if (trip.status !== config.STATUS.EXITED && trip.status !== config.STATUS.REVIEWED) {
    updateFields.push('status = ?');
    updateValues.push(config.STATUS.LOADED);
  }
  if (!trip.entry_time) {
    updateFields.push('entry_time = ?');
    updateValues.push(loading_time);
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

  res.status(201).json({
    message: '装载完成已记录',
    trip_id: trip.id,
    loading_record_id: loadingInfo.lastInsertRowid,
    loading_duration_minutes: loadingDuration,
    trip: updatedTrip,
    anomalies
  });
});

router.post('/complete/batch', (req, res) => {
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
          `SELECT id FROM loading_records WHERE trip_id = ? AND source_batch_no = ? AND loading_action = 'complete'`
        ).get(trip.id, source_batch_no);
        if (existingBatch) {
          skipped++;
          results.push({ plate_number: record.plate_number, trip_no: record.trip_no, skipped: true });
          continue;
        }
      }

      const lastStart = getLastStartLoading(trip.id);
      let loadingDuration = null;
      if (lastStart) {
        const startMs = new Date(lastStart.loading_time).getTime();
        const completeMs = new Date(record.loading_time).getTime();
        if (!isNaN(startMs) && !isNaN(completeMs) && completeMs >= startMs) {
          loadingDuration = (completeMs - startMs) / 60000;
        }
      }

      db.prepare(`
        INSERT INTO loading_records
        (trip_id, plate_number, trip_no, loading_action, loading_time,
         loaded_weight, loading_duration, loader, loading_point, operator,
         source, source_batch_no, raw_data)
        VALUES (?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trip.id, record.plate_number, record.trip_no, record.loading_time,
        record.loaded_weight, loadingDuration, record.loader,
        record.loading_point, record.operator,
        record.source || 'batch', source_batch_no || record.source_batch_no,
        JSON.stringify(record)
      );

      const updateFields = [];
      const updateValues = [];

      updateFields.push('loading_time = ?');
      updateValues.push(record.loading_time);

      if (record.loaded_weight != null) {
        updateFields.push('net_weight = COALESCE(?, net_weight)');
        updateValues.push(record.loaded_weight);
      }

      updateFields.push("status = CASE WHEN status NOT IN ('exited', 'reviewed') THEN 'loaded' ELSE status END");
      updateFields.push('entry_time = COALESCE(entry_time, ?)');
      updateValues.push(record.loading_time);

      updateValues.push(trip.id);
      db.prepare(`
        UPDATE trips SET ${updateFields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...updateValues);

      updateTripAnomalies(trip.id);

      created++;
      results.push({
        plate_number: record.plate_number,
        trip_no: record.trip_no,
        trip_id: trip.id,
        loading_duration_minutes: loadingDuration,
        success: true
      });
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
  const {
    plate_number,
    trip_no,
    loading_action,
    start_date,
    end_date,
    page = 1,
    page_size = 20
  } = req.query;

  let sql = 'SELECT * FROM loading_records WHERE 1=1';
  const params = [];

  if (plate_number) {
    sql += ' AND plate_number = ?';
    params.push(plate_number);
  }
  if (trip_no) {
    sql += ' AND trip_no = ?';
    params.push(trip_no);
  }
  if (loading_action) {
    sql += ' AND loading_action = ?';
    params.push(loading_action);
  }
  if (start_date) {
    sql += ' AND loading_time >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND loading_time <= ?';
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY loading_time DESC LIMIT ? OFFSET ?';
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
