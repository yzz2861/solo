const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse');
const { parse: parseSync } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { parseDateTime, generateBatchId } = require('../utils/date');

const upload = multer({ dest: path.join(__dirname, '..', '..', 'tmp') });

router.post('/tickets/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传CSV文件' });
    }

    const batchId = generateBatchId('tickets');
    const results = { total: 0, inserted: 0, skipped: 0, errors: [] };

    const parser = fs.createReadStream(req.file.path)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }));

    const allTickets = db.getCollection('tickets');
    const existingTicketNos = new Set(allTickets.map(t => t.ticket_no));

    const newTickets = [];

    parser.on('data', (row) => {
      results.total++;
      
      const ticketNo = row['工单号'] || row['ticket_no'] || row['ticketNo'] || row['id'];
      if (!ticketNo) {
        results.errors.push({ row: results.total, error: '缺少工单号' });
        return;
      }

      const ticketNoStr = String(ticketNo).trim();
      
      if (existingTicketNos.has(ticketNoStr)) {
        results.skipped++;
        return;
      }

      if (newTickets.some(t => t.ticket_no === ticketNoStr)) {
        results.skipped++;
        return;
      }
      
      const createdAt = row['创建时间'] || row['created_at'] || row['createTime'] || row['时间'];
      const createdTs = parseDateTime(createdAt);

      newTickets.push({
        ticket_no: ticketNoStr,
        title: row['标题'] || row['title'] || row['工单标题'] || '',
        type: row['类型'] || row['type'] || row['工单类型'] || '',
        priority: row['优先级'] || row['priority'] || row['紧急程度'] || 'normal',
        created_at: createdAt || '',
        creator: row['创建人'] || row['creator'] || row['提交人'] || '',
        current_status: row['当前状态'] || row['current_status'] || row['status'] || '',
        source: 'system',
        import_batch_id: batchId,
        created_at_ts: createdTs,
        raw_data: JSON.stringify(row),
      });
    });

    parser.on('end', () => {
      const allT = db.getCollection('tickets');
      allT.push(...newTickets);
      db.setCollection('tickets', allT);
      results.inserted = newTickets.length;

      const batches = db.getCollection('import_batches');
      batches.push({
        id: batchId,
        batch_type: 'tickets',
        file_name: req.file.originalname,
        import_time: new Date().toISOString(),
        record_count: newTickets.length,
        status: 'completed',
      });
      db.setCollection('import_batches', batches);

      fs.unlink(req.file.path, () => {});
      
      res.json({
        batch_id: batchId,
        ...results,
      });
    });

    parser.on('error', (err) => {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: 'CSV解析失败: ' + err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/escalations/json', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传JSON文件' });
    }

    const batchId = generateBatchId('escalations');
    const content = fs.readFileSync(req.file.path, 'utf-8');
    let data;
    
    try {
      data = JSON.parse(content);
    } catch (e) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'JSON格式错误' });
    }

    if (!Array.isArray(data)) {
      if (data.data && Array.isArray(data.data)) {
        data = data.data;
      } else if (data.list && Array.isArray(data.list)) {
        data = data.list;
      } else if (data.records && Array.isArray(data.records)) {
        data = data.records;
      } else {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'JSON数据格式不正确，需要数组格式' });
      }
    }

    const allEscalations = db.getCollection('escalations');
    const existingKeys = new Set(
      allEscalations.map(e => `${e.ticket_no}_${e.escalation_time_ts}_${e.source}`)
    );

    const newEscalations = [];
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const ticketNo = item.ticket_no || item.ticketNo || item['工单号'] || item.ticketId;
      
      if (!ticketNo) {
        errors.push({ index: i, error: '缺少工单号' });
        continue;
      }

      const escTime = item.escalation_time || item.escalationTime || item['升级时间'] || item.time || item.created_at;
      const escTs = parseDateTime(escTime);

      const ticketNoStr = String(ticketNo).trim();
      const uniqueKey = `${ticketNoStr}_${escTs}_escalation_json`;

      if (existingKeys.has(uniqueKey) || newEscalations.some(e => 
        `${e.ticket_no}_${e.escalation_time_ts}_${e.source}` === uniqueKey
      )) {
        skipped++;
        continue;
      }

      newEscalations.push({
        ticket_no: ticketNoStr,
        escalation_time: escTime || '',
        escalation_from: item.escalation_from || item.from || item['原处理人'] || '',
        escalation_to: item.escalation_to || item.to || item['升级到'] || item['升级给'] || '',
        escalation_reason: item.reason || item.escalation_reason || item['升级原因'] || '',
        source: 'escalation_json',
        import_batch_id: batchId,
        escalation_time_ts: escTs,
        raw_data: JSON.stringify(item),
      });
    }

    const allEsc = db.getCollection('escalations');
    allEsc.push(...newEscalations);
    db.setCollection('escalations', allEsc);

    const batches = db.getCollection('import_batches');
    batches.push({
      id: batchId,
      batch_type: 'escalations',
      file_name: req.file.originalname,
      import_time: new Date().toISOString(),
      record_count: newEscalations.length,
      status: 'completed',
    });
    db.setCollection('import_batches', batches);

    fs.unlink(req.file.path, () => {});

    res.json({
      batch_id: batchId,
      total: data.length,
      inserted: newEscalations.length,
      skipped,
      errors,
    });
  } catch (err) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/supplements', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const batchId = generateBatchId('supplements');
    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();

    let rows = [];

    if (originalName.endsWith('.json')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let data = JSON.parse(content);
      if (!Array.isArray(data)) {
        data = data.data || data.list || data.records || [];
      }
      rows = data;
    } else if (originalName.endsWith('.csv')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      rows = parseSync(content, { columns: true, skip_empty_lines: true });
    } else {
      return res.status(400).json({ error: '仅支持CSV或JSON格式' });
    }

    const allTickets = db.getCollection('tickets');
    const existingTicketNos = new Set(allTickets.map(t => t.ticket_no));

    const newTickets = [];
    const newReplies = [];
    let ticketInserted = 0;
    let replyInserted = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const ticketNo = item['工单号'] || item.ticket_no || item.ticketNo || item['工单编号'];
      if (!ticketNo) {
        errors.push({ index: i, error: '缺少工单号' });
        continue;
      }

      const ticketNoStr = String(ticketNo).trim();
      const replyTime = item['回复时间'] || item.reply_time || item.replyTime || item['处理时间'] || item.time;
      const replyTs = parseDateTime(replyTime);
      const createdAt = item['创建时间'] || item.created_at || item.createTime;
      const createdTs = parseDateTime(createdAt);

      if (!existingTicketNos.has(ticketNoStr) && !newTickets.some(t => t.ticket_no === ticketNoStr)) {
        newTickets.push({
          ticket_no: ticketNoStr,
          title: item['标题'] || item.title || '',
          type: item['类型'] || item.type || '',
          priority: item['优先级'] || item.priority || 'normal',
          created_at: createdAt || replyTime || '',
          creator: item['创建人'] || item.creator || item['提交人'] || '',
          current_status: item['状态'] || item.status || 'replied',
          source: 'supplement',
          import_batch_id: batchId,
          created_at_ts: createdTs || replyTs,
          raw_data: JSON.stringify(item),
        });
        ticketInserted++;
      } else {
        skipped++;
      }

      if (replyTime || item['回复内容'] || item['处理结果']) {
        newReplies.push({
          ticket_no: ticketNoStr,
          reply_time: replyTime || '',
          reply_content: item['回复内容'] || item.reply_content || item['处理结果'] || '',
          replier: item['回复人'] || item.replier || item['处理人'] || '',
          reply_type: item['回复类型'] || item.reply_type || 'supplement',
          source: 'supplement',
          import_batch_id: batchId,
          reply_time_ts: replyTs,
          raw_data: JSON.stringify(item),
        });
        replyInserted++;
      }
    }

    if (newTickets.length > 0) {
      const allT = db.getCollection('tickets');
      allT.push(...newTickets);
      db.setCollection('tickets', allT);
    }

    if (newReplies.length > 0) {
      const allR = db.getCollection('replies');
      allR.push(...newReplies);
      db.setCollection('replies', allR);
    }

    const batches = db.getCollection('import_batches');
    batches.push({
      id: batchId,
      batch_type: 'supplements',
      file_name: req.file.originalname,
      import_time: new Date().toISOString(),
      record_count: replyInserted,
      status: 'completed',
    });
    db.setCollection('import_batches', batches);

    fs.unlink(filePath, () => {});

    res.json({
      batch_id: batchId,
      total: rows.length,
      ticket_inserted: ticketInserted,
      reply_inserted: replyInserted,
      skipped,
      errors,
    });
  } catch (err) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/batches', (req, res) => {
  try {
    const batches = db.getCollection('import_batches')
      .sort((a, b) => new Date(b.import_time) - new Date(a.import_time))
      .slice(0, 100);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
