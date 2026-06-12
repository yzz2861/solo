const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, initDatabase } = require('./database/db');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const MIN_WEIGHT = 100;
const RETENTION_DAYS = 48;

app.get('/api/schools', (req, res) => {
  db.all('SELECT * FROM schools', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/dishes', (req, res) => {
  db.all('SELECT * FROM dishes', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/storage_slots', (req, res) => {
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

app.post('/api/samples', (req, res) => {
  const { school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person } = req.body;
  const errors = [];

  if (weight < MIN_WEIGHT) {
    errors.push(`留样重量不足${MIN_WEIGHT}克`);
  }

  db.get('SELECT * FROM storage_slots WHERE fridge_number = ? AND slot_number = ?', [fridge_number, slot_number], (err, slot) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!slot) {
      errors.push('格位不存在');
    } else if (slot.status !== 'available') {
      errors.push('格位已被占用');
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    db.run(
      'INSERT INTO sample_records (school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [school_id, dish_id, batch_number, sample_date, sample_time, weight, fridge_number, slot_number, responsible_person],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'UPDATE storage_slots SET status = ?, occupied_by = ?, occupied_at = ? WHERE fridge_number = ? AND slot_number = ?',
          ['occupied', this.lastID, moment().format('YYYY-MM-DD HH:mm:ss'), fridge_number, slot_number],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: '留样登记成功' });
          }
        );
      }
    );
  });
});

app.get('/api/samples', (req, res) => {
  const { school_id, sample_date, status } = req.query;
  let query = `
    SELECT sr.*, s.name as school_name, d.name as dish_name, 
           i.status as inspection_status, i.result as inspection_result,
           dtr.status as destruction_status
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    LEFT JOIN inspection_records i ON sr.id = i.sample_id
    LEFT JOIN destruction_records dtr ON sr.id = dtr.sample_id
    WHERE 1=1
  `;
  let params = [];

  if (school_id) {
    query += ' AND sr.school_id = ?';
    params.push(school_id);
  }
  if (sample_date) {
    query += ' AND sr.sample_date = ?';
    params.push(sample_date);
  }
  if (status) {
    query += ' AND sr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY sr.sample_date DESC, sr.sample_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/samples/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT sr.*, s.name as school_name, d.name as dish_name
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    WHERE sr.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '记录不存在' });
    res.json(row);
  });
});

app.post('/api/inspections', (req, res) => {
  const { sample_id, inspection_date, inspector, result, result_date } = req.body;

  db.run(
    'INSERT INTO inspection_records (sample_id, inspection_date, inspector, result, result_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [sample_id, inspection_date, inspector, result, result_date, 'completed'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'UPDATE sample_records SET status = ? WHERE id = ?',
        ['inspected', sample_id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, message: '送检记录保存成功' });
        }
      );
    }
  );
});

app.post('/api/destructions', (req, res) => {
  const { sample_id, destruction_date, destroyer, reason } = req.body;
  const errors = [];

  db.get('SELECT * FROM sample_records WHERE id = ?', [sample_id], (err, sample) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!sample) return res.status(404).json({ error: '留样记录不存在' });

    const retentionEndDate = moment(sample.sample_date).add(RETENTION_DAYS, 'hours');
    if (moment(destruction_date).isBefore(retentionEndDate)) {
      errors.push(`留样未满${RETENTION_DAYS}小时保留期限，不能销毁`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    db.run(
      'INSERT INTO destruction_records (sample_id, destruction_date, destroyer, reason, status) VALUES (?, ?, ?, ?, ?)',
      [sample_id, destruction_date, destroyer, reason, 'completed'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'UPDATE sample_records SET status = ? WHERE id = ?',
          ['destroyed', sample_id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run(
              'UPDATE storage_slots SET status = ?, occupied_by = NULL, occupied_at = NULL WHERE fridge_number = ? AND slot_number = ?',
              ['available', sample.fridge_number, sample.slot_number],
              (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, message: '销毁记录保存成功' });
              }
            );
          }
        );
      }
    );
  });
});

app.post('/api/anomalies', (req, res) => {
  const { sample_id, anomaly_type, description, handler, handle_date } = req.body;

  db.run(
    'INSERT INTO anomaly_records (sample_id, anomaly_type, description, handler, handle_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [sample_id, anomaly_type, description, handler, handle_date, 'completed'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '异常处置记录保存成功' });
    }
  );
});

app.get('/api/todo', (req, res) => {
  const query = `
    SELECT sr.*, s.name as school_name, d.name as dish_name,
           i.status as inspection_status, i.result_date as inspection_result_date,
           dtr.status as destruction_status
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    LEFT JOIN inspection_records i ON sr.id = i.sample_id
    LEFT JOIN destruction_records dtr ON sr.id = dtr.sample_id
    WHERE sr.status != 'destroyed'
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const todoList = rows.map(row => {
      const issues = [];
      
      if (row.weight < MIN_WEIGHT) {
        issues.push(`留样重量不足${MIN_WEIGHT}克`);
      }

      const inspectionDeadline = moment(row.sample_date).add(24, 'hours');
      if (!row.inspection_result_date || moment(row.inspection_result_date).isAfter(inspectionDeadline)) {
        issues.push('送检结果回填超时');
      }

      return { ...row, issues };
    }).filter(row => row.issues.length > 0);

    res.json(todoList);
  });
});

app.get('/api/report', (req, res) => {
  const { school_id, start_date, end_date } = req.query;
  let query = `
    SELECT sr.*, s.name as school_name, d.name as dish_name,
           i.inspector, i.result, i.result_date as inspection_result_date,
           dtr.destroyer, dtr.reason, dtr.destruction_date,
           a.anomaly_type, a.description as anomaly_description
    FROM sample_records sr
    LEFT JOIN schools s ON sr.school_id = s.id
    LEFT JOIN dishes d ON sr.dish_id = d.id
    LEFT JOIN inspection_records i ON sr.id = i.sample_id
    LEFT JOIN destruction_records dtr ON sr.id = dtr.sample_id
    LEFT JOIN anomaly_records a ON sr.id = a.sample_id
    WHERE 1=1
  `;
  let params = [];

  if (school_id) {
    query += ' AND sr.school_id = ?';
    params.push(school_id);
  }
  if (start_date) {
    query += ' AND sr.sample_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND sr.sample_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY sr.sample_date DESC, sr.sample_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});