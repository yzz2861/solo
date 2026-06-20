const { db } = require('../db/database');
const { generateNo } = require('../utils/helpers');
const config = require('../config');

async function createTransaction(data) {
  const transactionNo = generateNo('FEE');
  const calcDetail = typeof data.calc_detail === 'object'
    ? JSON.stringify(data.calc_detail)
    : data.calc_detail;

  const result = await db.run(
    `INSERT INTO fee_transactions (
      transaction_no, card_id, owner_id, transaction_type, amount,
      direction, related_type, related_no, calc_detail, operator, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionNo,
      data.card_id,
      data.owner_id,
      data.transaction_type,
      data.amount,
      data.direction,
      data.related_type || null,
      data.related_no || null,
      calcDetail || null,
      data.operator || null,
      data.remark || null
    ]
  );

  return getTransactionById(result.lastID);
}

async function getTransactionById(id) {
  const t = await db.get('SELECT * FROM fee_transactions WHERE id = ?', [id]);
  if (t && t.calc_detail) {
    try { t.calc_detail = JSON.parse(t.calc_detail); } catch (e) {}
  }
  return t;
}

async function getTransactionByNo(transactionNo) {
  const t = await db.get('SELECT * FROM fee_transactions WHERE transaction_no = ?', [transactionNo]);
  if (t && t.calc_detail) {
    try { t.calc_detail = JSON.parse(t.calc_detail); } catch (e) {}
  }
  return t;
}

async function listTransactions(params = {}) {
  const {
    page = 1, pageSize = 20, card_id, transaction_type,
    direction, start_date, end_date
  } = params;

  let where = [];
  let values = [];

  if (card_id) {
    where.push('ft.card_id = ?');
    values.push(card_id);
  }
  if (transaction_type) {
    where.push('ft.transaction_type = ?');
    values.push(transaction_type);
  }
  if (direction) {
    where.push('ft.direction = ?');
    values.push(direction);
  }
  if (start_date) {
    where.push('ft.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('ft.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM fee_transactions ft
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT ft.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM fee_transactions ft
    JOIN monthly_cards mc ON ft.card_id = mc.id
    JOIN car_owners co ON ft.owner_id = co.id
    ${whereSql}
    ORDER BY ft.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  list.forEach(item => {
    if (item.calc_detail) {
      try { item.calc_detail = JSON.parse(item.calc_detail); } catch (e) {}
    }
  });

  return { total, page, pageSize, list };
}

async function getTransactionsByCard(cardId) {
  const list = await db.all(`
    SELECT * FROM fee_transactions
    WHERE card_id = ?
    ORDER BY created_at DESC
  `, [cardId]);

  list.forEach(item => {
    if (item.calc_detail) {
      try { item.calc_detail = JSON.parse(item.calc_detail); } catch (e) {}
    }
  });

  return list;
}

async function getFeeSummary(cardId) {
  const transactions = await getTransactionsByCard(cardId);
  const totalIn = transactions
    .filter(t => t.direction === 'in')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions
    .filter(t => t.direction === 'out')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    total_income: Math.round(totalIn * 100) / 100,
    total_expense: Math.round(totalOut * 100) / 100,
    net_balance: Math.round((totalIn - totalOut) * 100) / 100,
    transaction_count: transactions.length
  };
}

async function createRefund(data) {
  const refundNo = generateNo('REF');

  const result = await db.run(
    `INSERT INTO refund_records (
      refund_no, card_id, owner_id, refund_days, refund_amount,
      reason, original_end_date, new_end_date, operator, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      refundNo,
      data.card_id,
      data.owner_id,
      data.refund_days,
      data.refund_amount,
      data.reason || null,
      data.original_end_date,
      data.new_end_date,
      data.operator || null,
      'completed'
    ]
  );

  await createTransaction({
    card_id: data.card_id,
    owner_id: data.owner_id,
    transaction_type: config.transactionTypes.REFUND,
    amount: data.refund_amount,
    direction: config.transactionDirections.OUT,
    related_type: 'refund',
    related_no: refundNo,
    calc_detail: data.calc_detail,
    operator: data.operator,
    remark: `退款${data.refund_days}天，原因：${data.reason || ''}`
  });

  return getRefundById(result.lastID);
}

async function getRefundById(id) {
  return db.get(`
    SELECT rr.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM refund_records rr
    JOIN monthly_cards mc ON rr.card_id = mc.id
    JOIN car_owners co ON rr.owner_id = co.id
    WHERE rr.id = ?
  `, [id]);
}

async function getRefundByNo(refundNo) {
  return db.get(`
    SELECT rr.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM refund_records rr
    JOIN monthly_cards mc ON rr.card_id = mc.id
    JOIN car_owners co ON rr.owner_id = co.id
    WHERE rr.refund_no = ?
  `, [refundNo]);
}

async function listRefunds(params = {}) {
  const { page = 1, pageSize = 20, card_no, start_date, end_date } = params;

  let where = [];
  let values = [];

  if (card_no) {
    where.push('mc.card_no = ?');
    values.push(card_no);
  }
  if (start_date) {
    where.push('rr.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('rr.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM refund_records rr
    JOIN monthly_cards mc ON rr.card_id = mc.id
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT rr.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM refund_records rr
    JOIN monthly_cards mc ON rr.card_id = mc.id
    JOIN car_owners co ON rr.owner_id = co.id
    ${whereSql}
    ORDER BY rr.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  return { total, page, pageSize, list };
}

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionByNo,
  listTransactions,
  getTransactionsByCard,
  getFeeSummary,
  createRefund,
  getRefundById,
  getRefundByNo,
  listRefunds
};
