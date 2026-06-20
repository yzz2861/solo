const { db } = require('../db/database');
const { generateNo, addDays, calculateExtensionFee } = require('../utils/helpers');
const config = require('../config');
const { getCardById, updateCardEndDate } = require('./cardService');
const { createTransaction } = require('./feeService');

async function createManualAdjustment(data) {
  const card = await getCardById(data.card_id);
  if (!card) {
    throw new Error('月卡不存在');
  }

  const adjustmentNo = generateNo('ADJ');
  const oldEndDate = card.end_date;
  let newEndDate = card.end_date;
  let adjustAmount = 0;
  let calcDetail = null;

  if (data.adjust_type === 'extend_days') {
    if (!data.adjust_days || data.adjust_days <= 0) {
      throw new Error('延期天数必须大于0');
    }
    newEndDate = addDays(oldEndDate, data.adjust_days);
    const feeCalc = calculateExtensionFee(card.monthly_fee, data.adjust_days);
    adjustAmount = feeCalc.amount;
    calcDetail = feeCalc;
  } else if (data.adjust_type === 'shorten_days') {
    if (!data.adjust_days || data.adjust_days <= 0) {
      throw new Error('缩短天数必须大于0');
    }
    newEndDate = addDays(oldEndDate, -data.adjust_days);
    const feeCalc = calculateExtensionFee(card.monthly_fee, data.adjust_days);
    adjustAmount = -feeCalc.amount;
    calcDetail = feeCalc;
  } else if (data.adjust_type === 'set_end_date') {
    if (!data.new_end_date) {
      throw new Error('请指定新的到期日');
    }
    newEndDate = data.new_end_date;
  } else if (data.adjust_type === 'fee_adjust') {
    adjustAmount = data.adjust_amount || 0;
  }

  await db.run(
    `INSERT INTO manual_adjustments (
      adjustment_no, card_id, owner_id, adjust_type, adjust_days,
      adjust_amount, old_end_date, new_end_date, reason, operator
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adjustmentNo,
      data.card_id,
      card.owner_id,
      data.adjust_type,
      data.adjust_days || null,
      adjustAmount,
      oldEndDate,
      newEndDate,
      data.reason,
      data.operator || null
    ]
  );

  if (data.adjust_type === 'extend_days' ||
      data.adjust_type === 'shorten_days' ||
      data.adjust_type === 'set_end_date') {
    await updateCardEndDate(data.card_id, newEndDate, card.original_end_date);
  }

  if (adjustAmount !== 0) {
    const direction = adjustAmount > 0
      ? config.transactionDirections.IN
      : config.transactionDirections.OUT;
    await createTransaction({
      card_id: data.card_id,
      owner_id: card.owner_id,
      transaction_type: config.transactionTypes.MANUAL_ADJUST,
      amount: Math.abs(adjustAmount),
      direction: direction,
      related_type: 'manual_adjustment',
      related_no: adjustmentNo,
      calc_detail: calcDetail,
      operator: data.operator,
      remark: `人工调整-${data.adjust_type}，原因：${data.reason}`
    });
  }

  return getAdjustmentByNo(adjustmentNo);
}

async function getAdjustmentByNo(adjustmentNo) {
  return db.get(`
    SELECT ma.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM manual_adjustments ma
    JOIN monthly_cards mc ON ma.card_id = mc.id
    JOIN car_owners co ON ma.owner_id = co.id
    WHERE ma.adjustment_no = ?
  `, [adjustmentNo]);
}

async function listAdjustments(params = {}) {
  const { page = 1, pageSize = 20, card_no, adjust_type, operator, start_date, end_date } = params;

  let where = [];
  let values = [];

  if (card_no) {
    where.push('mc.card_no = ?');
    values.push(card_no);
  }
  if (adjust_type) {
    where.push('ma.adjust_type = ?');
    values.push(adjust_type);
  }
  if (operator) {
    where.push('ma.operator = ?');
    values.push(operator);
  }
  if (start_date) {
    where.push('ma.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('ma.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM manual_adjustments ma
    JOIN monthly_cards mc ON ma.card_id = mc.id
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT ma.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM manual_adjustments ma
    JOIN monthly_cards mc ON ma.card_id = mc.id
    JOIN car_owners co ON ma.owner_id = co.id
    ${whereSql}
    ORDER BY ma.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  return { total, page, pageSize, list };
}

module.exports = {
  createManualAdjustment,
  getAdjustmentByNo,
  listAdjustments
};
