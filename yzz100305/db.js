const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_type TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_name TEXT NOT NULL,
      record_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(batch_type, file_hash)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      product_name TEXT,
      quantity REAL,
      price REAL,
      amount REAL,
      order_date TEXT,
      batch_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);

    CREATE TABLE IF NOT EXISTS replacements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      original_product TEXT,
      replaced_product TEXT,
      quantity REAL,
      original_price REAL,
      replaced_price REAL,
      original_amount REAL,
      replaced_amount REAL,
      amount_diff REAL,
      replace_date TEXT,
      batch_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id)
    );
    CREATE INDEX IF NOT EXISTS idx_replacements_order_no ON replacements(order_no);
    CREATE INDEX IF NOT EXISTS idx_replacements_batch_id ON replacements(batch_id);

    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      refund_amount REAL,
      refund_date TEXT,
      refund_reason TEXT,
      batch_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id)
    );
    CREATE INDEX IF NOT EXISTS idx_refunds_order_no ON refunds(order_no);
    CREATE INDEX IF NOT EXISTS idx_refunds_batch_id ON refunds(batch_id);

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      review_status TEXT DEFAULT 'pending',
      review_comment TEXT DEFAULT '',
      final_status TEXT DEFAULT 'normal',
      manual_adjustment INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_order_no ON reviews(order_no);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(review_status);
  `);
}

function computeFileHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function checkBatchExists(batchType, fileHash) {
  const row = db.prepare(
    'SELECT * FROM import_batches WHERE batch_type = ? AND file_hash = ?'
  ).get(batchType, fileHash);
  return row || null;
}

function createBatch(batchType, fileHash, fileName, recordCount) {
  const info = db.prepare(
    'INSERT INTO import_batches (batch_type, file_hash, file_name, record_count) VALUES (?, ?, ?, ?)'
  ).run(batchType, fileHash, fileName, recordCount);
  return info.lastInsertRowid;
}

function insertOrders(orders, batchId) {
  const stmt = db.prepare(`
    INSERT INTO orders (order_no, product_name, quantity, price, amount, order_date, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((list) => {
    for (const o of list) {
      stmt.run(
        o.order_no,
        o.product_name || '',
        o.quantity || 0,
        o.price || 0,
        o.amount || 0,
        o.order_date || '',
        batchId
      );
    }
  });
  insertMany(orders);
}

function insertReplacements(replacements, batchId) {
  const stmt = db.prepare(`
    INSERT INTO replacements (
      order_no, original_product, replaced_product, quantity,
      original_price, replaced_price, original_amount, replaced_amount,
      amount_diff, replace_date, batch_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((list) => {
    for (const r of list) {
      stmt.run(
        r.order_no,
        r.original_product || '',
        r.replaced_product || '',
        r.quantity || 0,
        r.original_price || 0,
        r.replaced_price || 0,
        r.original_amount || 0,
        r.replaced_amount || 0,
        r.amount_diff || 0,
        r.replace_date || '',
        batchId
      );
    }
  });
  insertMany(replacements);
}

function insertRefunds(refunds, batchId) {
  const stmt = db.prepare(`
    INSERT INTO refunds (order_no, refund_amount, refund_date, refund_reason, batch_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((list) => {
    for (const r of list) {
      stmt.run(
        r.order_no,
        r.refund_amount || 0,
        r.refund_date || '',
        r.refund_reason || '',
        batchId
      );
    }
  });
  insertMany(refunds);
}

function ensureReview(orderNo) {
  const existing = db.prepare('SELECT id FROM reviews WHERE order_no = ?').get(orderNo);
  if (!existing) {
    db.prepare('INSERT INTO reviews (order_no) VALUES (?)').run(orderNo);
  }
}

function getAggregatedOrders(filters = {}) {
  const whereClauses = [];
  const params = [];

  if (filters.status === 'unbalanced') {
    whereClauses.push('rep.id IS NOT NULL AND ABS(COALESCE(rep.amount_diff, 0)) > 0.01');
  } else if (filters.status === 'late_refund') {
    whereClauses.push(`
      ref.id IS NOT NULL
      AND rep.id IS NOT NULL
      AND ref.refund_date IS NOT NULL
      AND rep.replace_date IS NOT NULL
      AND ref.refund_date > rep.replace_date
    `);
  } else if (filters.status === 'manual') {
    whereClauses.push('r.manual_adjustment = 1');
  } else if (filters.status === 'has_replace') {
    whereClauses.push('rep.id IS NOT NULL');
  } else if (filters.status === 'has_refund') {
    whereClauses.push('ref.id IS NOT NULL');
  } else if (filters.status === 'pending') {
    whereClauses.push("r.review_status = 'pending'");
  } else if (filters.status === 'reviewed') {
    whereClauses.push("r.review_status = 'reviewed'");
  }

  if (filters.keyword) {
    whereClauses.push('o.order_no LIKE ?');
    params.push(`%${filters.keyword}%`);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const sql = `
    SELECT
      o.order_no,
      o.product_name,
      o.quantity,
      o.price,
      o.amount AS order_amount,
      o.order_date,
      rep.original_product,
      rep.replaced_product,
      rep.quantity AS rep_quantity,
      rep.original_price,
      rep.replaced_price,
      rep.original_amount,
      rep.replaced_amount,
      rep.amount_diff,
      rep.replace_date,
      ref.refund_amount,
      ref.refund_date,
      ref.refund_reason,
      COALESCE(r.review_status, 'pending') AS review_status,
      COALESCE(r.review_comment, '') AS review_comment,
      COALESCE(r.final_status, 'normal') AS final_status,
      COALESCE(r.manual_adjustment, 0) AS manual_adjustment,
      CASE
        WHEN rep.id IS NOT NULL THEN 1 ELSE 0
      END AS has_replace,
      CASE
        WHEN ref.id IS NOT NULL THEN 1 ELSE 0
      END AS has_refund,
      CASE
        WHEN rep.id IS NOT NULL AND ref.id IS NOT NULL THEN '已替换已退款'
        WHEN rep.id IS NOT NULL THEN '已替换未退款'
        WHEN ref.id IS NOT NULL THEN '已退款未替换'
        ELSE '正常订单'
      END AS flow_status,
      CASE
        WHEN rep.id IS NOT NULL AND ABS(COALESCE(rep.amount_diff, 0)) > 0.01 THEN 1
        ELSE 0
      END AS is_amount_unbalanced,
      CASE
        WHEN ref.id IS NOT NULL AND rep.id IS NOT NULL
          AND ref.refund_date > rep.replace_date THEN 1
        ELSE 0
      END AS is_late_refund
    FROM orders o
    LEFT JOIN replacements rep ON o.order_no = rep.order_no
    LEFT JOIN refunds ref ON o.order_no = ref.order_no
    LEFT JOIN reviews r ON o.order_no = r.order_no
    ${whereSql}
    ORDER BY o.order_date DESC, o.order_no DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM orders o
    LEFT JOIN replacements rep ON o.order_no = rep.order_no
    LEFT JOIN refunds ref ON o.order_no = ref.order_no
    LEFT JOIN reviews r ON o.order_no = r.order_no
    ${whereSql}
  `;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const listParams = [...params, pageSize, offset];
  const list = db.prepare(sql).all(...listParams);
  const countResult = db.prepare(countSql).get(...params);

  return {
    list,
    total: countResult.total,
    page,
    pageSize
  };
}

function getOrderByNo(orderNo) {
  const sql = `
    SELECT
      o.order_no,
      o.product_name,
      o.quantity,
      o.price,
      o.amount AS order_amount,
      o.order_date,
      rep.original_product,
      rep.replaced_product,
      rep.quantity AS rep_quantity,
      rep.original_price,
      rep.replaced_price,
      rep.original_amount,
      rep.replaced_amount,
      rep.amount_diff,
      rep.replace_date,
      ref.refund_amount,
      ref.refund_date,
      ref.refund_reason,
      COALESCE(r.review_status, 'pending') AS review_status,
      COALESCE(r.review_comment, '') AS review_comment,
      COALESCE(r.final_status, 'normal') AS final_status,
      COALESCE(r.manual_adjustment, 0) AS manual_adjustment,
      CASE
        WHEN rep.id IS NOT NULL THEN 1 ELSE 0
      END AS has_replace,
      CASE
        WHEN ref.id IS NOT NULL THEN 1 ELSE 0
      END AS has_refund
    FROM orders o
    LEFT JOIN replacements rep ON o.order_no = rep.order_no
    LEFT JOIN refunds ref ON o.order_no = ref.order_no
    LEFT JOIN reviews r ON o.order_no = r.order_no
    WHERE o.order_no = ?
  `;
  return db.prepare(sql).get(orderNo);
}

function updateReview(orderNo, data) {
  ensureReview(orderNo);
  const fields = [];
  const values = [];

  if (data.review_status !== undefined) {
    fields.push('review_status = ?');
    values.push(data.review_status);
  }
  if (data.review_comment !== undefined) {
    fields.push('review_comment = ?');
    values.push(data.review_comment);
  }
  if (data.final_status !== undefined) {
    fields.push('final_status = ?');
    values.push(data.final_status);
  }
  if (data.manual_adjustment !== undefined) {
    fields.push('manual_adjustment = ?');
    values.push(data.manual_adjustment ? 1 : 0);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(orderNo);

  const sql = `UPDATE reviews SET ${fields.join(', ')} WHERE order_no = ?`;
  db.prepare(sql).run(...values);
  return getOrderByNo(orderNo);
}

function getBatches() {
  return db.prepare(
    'SELECT * FROM import_batches ORDER BY created_at DESC'
  ).all();
}

function getStatistics() {
  const totalOrders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const totalReplace = db.prepare('SELECT COUNT(DISTINCT order_no) AS c FROM replacements').get().c;
  const totalRefund = db.prepare('SELECT COUNT(DISTINCT order_no) AS c FROM refunds').get().c;

  const unbalanced = db.prepare(`
    SELECT COUNT(DISTINCT o.order_no) AS c
    FROM orders o
    JOIN replacements rep ON o.order_no = rep.order_no
    WHERE ABS(rep.amount_diff) > 0.01
  `).get().c;

  const lateRefund = db.prepare(`
    SELECT COUNT(DISTINCT o.order_no) AS c
    FROM orders o
    JOIN replacements rep ON o.order_no = rep.order_no
    JOIN refunds ref ON o.order_no = ref.order_no
    WHERE ref.refund_date > rep.replace_date
  `).get().c;

  const pending = db.prepare(`
    SELECT COUNT(*) AS c FROM reviews WHERE review_status = 'pending'
  `).get().c;

  const manual = db.prepare(`
    SELECT COUNT(*) AS c FROM reviews WHERE manual_adjustment = 1
  `).get().c;

  const totalOrderAmount = db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM orders').get().s;
  const totalRefundAmount = db.prepare('SELECT COALESCE(SUM(refund_amount), 0) AS s FROM refunds').get().s;
  const totalDiffAmount = db.prepare('SELECT COALESCE(SUM(amount_diff), 0) AS s FROM replacements').get().s;

  return {
    totalOrders,
    totalReplace,
    totalRefund,
    unbalanced,
    lateRefund,
    pending,
    manual,
    totalOrderAmount,
    totalRefundAmount,
    totalDiffAmount
  };
}

function getAllOrdersForExport(filters = {}) {
  const whereClauses = [];
  const params = [];

  if (filters.status === 'unbalanced') {
    whereClauses.push('rep.id IS NOT NULL AND ABS(COALESCE(rep.amount_diff, 0)) > 0.01');
  } else if (filters.status === 'late_refund') {
    whereClauses.push(`
      ref.id IS NOT NULL
      AND rep.id IS NOT NULL
      AND ref.refund_date IS NOT NULL
      AND rep.replace_date IS NOT NULL
      AND ref.refund_date > rep.replace_date
    `);
  } else if (filters.status === 'manual') {
    whereClauses.push('r.manual_adjustment = 1');
  } else if (filters.status === 'has_replace') {
    whereClauses.push('rep.id IS NOT NULL');
  } else if (filters.status === 'has_refund') {
    whereClauses.push('ref.id IS NOT NULL');
  } else if (filters.status === 'pending') {
    whereClauses.push("r.review_status = 'pending'");
  } else if (filters.status === 'reviewed') {
    whereClauses.push("r.review_status = 'reviewed'");
  }

  if (filters.keyword) {
    whereClauses.push('o.order_no LIKE ?');
    params.push(`%${filters.keyword}%`);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const sql = `
    SELECT
      o.order_no,
      o.product_name,
      o.quantity,
      o.price,
      o.amount AS order_amount,
      o.order_date,
      rep.original_product,
      rep.replaced_product,
      rep.quantity AS rep_quantity,
      rep.original_price,
      rep.replaced_price,
      rep.original_amount,
      rep.replaced_amount,
      rep.amount_diff,
      rep.replace_date,
      ref.refund_amount,
      ref.refund_date,
      ref.refund_reason,
      COALESCE(r.review_status, 'pending') AS review_status,
      COALESCE(r.review_comment, '') AS review_comment,
      COALESCE(r.final_status, 'normal') AS final_status,
      COALESCE(r.manual_adjustment, 0) AS manual_adjustment,
      CASE
        WHEN rep.id IS NOT NULL THEN 1 ELSE 0
      END AS has_replace,
      CASE
        WHEN ref.id IS NOT NULL THEN 1 ELSE 0
      END AS has_refund,
      CASE
        WHEN rep.id IS NOT NULL AND ABS(COALESCE(rep.amount_diff, 0)) > 0.01 THEN '是'
        ELSE '否'
      END AS is_amount_unbalanced,
      CASE
        WHEN ref.id IS NOT NULL AND rep.id IS NOT NULL
          AND ref.refund_date > rep.replace_date THEN '是'
        ELSE '否'
      END AS is_late_refund,
      CASE
        WHEN r.manual_adjustment = 1 THEN '是'
        ELSE '否'
      END AS is_manual
    FROM orders o
    LEFT JOIN replacements rep ON o.order_no = rep.order_no
    LEFT JOIN refunds ref ON o.order_no = ref.order_no
    LEFT JOIN reviews r ON o.order_no = r.order_no
    ${whereSql}
    ORDER BY o.order_date DESC, o.order_no DESC
  `;

  return db.prepare(sql).all(...params);
}

module.exports = {
  initDB,
  computeFileHash,
  checkBatchExists,
  createBatch,
  insertOrders,
  insertReplacements,
  insertRefunds,
  getAggregatedOrders,
  getOrderByNo,
  updateReview,
  getBatches,
  getStatistics,
  getAllOrdersForExport,
  ensureReview
};
