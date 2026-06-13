const fs = require('fs');
const path = require('path');
const { run, get } = require('../database');

const SUPPORTED_TYPES = {
  pdf: ['application/pdf', '.pdf'],
  word: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc',
    '.docx'
  ],
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff'
  ],
  text: [
    'text/plain',
    '.txt',
    '.md'
  ]
};

function getFileType(fileName, mimeType) {
  const ext = path.extname(fileName).toLowerCase();
  
  for (const [type, patterns] of Object.entries(SUPPORTED_TYPES)) {
    if (patterns.includes(ext) || patterns.includes(mimeType)) {
      return type;
    }
  }
  
  return 'unsupported';
}

async function parsePdf(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  const pages = [];
  if (data.text) {
    const pageTexts = data.text.split(/\f/);
    pageTexts.forEach((text, index) => {
      const trimmed = text.trim();
      if (trimmed) {
        pages.push({
          page_no: index + 1,
          content: trimmed
        });
      }
    });
  }
  
  return {
    pages: pages.length > 0 ? pages : [{ page_no: 1, content: data.text || '' }],
    page_count: data.numpages || pages.length || 1,
    text_length: (data.text || '').length
  };
}

async function parseWord(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value || '';
  
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const pages = [];
  
  const linesPerPage = 50;
  let currentPage = 1;
  let currentContent = [];
  let lineCount = 0;
  
  for (const para of paragraphs) {
    const lines = para.split('\n');
    for (const line of lines) {
      currentContent.push(line);
      lineCount++;
      if (lineCount >= linesPerPage) {
        pages.push({
          page_no: currentPage,
          content: currentContent.join('\n').trim()
        });
        currentPage++;
        currentContent = [];
        lineCount = 0;
      }
    }
  }
  
  if (currentContent.length > 0) {
    pages.push({
      page_no: currentPage,
      content: currentContent.join('\n').trim()
    });
  }
  
  if (pages.length === 0) {
    pages.push({ page_no: 1, content: text });
  }
  
  return {
    pages,
    page_count: pages.length,
    text_length: text.length
  };
}

async function parseImage(filePath) {
  const { createWorker } = require('tesseract.js');
  
  const worker = await createWorker('chi_sim+eng');
  
  try {
    const result = await worker.recognize(filePath);
    const text = result.data.text || '';
    
    const pages = [{
      page_no: 1,
      content: text.trim()
    }];
    
    return {
      pages,
      page_count: 1,
      text_length: text.length
    };
  } finally {
    await worker.terminate();
  }
}

async function parseText(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  
  const lines = text.split('\n');
  const linesPerPage = 60;
  const pages = [];
  
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const pageContent = lines.slice(i, i + linesPerPage).join('\n').trim();
    if (pageContent) {
      pages.push({
        page_no: Math.floor(i / linesPerPage) + 1,
        content: pageContent
      });
    }
  }
  
  if (pages.length === 0 && text.trim()) {
    pages.push({ page_no: 1, content: text.trim() });
  }
  
  return {
    pages,
    page_count: pages.length || 1,
    text_length: text.length
  };
}

async function updateParseStatus(docId, status, error = null, result = null) {
  const updates = [status];
  let sql = 'UPDATE documents SET parse_status = ?';
  
  if (error) {
    sql += ', parse_error = ?';
    updates.push(error);
  }
  
  if (result) {
    sql += ', page_count = ?, text_length = ?';
    updates.push(result.page_count, result.text_length);
  }
  
  sql += ', parsed_at = CURRENT_TIMESTAMP WHERE id = ?';
  updates.push(docId);
  
  await run(sql, updates);
}

async function saveDocumentContents(docId, pages) {
  await run('DELETE FROM document_contents WHERE document_id = ?', [docId]);
  
  for (const page of pages) {
    await run(
      'INSERT INTO document_contents (document_id, page_no, content) VALUES (?, ?, ?)',
      [docId, page.page_no, page.content]
    );
  }
}

async function parseDocument(docId) {
  const doc = await get('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!doc) {
    throw new Error('文档不存在');
  }
  
  if (!fs.existsSync(doc.file_path)) {
    await updateParseStatus(docId, 'failed', '文件不存在');
    return { success: false, error: '文件不存在' };
  }
  
  const fileType = getFileType(doc.file_name, '');
  
  if (fileType === 'unsupported') {
    await updateParseStatus(docId, 'unsupported', '不支持的文件类型');
    return { success: false, error: '不支持的文件类型', type: 'unsupported' };
  }
  
  await updateParseStatus(docId, 'processing');
  
  try {
    let result;
    
    switch (fileType) {
      case 'pdf':
        result = await parsePdf(doc.file_path);
        break;
      case 'word':
        result = await parseWord(doc.file_path);
        break;
      case 'image':
        result = await parseImage(doc.file_path);
        break;
      case 'text':
        result = await parseText(doc.file_path);
        break;
      default:
        throw new Error('未知的文件类型');
    }
    
    if (result.pages && result.pages.length > 0) {
      await saveDocumentContents(docId, result.pages);
    }
    
    await updateParseStatus(docId, 'success', null, result);
    
    return {
      success: true,
      type: fileType,
      page_count: result.page_count,
      text_length: result.text_length
    };
  } catch (err) {
    console.error(`解析文档失败 [docId=${docId}]:`, err);
    await updateParseStatus(docId, 'failed', err.message || '解析失败');
    return { success: false, error: err.message || '解析失败' };
  }
}

function isSupportedFileType(fileName, mimeType) {
  return getFileType(fileName, mimeType) !== 'unsupported';
}

module.exports = {
  parseDocument,
  parsePdf,
  parseWord,
  parseImage,
  parseText,
  getFileType,
  isSupportedFileType,
  updateParseStatus,
  saveDocumentContents
};
