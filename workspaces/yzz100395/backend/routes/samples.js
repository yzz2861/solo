const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

const MIN_WEIGHT = 100;
const RETENTION_HOURS = 48;

router.get('/schools', (req, res) => {
  db.all('SELECT * FROM schools ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/dishes', (req, res) => {
  db.all('SELECT * FROM dishes ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/storage_slots', (req, res) => {
  const { fridge_number } = req.query;
  let query = 'SELECT * FROM storage_slots';
  let params = [];
  if (fridge_number) {
    query += ' WHERE fridge_number = ?';
    params.push(fridge_number);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/samples', (req, res) => {
  const { school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person, photo_path } = req.body;
  const exceptions = [];

  if (weight < MIN_WEIGHT) {
    exceptions.push({ type: 'weight', message: `留样重量不足${MIN_WEIGHT}克，当前为${weight}克` });
  }

  db.get('SELECT status FROM storage_slots WHERE fridge_number = ? AND slot_number = ?', [fridge_number, slot_number], (err, slot) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!slot || slot.status !== 'available') {
      exceptions.push({ type: 'slot', message: '格位已被占用' });
    }

    db.run('BEGIN TRANSACTION', () => {
      db.run(
        'INSERT INTO sample_records (school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person, photo_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person, photo_path],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          const sampleId = this.lastID;

          db.run('UPDATE storage_slots SET status = "occupied", occupied_by = ?, occupied_at = CURRENT_TIMESTAMP WHERE fridge_number = ? AND slot_number = ?', [sampleId, fridge_number, slot_number]);

          exceptions.forEach(exc => {
            db.run('INSERT INTO anomaly_records (sample_id, anomaly_type, description) VALUES (?, ?, ?)', [sampleId, exc.type, exc.message]);
          });

          db.run('COMMIT', () => {
            res.json({ id: sampleId, exceptions });
          });
        }
      );
    });
  });
});

router.get('/samples', (req, res) => {
  const { school_id, sample_date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let query = `
    SELECT sr.*, s.name as school_name, d.name as dish_name
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
  `;
  let params = [];
  let conditions = [];

  if (school_id) {
    conditions.push('sr.school_id = ?');
    params.push(school_id);
  }
  if (sample_date) {
    conditions.push('sr.sample_date = ?');
    params.push(sample_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/samples/:id', (req, res) => {
  const { id } = req.params;
  db.get(`
    SELECT sr.*, s.name as school_name, d.name as dish_name
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    WHERE sr.id = ?
  `, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

router.post('/inspection', (req, res) => {
  const { sample_id, inspection_date, inspector, result, result_date, remarks } = req.body;
  let exceptions = [];

  db.get('SELECT sample_date FROM sample_records WHERE id = ?', [sample_id], (err, sample) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const reportDays = Math.floor((new Date(result_date) - new Date(sample.sample_date)) / (1000 * 60 * 60 * 24));
    if (result_date && reportDays > 7) {
      exceptions.push({ type: 'late_report', message: `检测结果回填延迟，已超过7天（${reportDays}天）` });
    }

    db.run(
      'INSERT INTO inspection_records (sample_id, inspection_date, inspector, result, result_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [sample_id, inspection_date, inspector, result, result_date, result ? 'completed' : 'pending'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        exceptions.forEach(exc => {
          db.run('INSERT INTO anomaly_records (sample_id, anomaly_type, description) VALUES (?, ?, ?)', [sample_id, exc.type, exc.message]);
        });

        res.json({ id: this.lastID, exceptions });
      }
    );
  });
});

router.post('/destruction', (req, res) => {
  const { sample_id, destruction_date, destroyer, reason } = req.body;
  let exceptions = [];

  db.get('SELECT sample_date, fridge_number, slot_number FROM sample_records WHERE id = ?', [sample_id], (err, sample) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const retentionHours = Math.floor((new Date(destruction_date) - new Date(sample.sample_date)) / (1000 * 60 * 60));
    if (retentionHours < RETENTION_HOURS) {
      exceptions.push({ type: 'early_destroy', message: `未满保留期限（${RETENTION_HOURS}小时）提前销毁，当前仅保留${retentionHours}小时` });
    }

    db.run('BEGIN TRANSACTION', () => {
      db.run(
        'INSERT INTO destruction_records (sample_id, destruction_date, destroyer, reason, status) VALUES (?, ?, ?, ?, ?)',
        [sample_id, destruction_date, destroyer, reason, 'completed'],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          db.run('UPDATE storage_slots SET status = "available", occupied_by = NULL, occupied_at = NULL WHERE fridge_number = ? AND slot_number = ?', [sample.fridge_number, sample.slot_number]);
          db.run('UPDATE sample_records SET status = "destroyed" WHERE id = ?', [sample_id]);

          exceptions.forEach(exc => {
            db.run('INSERT INTO anomaly_records (sample_id, anomaly_type, description) VALUES (?, ?, ?)', [sample_id, exc.type, exc.message]);
          });

          db.run('COMMIT', () => {
            res.json({ id: this.lastID, exceptions });
          });
        }
      );
    });
  });
});

router.get('/anomalies', (req, res) => {
  const { status = 'pending' } = req.query;
  db.all(`
    SELECT ar.*, sr.batch_number, sr.sample_date, d.name as dish_name, s.name as school_name
    FROM anomaly_records ar
    LEFT JOIN sample_records sr ON ar.sample_id = sr.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    LEFT JOIN schools s ON sr.school_id = s.id
    WHERE ar.status = ?
    ORDER BY ar.created_at DESC
  `, [status], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.put('/anomalies/:id', (req, res) => {
  const { id } = req.params;
  const { handler, remarks } = req.body;
  db.run(
    'UPDATE anomaly_records SET status = "handled", handler = ?, handle_date = CURRENT_TIMESTAMP, description = description || ? WHERE id = ?',
    [handler, remarks, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

router.get('/reports/export', (req, res) => {
  const { school_id, start_date, end_date } = req.query;
  let query = `
    SELECT sr.sample_date, sr.sample_time, d.name as dish_name, sr.batch_number, sr.weight, 
           sr.fridge_number, sr.slot_number, s.name as school_name, sr.responsible_person,
           ir.inspection_date, ir.result, ir.result_date,
           dr.destruction_date, dr.destroyer
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    LEFT JOIN inspection_records ir ON sr.id = ir.sample_id
    LEFT JOIN destruction_records dr ON sr.id = dr.sample_id
  `;
  let params = [];
  let conditions = [];

  if (school_id) {
    conditions.push('sr.school_id = ?');
    params.push(school_id);
  }
  if (start_date) {
    conditions.push('sr.sample_date >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('sr.sample_date <= ?');
    params.push(end_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sr.sample_date DESC, sr.sample_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const csvContent = [
      ['日期', '时间', '菜品名称', '批次号', '留样重量(g)', '冰箱号', '格位号', 
       '学校', '责任人', '送检日期', '检测结果', '结果日期', '销毁日期', '销毁人']
    ].concat(rows.map(row => [
      row.sample_date, row.sample_time, row.dish_name, row.batch_number, row.weight, 
      row.fridge_number, row.slot_number, row.school_name, row.responsible_person,
      row.inspection_date || '', row.result || '', row.result_date || '',
      row.destruction_date || '', row.destroyer || ''
    ])).map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sample_report.csv');
    res.send(csvContent);
  });
});

module.exports = router;