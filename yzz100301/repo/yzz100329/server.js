const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbModule = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
let db = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

function generateBatchNo(dataType) {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `${dataType.toUpperCase()}-${ts}-${rand}`;
}

function checkBatchExists(batchNo) {
  const row = db.queryOne('SELECT id FROM import_batches WHERE batch_no = ?', [batchNo]);
  return !!row;
}

function recordBatch(batchNo, dataType, fileName, count) {
  db.exec(
    'INSERT INTO import_batches (batch_no, data_type, file_name, record_count, import_time) VALUES (?, ?, ?, ?, ?)',
    [batchNo, dataType, fileName || '', count, new Date().toISOString()]
  );
}

app.post('/api/import/poles', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const batchNo = req.body.batchNo || generateBatchNo('POLES');
  const results = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      try {
        for (const row of results) {
          const poleNo = row['灯杆编号'] || row['pole_no'] || row.poleNo;
          if (!poleNo) { skipped++; continue; }

          const location = row['位置'] || row['location'] || '';
          const roadName = row['道路名称'] || row['road_name'] || '';
          const lightType = row['灯具类型'] || row['light_type'] || '';
          const powerWatt = parseInt(row['功率'] || row['power_watt'] || 0) || null;
          const installDate = row['安装日期'] || row['install_date'] || '';

          const existing = db.queryOne('SELECT id FROM poles WHERE pole_no = ?', [poleNo]);

          if (existing) {
            db.exec(
              `UPDATE poles SET location = ?, road_name = ?, light_type = ?, power_watt = ?, install_date = ? WHERE pole_no = ?`,
              [location, roadName, lightType, powerWatt, installDate, poleNo]
            );
            updated++;
            skipped++;
          } else {
            db.exec(
              `INSERT INTO poles (pole_no, location, road_name, light_type, power_watt, install_date, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [poleNo, location, roadName, lightType, powerWatt, installDate, '正常', new Date().toISOString()]
            );
            inserted++;
          }
        }

        recordBatch(batchNo, 'poles', req.file.originalname, results.length);
        fs.unlinkSync(req.file.path);
        res.json({ success: true, batchNo, total: results.length, inserted, updated, skipped });
      } catch (e) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
      }
    });
});

app.post('/api/import/inspections', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const batchNo = req.body.batchNo || generateBatchNo('INSPECTION');

  if (checkBatchExists(batchNo)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: '该批次已导入过，请勿重复导入', batchNo });
  }

  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    const data = JSON.parse(content);
    const records = Array.isArray(data) ? data : (data.records || data.list || []);

    let inserted = 0;
    let skipped = 0;

    for (const row of records) {
      const inspectionNo = row.inspectionNo || row.inspection_no || row['巡检单号'] || '';
      const poleNo = row.poleNo || row.pole_no || row['灯杆编号'] || '';
      if (!inspectionNo || !poleNo) { skipped++; continue; }

      const existing = db.queryOne('SELECT id FROM inspections WHERE inspection_no = ?', [inspectionNo]);
      if (existing) { skipped++; continue; }

      db.exec(
        `INSERT INTO inspections (inspection_no, pole_no, inspect_date, inspector, fault_type, fault_description, fault_level, import_batch, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inspectionNo,
          poleNo,
          row.inspectDate || row.inspect_date || row['巡检日期'] || '',
          row.inspector || row['巡检员'] || '',
          row.faultType || row.fault_type || row['故障类型'] || '',
          row.faultDescription || row.fault_description || row['故障描述'] || '',
          row.faultLevel || row.fault_level || row['故障等级'] || '一般',
          batchNo,
          '待派单',
          new Date().toISOString()
        ]
      );
      inserted++;
    }

    recordBatch(batchNo, 'inspections', req.file.originalname, records.length);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, batchNo, total: records.length, inserted, skipped });
  } catch (e) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/import/dispatches', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const batchNo = req.body.batchNo || generateBatchNo('DISPATCH');

  if (checkBatchExists(batchNo)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: '该批次已导入过，请勿重复导入', batchNo });
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      try {
        let inserted = 0;
        let skipped = 0;

        for (const row of results) {
          const dispatchNo = row['派单号'] || row['dispatch_no'] || row.dispatchNo || '';
          const inspectionNo = row['巡检单号'] || row['inspection_no'] || '';
          const poleNo = row['灯杆编号'] || row['pole_no'] || row.poleNo || '';
          if (!dispatchNo || !poleNo) { skipped++; continue; }

          const existing = db.queryOne('SELECT id FROM dispatches WHERE dispatch_no = ?', [dispatchNo]);
          if (existing) { skipped++; continue; }

          let inspectionId = null;
          if (inspectionNo) {
            const insp = db.queryOne('SELECT id FROM inspections WHERE inspection_no = ?', [inspectionNo]);
            if (insp) inspectionId = insp.id;
          }

          db.exec(
            `INSERT INTO dispatches (dispatch_no, inspection_id, pole_no, dispatch_date, dispatcher, repair_team, deadline, import_batch, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dispatchNo,
              inspectionId,
              poleNo,
              row['派单日期'] || row['dispatch_date'] || '',
              row['派单人'] || row['dispatcher'] || '',
              row['维修班组'] || row['repair_team'] || '',
              row['截止日期'] || row['deadline'] || '',
              batchNo,
              '待完工',
              new Date().toISOString()
            ]
          );
          inserted++;

          if (inspectionId) {
            db.exec("UPDATE inspections SET status = '已派单' WHERE id = ?", [inspectionId]);
          }
        }

        recordBatch(batchNo, 'dispatches', req.file.originalname, results.length);
        matchCompletionsToDispatches();
        fs.unlinkSync(req.file.path);
        res.json({ success: true, batchNo, total: results.length, inserted, skipped });
      } catch (e) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
      }
    });
});

app.post('/api/import/completions', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const batchNo = req.body.batchNo || generateBatchNo('COMPLETION');

  if (checkBatchExists(batchNo)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: '该批次已导入过，请勿重复导入', batchNo });
  }

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      try {
        let inserted = 0;
        let skipped = 0;

        for (const row of results) {
          const completionNo = row['完工单号'] || row['completion_no'] || row.completionNo || '';
          const poleNo = row['灯杆编号'] || row['pole_no'] || row.poleNo || '';
          if (!completionNo || !poleNo) { skipped++; continue; }

          const existing = db.queryOne('SELECT id FROM completions WHERE completion_no = ?', [completionNo]);
          if (existing) { skipped++; continue; }

          db.exec(
            `INSERT INTO completions (completion_no, dispatch_id, pole_no, complete_date, repairer, repair_content, parts_used, work_hours, import_batch, status, created_at)
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              completionNo,
              poleNo,
              row['完工日期'] || row['complete_date'] || row.completeDate || '',
              row['施工人员'] || row['repairer'] || row.repairer || '',
              row['维修内容'] || row['repair_content'] || '',
              row['使用配件'] || row['parts_used'] || '',
              parseFloat(row['工时'] || row['work_hours'] || 0) || 0,
              batchNo,
              '待复核',
              new Date().toISOString()
            ]
          );
          inserted++;
        }

        recordBatch(batchNo, 'completions', req.file.originalname, results.length);
        matchCompletionsToDispatches();
        fs.unlinkSync(req.file.path);
        res.json({ success: true, batchNo, total: results.length, inserted, skipped });
      } catch (e) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
      }
    });
});

function matchCompletionsToDispatches() {
  const unmatched = db.query(`
    SELECT c.id, c.pole_no, c.complete_date 
    FROM completions c 
    WHERE c.dispatch_id IS NULL 
    ORDER BY c.complete_date ASC
  `);

  for (const c of unmatched) {
    const d = db.queryOne(`
      SELECT d.id, d.dispatch_date 
      FROM dispatches d 
      WHERE d.pole_no = ? AND d.status = '待完工'
      ORDER BY d.dispatch_date ASC 
      LIMIT 1
    `, [c.pole_no]);

    if (d) {
      db.exec('UPDATE completions SET dispatch_id = ? WHERE id = ?', [d.id, c.id]);
      db.exec("UPDATE dispatches SET status = '已完工' WHERE id = ?", [d.id]);
    }
  }
}

app.get('/api/poles', (req, res) => {
  const { page = 1, pageSize = 20, status, keyword } = req.query;
  const offset = (page - 1) * pageSize;

  let where = [];
  let params = [];

  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  if (keyword) {
    where.push('(p.pole_no LIKE ? OR p.location LIKE ? OR p.road_name LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const totalRow = db.queryOne(`SELECT COUNT(*) as cnt FROM poles p ${whereSql}`, params);
  const total = totalRow ? totalRow.cnt : 0;

  const list = db.query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM inspections i WHERE i.pole_no = p.pole_no) as inspection_count,
      (SELECT COUNT(*) FROM dispatches d WHERE d.pole_no = p.pole_no) as dispatch_count,
      (SELECT COUNT(*) FROM completions c WHERE c.pole_no = p.pole_no) as completion_count
    FROM poles p
    ${whereSql}
    ORDER BY p.pole_no ASC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), offset]);

  res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

app.get('/api/poles/:poleNo', (req, res) => {
  const pole = db.queryOne('SELECT * FROM poles WHERE pole_no = ?', [req.params.poleNo]);
  if (!pole) return res.status(404).json({ error: '灯杆不存在' });

  const inspections = db.query(
    'SELECT * FROM inspections WHERE pole_no = ? ORDER BY inspect_date DESC',
    [req.params.poleNo]
  );

  const dispatches = db.query(`
    SELECT d.*, i.inspection_no 
    FROM dispatches d 
    LEFT JOIN inspections i ON d.inspection_id = i.id
    WHERE d.pole_no = ? 
    ORDER BY d.dispatch_date DESC
  `, [req.params.poleNo]);

  const completions = db.query(`
    SELECT c.*, d.dispatch_no 
    FROM completions c
    LEFT JOIN dispatches d ON c.dispatch_id = d.id
    WHERE c.pole_no = ? 
    ORDER BY c.complete_date DESC
  `, [req.params.poleNo]);

  res.json({ pole, inspections, dispatches, completions });
});

app.get('/api/chain/:poleNo', (req, res) => {
  const pole = db.queryOne('SELECT * FROM poles WHERE pole_no = ?', [req.params.poleNo]);
  if (!pole) return res.status(404).json({ error: '灯杆不存在' });

  const chain = [];

  const inspections = db.query(`
    SELECT id, inspection_no, inspect_date, inspector, fault_type, fault_description, fault_level, status, 'inspection' as type
    FROM inspections 
    WHERE pole_no = ? 
    ORDER BY inspect_date ASC
  `, [req.params.poleNo]);

  for (const insp of inspections) {
    chain.push({ ...insp, date: insp.inspect_date });

    const dispatches = db.query(`
      SELECT id, dispatch_no, dispatch_date, dispatcher, repair_team, deadline, status, 'dispatch' as type
      FROM dispatches 
      WHERE inspection_id = ? 
      ORDER BY dispatch_date ASC
    `, [insp.id]);

    for (const disp of dispatches) {
      chain.push({ ...disp, date: disp.dispatch_date });

      const completions = db.query(`
        SELECT id, completion_no, complete_date, repairer, repair_content, status, review_opinion, 'completion' as type
        FROM completions 
        WHERE dispatch_id = ? 
        ORDER BY complete_date ASC
      `, [disp.id]);

      for (const comp of completions) {
        chain.push({ ...comp, date: comp.complete_date });
      }
    }
  }

  chain.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  res.json({ pole, chain });
});

app.get('/api/anomalies', (req, res) => {
  const { type, page = 1, pageSize = 50 } = req.query;
  const offset = (page - 1) * pageSize;
  let anomalies = [];

  const today = new Date().toISOString().split('T')[0];

  if (!type || type === 'overdue') {
    const overdue = db.query(`
      SELECT d.*, p.location, p.road_name, i.fault_description
      FROM dispatches d
      JOIN poles p ON d.pole_no = p.pole_no
      LEFT JOIN inspections i ON d.inspection_id = i.id
      WHERE d.status = '待完工' AND d.deadline IS NOT NULL AND d.deadline != '' AND d.deadline < ?
      ORDER BY d.deadline ASC
    `, [today]);

    for (const o of overdue) {
      const deadlineDate = new Date(o.deadline);
      const todayDate = new Date(today);
      const diffTime = todayDate - deadlineDate;
      const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      anomalies.push({
        type: 'overdue',
        typeName: '超期未修',
        pole_no: o.pole_no,
        location: o.location,
        description: `派单${o.dispatch_no}超期${overdueDays}天未完工`,
        deadline: o.deadline,
        dispatch_no: o.dispatch_no,
        repair_team: o.repair_team,
        overdue_days: overdueDays,
        data: o
      });
    }
  }

  if (!type || type === 'mismatch') {
    const mismatches = db.query(`
      SELECT c.id, c.completion_no, c.pole_no, c.repairer as completion_repairer,
             d.dispatch_no, d.repair_team as dispatch_team,
             p.location
      FROM completions c
      JOIN dispatches d ON c.dispatch_id = d.id
      JOIN poles p ON c.pole_no = p.pole_no
      WHERE c.repairer IS NOT NULL AND c.repairer != ''
        AND d.repair_team IS NOT NULL AND d.repair_team != ''
        AND c.repairer != d.repair_team
    `);

    for (const m of mismatches) {
      anomalies.push({
        type: 'mismatch',
        typeName: '完工人不一致',
        pole_no: m.pole_no,
        location: m.location,
        description: `派单班组：${m.dispatch_team}，实际完工：${m.completion_repairer}`,
        dispatch_no: m.dispatch_no,
        completion_no: m.completion_no,
        data: m
      });
    }
  }

  if (!type || type === 'duplicate') {
    const duplicates = db.query(`
      SELECT pole_no, COUNT(*) as cnt,
        GROUP_CONCAT(inspection_no, '、') as inspection_nos,
        GROUP_CONCAT(fault_type, '、') as fault_types
      FROM inspections
      WHERE status != '已取消'
      GROUP BY pole_no
      HAVING cnt > 1
      ORDER BY cnt DESC
    `);

    for (const d of duplicates) {
      const pole = db.queryOne('SELECT location, road_name FROM poles WHERE pole_no = ?', [d.pole_no]);
      anomalies.push({
        type: 'duplicate',
        typeName: '同灯杆多故障',
        pole_no: d.pole_no,
        location: pole ? pole.location : '',
        description: `同一灯杆存在${d.cnt}条故障记录：${d.fault_types}`,
        count: d.cnt,
        data: d
      });
    }
  }

  if (!type || type === 'orphan') {
    const orphanInspections = db.query(`
      SELECT i.*, p.location
      FROM inspections i
      JOIN poles p ON i.pole_no = p.pole_no
      LEFT JOIN dispatches d ON d.inspection_id = i.id
      WHERE d.id IS NULL AND i.status = '待派单'
    `);

    for (const o of orphanInspections) {
      anomalies.push({
        type: 'orphan',
        typeName: '坏灯漏修（未派单）',
        pole_no: o.pole_no,
        location: o.location,
        description: `巡检${o.inspection_no}故障未派单：${o.fault_description}`,
        inspection_no: o.inspection_no,
        data: o
      });
    }
  }

  if (!type || type === 'no_completion') {
    const noCompletions = db.query(`
      SELECT d.*, p.location, i.fault_description
      FROM dispatches d
      JOIN poles p ON d.pole_no = p.pole_no
      LEFT JOIN inspections i ON d.inspection_id = i.id
      LEFT JOIN completions c ON c.dispatch_id = d.id
      WHERE c.id IS NULL AND d.status = '待完工'
    `);

    for (const n of noCompletions) {
      anomalies.push({
        type: 'no_completion',
        typeName: '派单未完工',
        pole_no: n.pole_no,
        location: n.location,
        description: `派单${n.dispatch_no}尚无完工回执`,
        dispatch_no: n.dispatch_no,
        data: n
      });
    }
  }

  const total = anomalies.length;
  const paginated = anomalies.slice(offset, offset + parseInt(pageSize));

  res.json({ list: paginated, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

app.get('/api/completions/pending-review', (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  const totalRow = db.queryOne("SELECT COUNT(*) as cnt FROM completions WHERE status = '待复核'");
  const total = totalRow ? totalRow.cnt : 0;

  const list = db.query(`
    SELECT c.*, d.dispatch_no, d.repair_team, p.location, p.road_name,
           i.inspection_no, i.fault_type, i.fault_description
    FROM completions c
    LEFT JOIN dispatches d ON c.dispatch_id = d.id
    LEFT JOIN inspections i ON d.inspection_id = i.id
    JOIN poles p ON c.pole_no = p.pole_no
    WHERE c.status = '待复核'
    ORDER BY c.complete_date DESC
    LIMIT ? OFFSET ?
  `, [parseInt(pageSize), offset]);

  res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

app.put('/api/completions/:id/review', (req, res) => {
  const { review_opinion, reviewer, status } = req.body;
  const reviewDate = new Date().toISOString().split('T')[0];

  const existing = db.queryOne('SELECT id FROM completions WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: '记录不存在' });
  }

  db.exec(
    `UPDATE completions SET review_opinion = ?, reviewer = ?, review_date = ?, status = ? WHERE id = ?`,
    [review_opinion || '', reviewer || '', reviewDate, status || '已复核', req.params.id]
  );

  const comp = db.queryOne('SELECT * FROM completions WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: comp });
});

app.get('/api/report/closed-loop', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;

  let dateWhere = '';
  let params = [];
  if (startDate) {
    dateWhere += ' AND i.inspect_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateWhere += ' AND i.inspect_date <= ?';
    params.push(endDate);
  }

  const inspections = db.query(`
    SELECT i.*, p.location, p.road_name
    FROM inspections i
    JOIN poles p ON i.pole_no = p.pole_no
    WHERE 1=1 ${dateWhere}
    ORDER BY i.inspect_date ASC
  `, params);

  const result = inspections.map(i => {
    const dispatch = db.queryOne('SELECT * FROM dispatches WHERE inspection_id = ? LIMIT 1', [i.id]);
    let completion = null;
    if (dispatch) {
      completion = db.queryOne('SELECT * FROM completions WHERE dispatch_id = ? LIMIT 1', [dispatch.id]);
    }

    let stage = '发现';
    if (dispatch) stage = '派单';
    if (completion) stage = '完工';
    if (completion && completion.status === '已复核') stage = '复核完成';

    const isClosed = completion && completion.status === '已复核';

    return {
      灯杆编号: i.pole_no,
      位置: i.location,
      道路名称: i.road_name,
      巡检单号: i.inspection_no,
      巡检日期: i.inspect_date,
      巡检员: i.inspector,
      故障类型: i.fault_type,
      故障描述: i.fault_description,
      故障等级: i.fault_level,
      派单号: dispatch ? dispatch.dispatch_no : '',
      派单日期: dispatch ? dispatch.dispatch_date : '',
      维修班组: dispatch ? dispatch.repair_team : '',
      截止日期: dispatch ? dispatch.deadline : '',
      完工单号: completion ? completion.completion_no : '',
      完工日期: completion ? completion.complete_date : '',
      施工人员: completion ? completion.repairer : '',
      维修内容: completion ? completion.repair_content : '',
      当前阶段: stage,
      是否闭环: isClosed ? '是' : '否',
      复核意见: completion ? (completion.review_opinion || '') : '',
      复核人: completion ? (completion.reviewer || '') : '',
      复核日期: completion ? (completion.review_date || '') : ''
    };
  });

  if (format === 'csv') {
    try {
      const parser = new Parser();
      const csv = parser.parse(result);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="closed-loop-report.csv"');
      res.send('\uFEFF' + csv);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    const stats = {
      total: result.length,
      closed: result.filter(r => r['是否闭环'] === '是').length,
      pending: result.filter(r => r['是否闭环'] === '否').length,
      closedRate: result.length ? ((result.filter(r => r['是否闭环'] === '是').length / result.length) * 100).toFixed(1) + '%' : '0%'
    };
    res.json({ data: result, stats });
  }
});

app.get('/api/stats/overview', (req, res) => {
  const poleCount = db.queryOne('SELECT COUNT(*) as cnt FROM poles').cnt;
  const inspectionCount = db.queryOne('SELECT COUNT(*) as cnt FROM inspections').cnt;
  const dispatchCount = db.queryOne('SELECT COUNT(*) as cnt FROM dispatches').cnt;
  const completionCount = db.queryOne('SELECT COUNT(*) as cnt FROM completions').cnt;
  const pendingDispatch = db.queryOne("SELECT COUNT(*) as cnt FROM inspections WHERE status = '待派单'").cnt;
  const pendingCompletion = db.queryOne("SELECT COUNT(*) as cnt FROM dispatches WHERE status = '待完工'").cnt;
  const pendingReview = db.queryOne("SELECT COUNT(*) as cnt FROM completions WHERE status = '待复核'").cnt;
  const reviewed = db.queryOne("SELECT COUNT(*) as cnt FROM completions WHERE status = '已复核'").cnt;

  const today = new Date().toISOString().split('T')[0];
  const overdueRow = db.queryOne(`
    SELECT COUNT(*) as cnt FROM dispatches 
    WHERE status = '待完工' AND deadline IS NOT NULL AND deadline != '' AND deadline < ?
  `, [today]);
  const overdue = overdueRow ? overdueRow.cnt : 0;

  res.json({
    poles: poleCount,
    inspections: inspectionCount,
    dispatches: dispatchCount,
    completions: completionCount,
    pendingDispatch,
    pendingCompletion,
    pendingReview,
    reviewed,
    overdue,
    closeRate: completionCount ? ((reviewed / completionCount) * 100).toFixed(1) + '%' : '0%'
  });
});

app.get('/api/batches', (req, res) => {
  const list = db.query('SELECT * FROM import_batches ORDER BY import_time DESC LIMIT 100');
  res.json({ list });
});

async function startServer() {
  await dbModule.init();
  db = dbModule;

  app.listen(PORT, () => {
    console.log(`路灯巡修管理系统已启动: http://localhost:${PORT}`);
    console.log('数据文件位置:', path.join(__dirname, 'data', 'inspection.db'));
  });
}

startServer().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
