const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { all, get, run } = require('../database');
const { authenticate } = require('../middleware/auth');
const { parseDocument, getFileType, isSupportedFileType } = require('../services/documentParser');

const router = express.Router();
router.use(authenticate);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const claimDir = path.join(uploadDir, req.params.claim_id);
    if (!fs.existsSync(claimDir)) {
      fs.mkdirSync(claimDir, { recursive: true });
    }
    cb(null, claimDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

router.get('/:claim_id', async (req, res) => {
  try {
    const { claim_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const documents = await all(`
      SELECT d.*, u.name as uploader_name,
             (SELECT COUNT(*) FROM document_contents dc WHERE dc.document_id = d.id) as content_pages
      FROM documents d
      LEFT JOIN users u ON d.upload_by = u.id
      WHERE d.claim_id = ?
      ORDER BY d.upload_at DESC
    `, [claim_id]);
    
    res.json(documents);
  } catch (err) {
    console.error('获取文档列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:claim_id', upload.array('files', 20), async (req, res) => {
  try {
    const { claim_id } = req.params;
    const { doc_type } = req.body;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '未上传文件' });
    }
    
    const validTypes = ['medical', 'invoice', 'accident', 'photo', 'other'];
    const type = validTypes.includes(doc_type) ? doc_type : 'other';
    
    const insertedDocs = [];
    
    for (const file of req.files) {
      const existingDoc = await get(`
        SELECT * FROM documents 
        WHERE claim_id = ? AND file_name = ? AND file_size = ?
      `, [claim_id, file.originalname, file.size]);
      
      if (existingDoc) {
        insertedDocs.push({
          ...existingDoc,
          is_duplicate: true,
          message: '该文件已存在，跳过重复上传'
        });
        continue;
      }
      
      const result = await run(`
        INSERT INTO documents (claim_id, doc_type, file_name, file_path, file_size, upload_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [claim_id, type, file.originalname, file.path, file.size, req.user.id]);
      
      const doc = await get('SELECT * FROM documents WHERE id = ?', [result.lastID]);
      
      if (isSupportedFileType(file.originalname, file.mimetype)) {
        setImmediate(async () => {
          try {
            await parseDocument(result.lastID);
          } catch (parseErr) {
            console.error(`异步解析文档失败 [docId=${result.lastID}]:`, parseErr);
          }
        });
      } else {
        await run('UPDATE documents SET parse_status = ? WHERE id = ?', ['unsupported', result.lastID]);
      }
      
      const docWithStatus = await get('SELECT * FROM documents WHERE id = ?', [result.lastID]);
      insertedDocs.push(docWithStatus);
    }
    
    res.status(201).json(insertedDocs);
  } catch (err) {
    console.error('上传文档错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.get('/:claim_id/:doc_id/content', async (req, res) => {
  try {
    const { claim_id, doc_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const contents = await all(`
      SELECT * FROM document_contents 
      WHERE document_id = ? 
      ORDER BY page_no
    `, [doc_id]);
    
    res.json(contents);
  } catch (err) {
    console.error('获取文档内容错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:claim_id/:doc_id/content', async (req, res) => {
  try {
    const { claim_id, doc_id } = req.params;
    const { content, page_no = 1 } = req.body;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const existing = await get(`
      SELECT * FROM document_contents WHERE document_id = ? AND page_no = ?
    `, [doc_id, page_no]);
    
    let result;
    if (existing) {
      await run(`
        UPDATE document_contents SET content = ? WHERE id = ?
      `, [content, existing.id]);
      result = { id: existing.id };
    } else {
      result = await run(`
        INSERT INTO document_contents (document_id, page_no, content)
        VALUES (?, ?, ?)
      `, [doc_id, page_no, content]);
    }
    
    const docContent = await get('SELECT * FROM document_contents WHERE id = ?', [result.id]);
    res.json(docContent);
  } catch (err) {
    console.error('保存文档内容错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/:claim_id/:doc_id', async (req, res) => {
  try {
    const { claim_id, doc_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const doc = await get('SELECT * FROM documents WHERE id = ?', [doc_id]);
    if (doc && fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
    
    await run('DELETE FROM document_contents WHERE document_id = ?', [doc_id]);
    await run('DELETE FROM documents WHERE id = ?', [doc_id]);
    
    res.json({ message: '文档已删除' });
  } catch (err) {
    console.error('删除文档错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:claim_id/:doc_id/status', async (req, res) => {
  try {
    const { claim_id, doc_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const doc = await get(`
      SELECT id, parse_status, parse_error, parsed_at, page_count, text_length
      FROM documents WHERE id = ?
    `, [doc_id]);
    
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const contents = await all(`
      SELECT page_no, LENGTH(content) as content_length
      FROM document_contents WHERE document_id = ?
      ORDER BY page_no
    `, [doc_id]);
    
    res.json({
      ...doc,
      pages: contents
    });
  } catch (err) {
    console.error('获取解析状态错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:claim_id/:doc_id/reparse', async (req, res) => {
  try {
    const { claim_id, doc_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const doc = await get('SELECT * FROM documents WHERE id = ?', [doc_id]);
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    if (!isSupportedFileType(doc.file_name, '')) {
      return res.status(400).json({ error: '不支持的文件类型，无法解析' });
    }
    
    await run('UPDATE documents SET parse_status = ?, parse_error = NULL WHERE id = ?', ['pending', doc_id]);
    
    setImmediate(async () => {
      try {
        await parseDocument(doc_id);
      } catch (parseErr) {
        console.error(`重新解析文档失败 [docId=${doc_id}]:`, parseErr);
      }
    });
    
    const updatedDoc = await get('SELECT * FROM documents WHERE id = ?', [doc_id]);
    res.json(updatedDoc);
  } catch (err) {
    console.error('重新解析文档错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

module.exports = router;
