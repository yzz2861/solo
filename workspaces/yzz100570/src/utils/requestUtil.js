const db = require('../database/db');

const generateRequestNo = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `PO${year}${month}${day}`;
  
  const row = await db.get(`
    SELECT request_no FROM purchase_requests 
    WHERE request_no LIKE ? 
    ORDER BY request_no DESC LIMIT 1
  `, [`${prefix}%`]);
  
  let seq = 1;
  if (row) {
    const seqStr = row.request_no.substring(prefix.length);
    seq = parseInt(seqStr, 10) + 1;
  }
  
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

const checkDuplicateRequests = async (itemName, applicantId, excludeId = null) => {
  const keywords = itemName.trim().split(/\s+/).filter(k => k.length > 1);
  
  if (keywords.length === 0) return [];
  
  const likeConditions = keywords.map(() => 'item_name LIKE ?').join(' OR ');
  const params = keywords.map(k => `%${k}%`);
  
  let sql = `
    SELECT pr.id, pr.request_no, pr.item_name, pr.quantity, pr.status, pr.created_at,
           u.name as applicant_name
    FROM purchase_requests pr
    JOIN users u ON pr.applicant_id = u.id
    WHERE (${likeConditions})
    AND pr.status NOT IN ('rejected', 'returned')
    AND pr.created_at >= datetime('now', '-30 days')
  `;
  
  if (excludeId) {
    sql += ' AND pr.id != ?';
    params.push(excludeId);
  }
  
  sql += ' ORDER BY pr.created_at DESC LIMIT 5';
  
  return db.all(sql, params);
};

const getRequestDetail = async (id) => {
  const request = await db.get(`
    SELECT pr.*, u.name as applicant_name, u.department as applicant_department
    FROM purchase_requests pr
    JOIN users u ON pr.applicant_id = u.id
    WHERE pr.id = ?
  `, [id]);
  
  if (!request) return null;
  
  const quotations = await db.all('SELECT * FROM quotations WHERE request_id = ? ORDER BY total_price ASC', [id]);
  
  const approvals = await db.all(`
    SELECT a.*, u.name as approver_name
    FROM approvals a
    JOIN users u ON a.approver_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.created_at ASC
  `, [id]);
  
  const order = await db.get('SELECT * FROM orders WHERE request_id = ?', [id]);
  
  const acceptance = await db.get('SELECT * FROM acceptances WHERE request_id = ?', [id]);
  
  return {
    ...request,
    quotations,
    approvals,
    order,
    acceptance
  };
};

module.exports = {
  generateRequestNo,
  checkDuplicateRequests,
  getRequestDetail
};
