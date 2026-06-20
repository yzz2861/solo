const { db } = require('../db/database');
const { generateNo, calculateExtensionFee, addDays, formatDate } = require('../utils/helpers');
const config = require('../config');
const { getCardById, getCardByNo, checkCanExtend, updateCardEndDate } = require('./cardService');
const { createTransaction } = require('./feeService');

async function createApplication(data) {
  const card = await getCardById(data.card_id);
  if (!card) {
    throw new Error('月卡不存在');
  }

  const checkResult = await checkCanExtend(data.card_id, data.reason_type);
  if (!checkResult.can) {
    throw new Error(checkResult.reason);
  }

  const pendingApp = await getPendingApplicationByCard(data.card_id);
  if (pendingApp) {
    return mergeApplication(pendingApp, data);
  }

  const feeCalc = calculateExtensionFee(card.monthly_fee, data.extension_days);
  const newEndDate = addDays(card.end_date, data.extension_days);
  const applicationNo = generateNo('EXT');

  const result = await db.run(
    `INSERT INTO extension_applications (
      application_no, card_id, owner_id, reason_type, reason_detail,
      extension_days, extension_source, status, original_end_date,
      new_end_date, fee_amount, fee_calc_detail, operator
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      applicationNo,
      data.card_id,
      card.owner_id,
      data.reason_type,
      data.reason_detail || null,
      data.extension_days,
      data.extension_source || config.extensionSources.MANUAL,
      'pending',
      card.end_date,
      newEndDate,
      feeCalc.amount,
      JSON.stringify(feeCalc),
      data.operator || null
    ]
  );

  return getApplicationById(result.lastID);
}

async function mergeApplication(existingApp, newData) {
  const card = await getCardById(existingApp.card_id);
  const totalDays = existingApp.extension_days + newData.extension_days;
  const feeCalc = calculateExtensionFee(card.monthly_fee, totalDays);
  const newEndDate = addDays(existingApp.original_end_date, totalDays);

  const mergedFrom = existingApp.merged_from
    ? `${existingApp.merged_from},${existingApp.application_no}`
    : existingApp.application_no;

  await db.run(
    `UPDATE extension_applications
     SET extension_days = ?, reason_detail = ?, new_end_date = ?,
         fee_amount = ?, fee_calc_detail = ?, merged_from = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      totalDays,
      newData.reason_detail
        ? `${existingApp.reason_detail || ''}; ${newData.reason_detail}`.replace(/^; /, '')
        : existingApp.reason_detail,
      newEndDate,
      feeCalc.amount,
      JSON.stringify(feeCalc),
      mergedFrom,
      existingApp.id
    ]
  );

  return getApplicationById(existingApp.id);
}

async function getPendingApplicationByCard(cardId) {
  return db.get(`
    SELECT * FROM extension_applications
    WHERE card_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `, [cardId]);
}

async function getApplicationById(id) {
  const app = await db.get(`
    SELECT ea.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name, co.phone
    FROM extension_applications ea
    JOIN monthly_cards mc ON ea.card_id = mc.id
    JOIN car_owners co ON ea.owner_id = co.id
    WHERE ea.id = ?
  `, [id]);
  if (app && app.fee_calc_detail) {
    app.fee_calc_detail = JSON.parse(app.fee_calc_detail);
  }
  return app;
}

async function getApplicationByNo(applicationNo) {
  const app = await db.get(`
    SELECT ea.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name, co.phone
    FROM extension_applications ea
    JOIN monthly_cards mc ON ea.card_id = mc.id
    JOIN car_owners co ON ea.owner_id = co.id
    WHERE ea.application_no = ?
  `, [applicationNo]);
  if (app && app.fee_calc_detail) {
    app.fee_calc_detail = JSON.parse(app.fee_calc_detail);
  }
  return app;
}

async function approveApplication(applicationNo, operator) {
  const app = await getApplicationByNo(applicationNo);
  if (!app) {
    throw new Error('申请不存在');
  }
  if (app.status !== 'pending') {
    throw new Error('申请状态不是待审批');
  }

  await db.run(
    `UPDATE extension_applications
     SET status = 'approved', operator = ?, updated_at = CURRENT_TIMESTAMP
     WHERE application_no = ?`,
    [operator || app.operator, applicationNo]
  );

  await updateCardEndDate(app.card_id, app.new_end_date, app.original_end_date);

  if (app.fee_amount > 0) {
    await createTransaction({
      card_id: app.card_id,
      owner_id: app.owner_id,
      transaction_type: config.transactionTypes.EXTENSION_FEE,
      amount: app.fee_amount,
      direction: config.transactionDirections.IN,
      related_type: 'extension',
      related_no: applicationNo,
      calc_detail: app.fee_calc_detail,
      operator: operator || app.operator,
      remark: `延期${app.extension_days}天，原因：${app.reason_type}`
    });
  }

  return getApplicationByNo(applicationNo);
}

async function rejectApplication(applicationNo, reason, operator) {
  const app = await getApplicationByNo(applicationNo);
  if (!app) {
    throw new Error('申请不存在');
  }
  if (app.status !== 'pending') {
    throw new Error('申请状态不是待审批');
  }

  await db.run(
    `UPDATE extension_applications
     SET status = 'rejected', reason_detail = COALESCE(?, reason_detail),
         operator = ?, updated_at = CURRENT_TIMESTAMP
     WHERE application_no = ?`,
    [reason, operator, applicationNo]
  );

  return getApplicationByNo(applicationNo);
}

async function listApplications(params = {}) {
  const {
    page = 1, pageSize = 20, status, card_no, reason_type,
    extension_source, start_date, end_date
  } = params;

  let where = [];
  let values = [];

  if (status) {
    where.push('ea.status = ?');
    values.push(status);
  }
  if (card_no) {
    where.push('mc.card_no = ?');
    values.push(card_no);
  }
  if (reason_type) {
    where.push('ea.reason_type = ?');
    values.push(reason_type);
  }
  if (extension_source) {
    where.push('ea.extension_source = ?');
    values.push(extension_source);
  }
  if (start_date) {
    where.push('ea.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('ea.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM extension_applications ea
    JOIN monthly_cards mc ON ea.card_id = mc.id
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT ea.*, mc.card_no, mc.plate_number, co.owner_no, co.name as owner_name
    FROM extension_applications ea
    JOIN monthly_cards mc ON ea.card_id = mc.id
    JOIN car_owners co ON ea.owner_id = co.id
    ${whereSql}
    ORDER BY ea.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  list.forEach(item => {
    if (item.fee_calc_detail) {
      item.fee_calc_detail = JSON.parse(item.fee_calc_detail);
    }
  });

  return { total, page, pageSize, list };
}

async function getExtensionsByCard(cardId) {
  const list = await db.all(`
    SELECT * FROM extension_applications
    WHERE card_id = ? AND status = 'approved'
    ORDER BY created_at DESC
  `, [cardId]);
  return list.map(item => {
    if (item.fee_calc_detail) {
      item.fee_calc_detail = JSON.parse(item.fee_calc_detail);
    }
    return item;
  });
}

module.exports = {
  createApplication,
  getApplicationById,
  getApplicationByNo,
  approveApplication,
  rejectApplication,
  listApplications,
  getExtensionsByCard,
  getPendingApplicationByCard
};
