const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { all, get, run } = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params = [];
    
    if (status) {
      whereClause = 'WHERE c.status = ?';
      params.push(status);
    }
    
    if (req.user.role === 'adjuster') {
      whereClause = whereClause ? `${whereClause} AND c.created_by = ?` : 'WHERE c.created_by = ?';
      params.push(req.user.id);
    }
    
    const claims = await all(`
      SELECT c.*, u.name as creator_name,
             (SELECT COUNT(*) FROM documents d WHERE d.claim_id = c.id) as doc_count,
             (SELECT COUNT(*) FROM summaries s WHERE s.claim_id = c.id) as has_summary
      FROM claims c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await get(`
      SELECT COUNT(*) as total FROM claims c ${whereClause}
    `, params);
    
    res.json({
      claims,
      total: totalResult.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    console.error('获取理赔案件列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, phone, accident_date } = req.body;
    
    if (!customer_name) {
      return res.status(400).json({ error: '客户姓名不能为空' });
    }
    
    const claim_no = `CL${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const result = await run(`
      INSERT INTO claims (claim_no, customer_name, phone, accident_date, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [claim_no, customer_name, phone || null, accident_date || null, req.user.id]);
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [result.lastID]);
    
    res.status(201).json(claim);
  } catch (err) {
    console.error('创建理赔案件错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const claim = await get(`
      SELECT c.*, u.name as creator_name
      FROM claims c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [id]);
    
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const documents = await all(`
      SELECT d.*, u.name as uploader_name,
             (SELECT COUNT(*) FROM document_contents dc WHERE dc.document_id = d.id) as content_count
      FROM documents d
      LEFT JOIN users u ON d.upload_by = u.id
      WHERE d.claim_id = ?
      ORDER BY d.upload_at DESC
    `, [id]);
    
    const summary = await get(`
      SELECT s.*, u.name as generator_name
      FROM summaries s
      LEFT JOIN users u ON s.generated_by = u.id
      WHERE s.claim_id = ?
    `, [id]);
    
    res.json({
      claim,
      documents,
      summary
    });
  } catch (err) {
    console.error('获取理赔案件详情错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, phone, accident_date, status } = req.body;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [id]);
    
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    await run(`
      UPDATE claims 
      SET customer_name = COALESCE(?, customer_name),
          phone = COALESCE(?, phone),
          accident_date = COALESCE(?, accident_date),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [customer_name, phone, accident_date, status, id]);
    
    const updatedClaim = await get('SELECT * FROM claims WHERE id = ?', [id]);
    
    res.json(updatedClaim);
  } catch (err) {
    console.error('更新理赔案件错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:id', requireRole(['supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await run('DELETE FROM claims WHERE id = ?', [id]);
    
    res.json({ message: '理赔案件已删除' });
  } catch (err) {
    console.error('删除理赔案件错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
