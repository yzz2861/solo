const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dayjs = require('dayjs');
const { prepare, exec } = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function generateBatchNo(type) {
  return `${type.toUpperCase()}-${dayjs().format('YYYYMMDDHHmmss')}-${crypto.randomBytes(4).toString('hex')}`;
}

function normalizePlate(plate) {
  if (!plate) return '';
  return plate.toString().trim().toUpperCase().replace(/\s+/g, '');
}

function syncVisitRecords() {
  const allReservations = prepare('SELECT * FROM reservations').all();
  const allRecognitions = prepare('SELECT * FROM recognitions ORDER BY recognize_time ASC').all();
  const allManualReleases = prepare('SELECT * FROM manual_releases ORDER BY release_time ASC').all();

  const visitMap = new Map();

  function getVisitKey(data) {
    const date = data.visit_date || (data.recognize_time && data.recognize_time.split(' ')[0]) || (data.release_time && data.release_time.split(' ')[0]) || '';
    const plate = normalizePlate(data.plate_number || '');
    const reservationNo = data.reservation_no || '';
    if (reservationNo) return `res:${reservationNo}`;
    if (plate && date) return `plate:${plate}:${date}`;
    return null;
  }

  function ensureVisit(key, data, sourceType) {
    if (!key) {
      const fallbackKey = `tmp:${sourceType}:${data.id || Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
      if (!visitMap.has(fallbackKey)) {
        visitMap.set(fallbackKey, {
          plate_number: normalizePlate(data.plate_number) || '',
          reservation_no: data.reservation_no || '',
          visitor_name: data.visitor_name || '',
          visit_date: data.visit_date || (data.recognize_time && data.recognize_time.split(' ')[0]) || (data.release_time && data.release_time.split(' ')[0]) || '',
          expected_start: data.expected_start || '',
          expected_end: data.expected_end || '',
          recognize_time: '',
          release_time: '',
          release_type: '',
          gate: data.gate || '',
          operator: '',
          host_department: data.host_department || '',
          host_name: data.host_name || '',
          visit_purpose: data.visit_purpose || '',
          has_reservation: 0,
          has_recognition: 0,
          has_manual_release: 0,
          plate_matched: 1,
          is_overtime: 0,
          reservation_id: null,
          recognition_id: null,
          manual_release_id: null,
          sources: []
        });
      }
      const visit = visitMap.get(fallbackKey);
      visit.sources.push(sourceType);
      return visit;
    }

    if (!visitMap.has(key)) {
      visitMap.set(key, {
        plate_number: normalizePlate(data.plate_number) || '',
        reservation_no: data.reservation_no || '',
        visitor_name: data.visitor_name || '',
        visit_date: data.visit_date || '',
        expected_start: data.expected_start || '',
        expected_end: data.expected_end || '',
        recognize_time: '',
        release_time: '',
        release_type: '',
        gate: data.gate || '',
        operator: '',
        host_department: data.host_department || '',
        host_name: data.host_name || '',
        visit_purpose: data.visit_purpose || '',
        has_reservation: 0,
        has_recognition: 0,
        has_manual_release: 0,
        plate_matched: 1,
        is_overtime: 0,
        reservation_id: null,
        recognition_id: null,
        manual_release_id: null,
        sources: []
      });
    }

    const visit = visitMap.get(key);
    visit.sources.push(sourceType);
    return visit;
  }

  allReservations.forEach(res => {
    const key = `res:${res.reservation_no}`;
    const visit = ensureVisit(key, res, 'reservation');
    visit.reservation_id = res.id;
    visit.reservation_no = res.reservation_no;
    visit.plate_number = normalizePlate(res.plate_number) || visit.plate_number;
    visit.visitor_name = res.visitor_name || visit.visitor_name;
    visit.visit_date = res.visit_date || visit.visit_date;
    visit.expected_start = res.expected_start || visit.expected_start;
    visit.expected_end = res.expected_end || visit.expected_end;
    visit.host_department = res.host_department || visit.host_department;
    visit.host_name = res.host_name || visit.host_name;
    visit.visit_purpose = res.visit_purpose || visit.visit_purpose;
    visit.has_reservation = 1;
  });

  allRecognitions.forEach(rec => {
    const plate = normalizePlate(rec.plate_number);
    const date = rec.recognize_time && rec.recognize_time.split(' ')[0] || '';
    
    let matched = false;
    
    for (const [key, visit] of visitMap.entries()) {
      if (visit.has_reservation && visit.plate_number === plate) {
        const visitDate = visit.visit_date || date;
        if (!visit.recognize_time || rec.recognize_time < visit.recognize_time) {
          visit.recognition_id = rec.id;
          visit.recognize_time = rec.recognize_time;
          visit.gate = rec.gate || visit.gate;
          visit.has_recognition = 1;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      const key = `plate:${plate}:${date}`;
      const visit = ensureVisit(key, { ...rec, visit_date: date }, 'recognition');
      visit.recognition_id = rec.id;
      visit.plate_number = plate;
      visit.recognize_time = rec.recognize_time;
      visit.gate = rec.gate || visit.gate;
      visit.visit_date = date;
      visit.has_recognition = 1;
    }
  });

  allManualReleases.forEach(rel => {
    const plate = normalizePlate(rel.plate_number) || '';
    const reservationNo = rel.reservation_no || '';
    const date = rel.release_time && rel.release_time.split(' ')[0] || '';
    
    let matched = false;

    if (reservationNo) {
      const key = `res:${reservationNo}`;
      if (visitMap.has(key)) {
        const visit = visitMap.get(key);
        visit.manual_release_id = rel.id;
        visit.release_time = rel.release_time;
        visit.release_type = 'manual';
        visit.gate = rel.gate || visit.gate;
        visit.operator = rel.operator || visit.operator;
        visit.visitor_name = rel.visitor_name || visit.visitor_name;
        visit.has_manual_release = 1;
        matched = true;
      }
    }

    if (!matched && plate) {
      for (const [key, visit] of visitMap.entries()) {
        if (visit.plate_number === plate && !visit.has_manual_release) {
          const visitDate = visit.visit_date || date;
          if (visitDate === date || !visit.visit_date) {
            visit.manual_release_id = rel.id;
            visit.release_time = rel.release_time;
            visit.release_type = 'manual';
            visit.gate = rel.gate || visit.gate;
            visit.operator = rel.operator || visit.operator;
            visit.visitor_name = rel.visitor_name || visit.visitor_name;
            visit.has_manual_release = 1;
            matched = true;
            break;
          }
        }
      }
    }

    if (!matched) {
      const key = plate && date ? `plate:${plate}:${date}` : null;
      const visit = ensureVisit(key, { ...rel, plate_number: plate, visit_date: date }, 'manual');
      visit.manual_release_id = rel.id;
      visit.plate_number = plate || visit.plate_number;
      visit.reservation_no = reservationNo || visit.reservation_no;
      visit.release_time = rel.release_time;
      visit.release_type = 'manual';
      visit.gate = rel.gate || visit.gate;
      visit.operator = rel.operator || '';
      visit.visitor_name = rel.visitor_name || '';
      visit.visit_date = date || visit.visit_date;
      visit.has_manual_release = 1;
    }
  });

  for (const [key, visit] of visitMap.entries()) {
    if (visit.has_reservation && visit.has_recognition && visit.plate_number) {
      const res = prepare('SELECT plate_number FROM reservations WHERE id = ?').get(visit.reservation_id);
      if (res && normalizePlate(res.plate_number) !== visit.plate_number) {
        visit.plate_matched = 0;
      }
    }

    if (visit.expected_end && visit.release_time) {
      const expectedEnd = dayjs(visit.expected_end);
      const releaseTime = dayjs(visit.release_time);
      if (releaseTime.isAfter(expectedEnd)) {
        visit.is_overtime = 1;
      }
    } else if (visit.expected_end && visit.recognize_time) {
      const expectedEnd = dayjs(visit.expected_end);
      const recTime = dayjs(visit.recognize_time);
      if (recTime.isAfter(expectedEnd)) {
        visit.is_overtime = 1;
      }
    }

    if (!visit.release_time && visit.recognize_time && visit.has_recognition && !visit.has_manual_release) {
      visit.release_time = visit.recognize_time;
      visit.release_type = 'auto';
    }

    visit.import_key = crypto.createHash('md5').update(
      `${visit.reservation_no || ''}|${visit.plate_number || ''}|${visit.visit_date || ''}|${visit.recognize_time || ''}|${visit.release_time || ''}`
    ).digest('hex');
  }

  const insertVisit = prepare(`
    INSERT OR IGNORE INTO visit_records 
    (reservation_id, recognition_id, manual_release_id, reservation_no, plate_number, visitor_name,
     visit_date, expected_start, expected_end, recognize_time, release_time, release_type, gate, operator,
     host_department, host_name, visit_purpose, has_reservation, has_recognition, has_manual_release,
     plate_matched, is_overtime, import_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateVisit = prepare(`
    UPDATE visit_records SET
      reservation_id = ?,
      recognition_id = ?,
      manual_release_id = ?,
      reservation_no = ?,
      plate_number = ?,
      visitor_name = ?,
      visit_date = ?,
      expected_start = ?,
      expected_end = ?,
      recognize_time = ?,
      release_time = ?,
      release_type = ?,
      gate = ?,
      operator = ?,
      host_department = ?,
      host_name = ?,
      visit_purpose = ?,
      has_reservation = ?,
      has_recognition = ?,
      has_manual_release = ?,
      plate_matched = ?,
      is_overtime = ?,
      updated_at = datetime('now', 'localtime')
    WHERE import_key = ?
  `);

  let inserted = 0;
  let updated = 0;

  for (const visit of visitMap.values()) {
    const result = insertVisit.run(
      visit.reservation_id,
      visit.recognition_id,
      visit.manual_release_id,
      visit.reservation_no,
      visit.plate_number,
      visit.visitor_name,
      visit.visit_date,
      visit.expected_start,
      visit.expected_end,
      visit.recognize_time,
      visit.release_time,
      visit.release_type,
      visit.gate,
      visit.operator,
      visit.host_department,
      visit.host_name,
      visit.visit_purpose,
      visit.has_reservation,
      visit.has_recognition,
      visit.has_manual_release,
      visit.plate_matched,
      visit.is_overtime,
      visit.import_key
    );
    
    if (result.changes === 0) {
      updateVisit.run(
        visit.reservation_id,
        visit.recognition_id,
        visit.manual_release_id,
        visit.reservation_no,
        visit.plate_number,
        visit.visitor_name,
        visit.visit_date,
        visit.expected_start,
        visit.expected_end,
        visit.recognize_time,
        visit.release_time,
        visit.release_type,
        visit.gate,
        visit.operator,
        visit.host_department,
        visit.host_name,
        visit.visit_purpose,
        visit.has_reservation,
        visit.has_recognition,
        visit.has_manual_release,
        visit.plate_matched,
        visit.is_overtime,
        visit.import_key
      );
      updated++;
    } else {
      inserted++;
    }
  }

  return visitMap.size;
}

router.post('/reservation', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传预约CSV文件' });
    }

    const batchNo = generateBatchNo('RES');
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
      }))
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          const insertStmt = prepare(`
            INSERT OR IGNORE INTO reservations 
            (reservation_no, plate_number, visitor_name, visitor_phone, visit_purpose, 
             visit_date, expected_start, expected_end, host_department, host_name, import_batch)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const record of results) {
            insertStmt.run(
              record.预约号 || record.reservation_no || record.reservationno || '',
              normalizePlate(record.车牌号 || record.plate_number || record.platenumber || ''),
              record.访客姓名 || record.visitor_name || record.visitorname || '',
              record.访客电话 || record.visitor_phone || record.visitorphone || '',
              record.来访事由 || record.visit_purpose || record.visitpurpose || '',
              record.来访日期 || record.visit_date || record.visitdate || '',
              record.预计入场时间 || record.expected_start || record.expectedstart || '',
              record.预计离场时间 || record.expected_end || record.expectedend || '',
              record.被访部门 || record.host_department || record.hostdepartment || '',
              record.被访人 || record.host_name || record.hostname || '',
              batchNo
            );
          }

          prepare('INSERT INTO import_batches (batch_no, type, file_name, record_count, status) VALUES (?, ?, ?, ?, ?)')
            .run(batchNo, 'reservation', req.file.originalname, results.length, 'completed');

          const visitCount = syncVisitRecords();

          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            batchNo,
            recordCount: results.length,
            visitRecordCount: visitCount,
            message: `成功导入 ${results.length} 条预约记录，关联 ${visitCount} 条访客记录`
          });
        } catch (err) {
          console.error('导入预约数据出错:', err);
          res.status(500).json({ error: err.message });
        }
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'CSV文件解析失败: ' + err.message });
      });
  } catch (err) {
    console.error('上传预约文件出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/recognition', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传识别记录JSON文件' });
    }

    const batchNo = generateBatchNo('REC');
    const content = fs.readFileSync(req.file.path, 'utf-8');
    let records = [];

    try {
      const parsed = JSON.parse(content);
      records = Array.isArray(parsed) ? parsed : (parsed.data || parsed.records || parsed.list || []);
    } catch (err) {
      return res.status(400).json({ error: 'JSON格式解析失败' });
    }

    const insertStmt = prepare(`
      INSERT INTO recognitions 
      (plate_number, recognize_time, gate, direction, image_url, confidence, import_batch)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of records) {
      insertStmt.run(
        normalizePlate(record.plateNumber || record.plate_number || record.车牌号 || ''),
        record.recognizeTime || record.recognize_time || record.识别时间 || '',
        record.gate || record.gate_name || record.门岗 || '',
        record.direction || record.方向 || '',
        record.imageUrl || record.image_url || record.图片 || '',
        record.confidence || record.置信度 || null,
        batchNo
      );
    }

    prepare('INSERT INTO import_batches (batch_no, type, file_name, record_count, status) VALUES (?, ?, ?, ?, ?)')
      .run(batchNo, 'recognition', req.file.originalname, records.length, 'completed');

    const visitCount = syncVisitRecords();

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      batchNo,
      recordCount: records.length,
      visitRecordCount: visitCount,
      message: `成功导入 ${records.length} 条识别记录，关联 ${visitCount} 条访客记录`
    });
  } catch (err) {
    console.error('导入识别记录出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传人工放行表文件' });
    }

    const batchNo = generateBatchNo('MAN');
    const results = [];
    const ext = path.extname(req.file.originalname).toLowerCase();

    const processRecords = (records) => {
      const insertStmt = prepare(`
        INSERT INTO manual_releases 
        (plate_number, reservation_no, release_time, gate, operator, reason, visitor_name, import_batch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const record of records) {
        insertStmt.run(
          normalizePlate(record.车牌号 || record.plate_number || record.plateNumber || ''),
          record.预约号 || record.reservation_no || record.reservationNo || '',
          record.放行时间 || record.release_time || record.releaseTime || '',
          record.门岗 || record.gate || '',
          record.操作员 || record.operator || '未知',
          record.放行原因 || record.reason || '',
          record.访客姓名 || record.visitor_name || record.visitorName || '',
          batchNo
        );
      }

      prepare('INSERT INTO import_batches (batch_no, type, file_name, record_count, status) VALUES (?, ?, ?, ?, ?)')
        .run(batchNo, 'manual', req.file.originalname, records.length, 'completed');

      const visitCount = syncVisitRecords();

      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        batchNo,
        recordCount: records.length,
        visitRecordCount: visitCount,
        message: `成功导入 ${records.length} 条人工放行记录，关联 ${visitCount} 条访客记录`
      });
    };

    if (ext === '.csv') {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            processRecords(results);
          } catch (err) {
            res.status(500).json({ error: err.message });
          }
        })
        .on('error', (err) => {
          res.status(500).json({ error: 'CSV文件解析失败: ' + err.message });
        });
    } else if (ext === '.json') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      let records = [];
      try {
        const parsed = JSON.parse(content);
        records = Array.isArray(parsed) ? parsed : (parsed.data || parsed.records || parsed.list || []);
      } catch (err) {
        return res.status(400).json({ error: 'JSON格式解析失败' });
      }
      processRecords(records);
    } else if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(req.file.path);
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const records = XLSX.utils.sheet_to_json(worksheet);
      processRecords(records);
    } else {
      return res.status(400).json({ error: '不支持的文件格式，请上传CSV、JSON或Excel文件' });
    }
  } catch (err) {
    console.error('导入人工放行记录出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/batches', (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM import_batches';
    const params = [];
    
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 50';
    
    const batches = prepare(sql).all(...params);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
