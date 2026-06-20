const express = require('express');
const { run, all, get } = require('./database');
const { extractCommitments, COMMITMENT_TYPES } = require('./extractor');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/customers', async (req, res) => {
  try {
    const customers = await all(`
      SELECT c.*,
             (SELECT COUNT(DISTINCT o.id) FROM opportunities o WHERE o.customer_id = c.id) as opportunity_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id) as commitment_count
      FROM customers c
      ORDER BY c.created_at DESC
    `);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, company, contact } = req.body;
    const result = await run(
      'INSERT INTO customers (name, company, contact) VALUES (?, ?, ?)',
      [name, company || null, contact || null]
    );
    const customer = await get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await all(`
      SELECT o.*,
             c.name as customer_name,
             c.company as customer_company,
             (SELECT COUNT(DISTINCT ch.id) FROM chats ch WHERE ch.opportunity_id = o.id) as chat_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id) as commitment_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.status = 'approved') as approved_count
      FROM opportunities o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
    `);
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/opportunities', async (req, res) => {
  try {
    const { customer_id, name, status, amount } = req.body;
    const result = await run(
      'INSERT INTO opportunities (customer_id, name, status, amount) VALUES (?, ?, ?, ?)',
      [customer_id || null, name, status || 'active', amount || null]
    );
    const opportunity = await get(`
      SELECT o.*, c.name as customer_name
      FROM opportunities o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `, [result.lastID]);
    res.status(201).json(opportunity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const opportunity = await get(`
      SELECT o.*, c.name as customer_name, c.company as customer_company
      FROM opportunities o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const commitments = await all(`
      SELECT cm.*, ch.salesperson,
             (SELECT COUNT(*) FROM commitment_versions cv WHERE cv.commitment_id = cm.id) as version_count
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN chats ch ON ch.id = chm.chat_id
      WHERE cm.opportunity_id = ?
      ORDER BY cm.created_at DESC
    `, [req.params.id]);

    const chats = await all(`
      SELECT * FROM chats
      WHERE opportunity_id = ?
      ORDER BY imported_at DESC
    `, [req.params.id]);

    res.json({ ...opportunity, commitments, chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chats/import', async (req, res) => {
  const { opportunity_id, salesperson, source, content } = req.body;

  try {
    const chatResult = await run(
      'INSERT INTO chats (opportunity_id, salesperson, source, raw_content) VALUES (?, ?, ?, ?)',
      [opportunity_id || null, salesperson || null, source || 'manual', content]
    );

    const chatId = chatResult.lastID;

    const { messages, commitments } = extractCommitments(content, chatId, opportunity_id);

    const commitmentResults = [];

    for (const message of messages) {
      const msgResult = await run(
        'INSERT INTO chat_messages (chat_id, sender, content, timestamp, message_type) VALUES (?, ?, ?, ?, ?)',
        [chatId, message.sender, message.content, message.timestamp, message.message_type]
      );
      const messageId = msgResult.lastID;

      const messageCommitments = commitments.filter(c =>
        message.content.includes(c.original_sentence)
      );

      for (const commitment of messageCommitments) {
        const cmResult = await run(
          `INSERT INTO commitments
           (chat_message_id, opportunity_id, type, content, original_sentence, confidence, confidence_reason, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [messageId, opportunity_id || null, commitment.type, commitment.content,
           commitment.original_sentence, commitment.confidence,
           commitment.confidence_reason, 'pending']
        );

        const fullCommitment = await get(`
          SELECT cm.*, chm.sender, chm.content as message_content, chm.timestamp
          FROM commitments cm
          JOIN chat_messages chm ON chm.id = cm.chat_message_id
          WHERE cm.id = ?
        `, [cmResult.lastID]);

        fullCommitment.typeName = COMMITMENT_TYPES[fullCommitment.type];
        commitmentResults.push(fullCommitment);
      }
    }

    res.status(201).json({ chatId, commitments: commitmentResults, messages });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

router.get('/chats/:id', async (req, res) => {
  try {
    const chat = await get('SELECT * FROM chats WHERE id = ?', [req.params.id]);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await all(`
      SELECT * FROM chat_messages
      WHERE chat_id = ?
      ORDER BY id
    `, [req.params.id]);

    res.json({ ...chat, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commitments', async (req, res) => {
  try {
    const { opportunity_id, status, type, min_confidence } = req.query;

    let query = `
      SELECT cm.*,
             chm.sender,
             chm.content as message_content,
             chm.timestamp,
             o.name as opportunity_name,
             c.name as customer_name
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (opportunity_id) {
      query += ' AND cm.opportunity_id = ?';
      params.push(opportunity_id);
    }
    if (status) {
      query += ' AND cm.status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND cm.type = ?';
      params.push(type);
    }
    if (min_confidence) {
      query += ' AND cm.confidence >= ?';
      params.push(parseFloat(min_confidence));
    }

    query += ' ORDER BY cm.created_at DESC';

    const commitments = await all(query, params);
    res.json(commitments.map(cm => ({
      ...cm,
      typeName: COMMITMENT_TYPES[cm.type],
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commitments/:id', async (req, res) => {
  try {
    const commitment = await get(`
      SELECT cm.*,
             chm.sender,
             chm.content as message_content,
             chm.timestamp,
             ch.salesperson,
             o.name as opportunity_name,
             o.id as opportunity_id,
             c.name as customer_name
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN chats ch ON ch.id = chm.chat_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE cm.id = ?
    `, [req.params.id]);

    if (!commitment) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    commitment.typeName = COMMITMENT_TYPES[commitment.type];

    const versions = await all(`
      SELECT * FROM commitment_versions
      WHERE commitment_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    const approvals = await all(`
      SELECT * FROM approvals
      WHERE commitment_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({ ...commitment, versions, approvals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/commitments/:id', async (req, res) => {
  try {
    const { content, original_sentence, type, confidence, confidence_reason, contract_reference, changed_by, change_reason } = req.body;

    const existing = await get('SELECT * FROM commitments WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    await run(
      `INSERT INTO commitment_versions
       (commitment_id, content, original_sentence, type, confidence, confidence_reason, changed_by, change_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [existing.id, existing.content, existing.original_sentence, existing.type,
       existing.confidence, existing.confidence_reason,
       changed_by || 'system', change_reason || 'manual_edit']
    );

    await run(
      `UPDATE commitments
       SET content = ?, original_sentence = ?, type = ?, confidence = ?,
           confidence_reason = ?, contract_reference = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [content || existing.content,
       original_sentence || existing.original_sentence,
       type || existing.type,
       confidence !== undefined ? confidence : existing.confidence,
       confidence_reason !== undefined ? confidence_reason : existing.confidence_reason,
       contract_reference !== undefined ? contract_reference : existing.contract_reference,
       req.params.id]
    );

    const updated = await get(`
      SELECT cm.*,
             chm.sender,
             chm.content as message_content,
             o.name as opportunity_name,
             c.name as customer_name
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE cm.id = ?
    `, [req.params.id]);

    updated.typeName = COMMITMENT_TYPES[updated.type];
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commitments/:id/approve', async (req, res) => {
  try {
    const { approver, action, comment } = req.body;

    const existing = await get('SELECT * FROM commitments WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Commitment not found' });
    }

    const newStatus = action === 'approve' ? 'approved' :
                      action === 'reject' ? 'rejected' :
                      action === 'revise' ? 'needs_revision' : existing.status;

    await run(
      'INSERT INTO approvals (commitment_id, approver, action, comment) VALUES (?, ?, ?, ?)',
      [req.params.id, approver || '主管', action, comment || null]
    );

    await run(
      'UPDATE commitments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.params.id]
    );

    const updated = await get('SELECT * FROM commitments WHERE id = ?', [req.params.id]);
    updated.typeName = COMMITMENT_TYPES[updated.type];
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commitments/bulk-approve', async (req, res) => {
  try {
    const { ids, approver, action } = req.body;
    const newStatus = action === 'approve' ? 'approved' :
                      action === 'reject' ? 'rejected' : 'pending';

    for (const id of ids) {
      await run(
        'INSERT INTO approvals (commitment_id, approver, action, comment) VALUES (?, ?, ?, ?)',
        [id, approver || '主管', action, '批量审批']
      );
      await run(
        'UPDATE commitments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, id]
      );
    }

    const placeholders = ids.map(() => '?').join(',');
    const updated = await all(`
      SELECT cm.*, chm.sender, o.name as opportunity_name, c.name as customer_name
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE cm.id IN (${placeholders})
    `, ids);

    res.json(updated.map(cm => ({ ...cm, typeName: COMMITMENT_TYPES[cm.type] })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commitments/:id/history', async (req, res) => {
  try {
    const versions = await all(`
      SELECT * FROM commitment_versions
      WHERE commitment_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    const approvals = await all(`
      SELECT * FROM approvals
      WHERE commitment_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({ versions, approvals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/commitments', async (req, res) => {
  try {
    const { opportunity_id, format = 'json' } = req.query;

    let query = `
      SELECT cm.id,
             cm.type,
             cm.content,
             cm.original_sentence,
             cm.confidence,
             cm.confidence_reason,
             cm.status,
             cm.contract_reference,
             cm.created_at,
             chm.sender,
             chm.timestamp,
             o.name as opportunity_name,
             c.name as customer_name,
             c.company as customer_company
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
    `;

    const params = [];
    if (opportunity_id) {
      query += ' WHERE cm.opportunity_id = ?';
      params.push(opportunity_id);
    }
    query += ' ORDER BY cm.created_at DESC';

    const commitments = await all(query, params);

    if (format === 'csv') {
      const headers = ['ID', '类型', '承诺内容', '原句', '置信度', '置信度说明', '状态', '合同引用',
                       '发送人', '时间', '机会名称', '客户名称', '客户公司'];
      const rows = commitments.map(cm => [
        cm.id, COMMITMENT_TYPES[cm.type], `"${cm.content}"`, `"${cm.original_sentence}"`,
        cm.confidence, `"${cm.confidence_reason || ''}"`, cm.status,
        `"${cm.contract_reference || ''}"`, cm.sender, cm.timestamp,
        cm.opportunity_name, cm.customer_name, cm.customer_company
      ]);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=commitments.csv');
      res.send('\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
    } else {
      res.json(commitments.map(cm => ({
        ...cm,
        typeName: COMMITMENT_TYPES[cm.type],
      })));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/by-customer', async (req, res) => {
  try {
    const summary = await all(`
      SELECT c.id,
             c.name,
             c.company,
             (SELECT COUNT(DISTINCT o.id) FROM opportunities o WHERE o.customer_id = c.id) as opportunity_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id) as total_commitments,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.status = 'approved') as approved_commitments,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.type = 'price') as price_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.type = 'gift') as gift_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.type = 'delivery') as delivery_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.type = 'aftersales') as aftersales_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm
              JOIN opportunities o ON o.id = cm.opportunity_id
              WHERE o.customer_id = c.id AND cm.type = 'condition') as condition_count
      FROM customers c
      ORDER BY total_commitments DESC
    `);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/by-opportunity', async (req, res) => {
  try {
    const summary = await all(`
      SELECT o.id,
             o.name,
             o.status,
             o.amount,
             c.name as customer_name,
             c.company as customer_company,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id) as total_commitments,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.status = 'approved') as approved_commitments,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.status = 'pending') as pending_commitments,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.type = 'price') as price_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.type = 'gift') as gift_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.type = 'delivery') as delivery_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.type = 'aftersales') as aftersales_count,
             (SELECT COUNT(DISTINCT cm.id) FROM commitments cm WHERE cm.opportunity_id = o.id AND cm.type = 'condition') as condition_count
      FROM opportunities o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY total_commitments DESC
    `);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/delivery/handover', async (req, res) => {
  try {
    const commitments = await all(`
      SELECT cm.*,
             chm.sender,
             chm.content as message_content,
             o.name as opportunity_name,
             c.name as customer_name,
             c.company as customer_company,
             c.contact as customer_contact
      FROM commitments cm
      LEFT JOIN chat_messages chm ON chm.id = cm.chat_message_id
      LEFT JOIN opportunities o ON o.id = cm.opportunity_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE cm.status = 'approved'
      ORDER BY o.id, cm.type, cm.created_at
    `);

    const grouped = {};
    for (const cm of commitments) {
      const key = cm.opportunity_id || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          opportunity_id: cm.opportunity_id,
          opportunity_name: cm.opportunity_name,
          customer_name: cm.customer_name,
          customer_company: cm.customer_company,
          customer_contact: cm.customer_contact,
          commitments: {
            price: [],
            gift: [],
            delivery: [],
            aftersales: [],
            condition: [],
          },
        };
      }
      cm.typeName = COMMITMENT_TYPES[cm.type];
      grouped[key].commitments[cm.type].push(cm);
    }

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commitment-types', (req, res) => {
  res.json(COMMITMENT_TYPES);
});

module.exports = router;
