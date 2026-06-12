const db = require('../db/database');

function getCustomerDepositBalance(customerId) {
  const latest = db.prepare(`
    SELECT balance FROM deposit_ledger
    WHERE customer_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(customerId);
  return latest ? latest.balance : 0;
}

function addDepositRecord(customerId, type, amount, options = {}) {
  const currentBalance = getCustomerDepositBalance(customerId);
  let newBalance;
  if (type === 'collect' || type === 'adjust_increase') {
    newBalance = currentBalance + amount;
  } else if (type === 'refund' || type === 'adjust_decrease') {
    newBalance = currentBalance - amount;
  } else {
    newBalance = currentBalance;
  }

  const stmt = db.prepare(`
    INSERT INTO deposit_ledger
    (customer_id, delivery_order_id, return_order_id, type, amount, balance, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    customerId,
    options.deliveryOrderId || null,
    options.returnOrderId || null,
    type,
    amount,
    newBalance,
    options.remark || null
  );
  return { id: result.lastInsertRowid, balance: newBalance };
}

module.exports = { getCustomerDepositBalance, addDepositRecord };
