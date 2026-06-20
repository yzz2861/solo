const { db } = require('../db/database');
const { generateNo, addDays, isCardExpiredTooLong, getDaysExpired } = require('../utils/helpers');
const config = require('../config');

async function createOwner(data) {
  const ownerNo = generateNo('OWN');
  const result = await db.run(
    `INSERT INTO car_owners (owner_no, name, phone, company, floor) VALUES (?, ?, ?, ?, ?)`,
    [ownerNo, data.name, data.phone, data.company, data.floor]
  );
  return getOwnerById(result.lastID);
}

async function getOwnerById(id) {
  return db.get('SELECT * FROM car_owners WHERE id = ?', [id]);
}

async function getOwnerByNo(ownerNo) {
  return db.get('SELECT * FROM car_owners WHERE owner_no = ?', [ownerNo]);
}

async function createCard(data) {
  const cardNo = generateNo('CARD');
  const result = await db.run(
    `INSERT INTO monthly_cards (card_no, owner_id, plate_number, card_type, start_date, end_date, original_end_date, monthly_fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cardNo,
      data.owner_id,
      data.plate_number,
      data.card_type || 'normal',
      data.start_date,
      data.end_date,
      data.end_date,
      data.monthly_fee || 300
    ]
  );
  return getCardById(result.lastID);
}

async function getCardById(id) {
  const card = await db.get(`
    SELECT mc.*, co.owner_no, co.name as owner_name, co.phone, co.company, co.floor
    FROM monthly_cards mc
    JOIN car_owners co ON mc.owner_id = co.id
    WHERE mc.id = ?
  `, [id]);
  if (card) {
    card.is_expired = new Date(card.end_date) < new Date();
    card.days_expired = getDaysExpired(card.end_date);
  }
  return card;
}

async function getCardByNo(cardNo) {
  const card = await db.get(`
    SELECT mc.*, co.owner_no, co.name as owner_name, co.phone, co.company, co.floor
    FROM monthly_cards mc
    JOIN car_owners co ON mc.owner_id = co.id
    WHERE mc.card_no = ?
  `, [cardNo]);
  if (card) {
    card.is_expired = new Date(card.end_date) < new Date();
    card.days_expired = getDaysExpired(card.end_date);
  }
  return card;
}

async function getCardByPlate(plateNumber) {
  const card = await db.get(`
    SELECT mc.*, co.owner_no, co.name as owner_name, co.phone, co.company, co.floor
    FROM monthly_cards mc
    JOIN car_owners co ON mc.owner_id = co.id
    WHERE mc.plate_number = ?
    ORDER BY mc.id DESC
    LIMIT 1
  `, [plateNumber]);
  if (card) {
    card.is_expired = new Date(card.end_date) < new Date();
    card.days_expired = getDaysExpired(card.end_date);
  }
  return card;
}

async function listCards(params = {}) {
  const { page = 1, pageSize = 20, status, plate_number, owner_name } = params;
  let where = [];
  let values = [];

  if (status) {
    where.push('mc.status = ?');
    values.push(status);
  }
  if (plate_number) {
    where.push('mc.plate_number LIKE ?');
    values.push(`%${plate_number}%`);
  }
  if (owner_name) {
    where.push('co.name LIKE ?');
    values.push(`%${owner_name}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM monthly_cards mc
    JOIN car_owners co ON mc.owner_id = co.id
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT mc.*, co.owner_no, co.name as owner_name, co.phone, co.company
    FROM monthly_cards mc
    JOIN car_owners co ON mc.owner_id = co.id
    ${whereSql}
    ORDER BY mc.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  list.forEach(card => {
    card.is_expired = new Date(card.end_date) < new Date();
  });

  return { total, page, pageSize, list };
}

async function updateCardEndDate(cardId, newEndDate, originalEndDate = null) {
  if (originalEndDate) {
    await db.run(
      `UPDATE monthly_cards SET end_date = ?, original_end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newEndDate, originalEndDate, cardId]
    );
  } else {
    await db.run(
      `UPDATE monthly_cards SET end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newEndDate, cardId]
    );
  }
  return getCardById(cardId);
}

async function updateCardPlate(cardId, newPlate) {
  await db.run(
    `UPDATE monthly_cards SET plate_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newPlate, cardId]
  );
  return getCardById(cardId);
}

async function getCardStatus(cardNo) {
  const card = await getCardByNo(cardNo);
  if (!card) return null;

  const extensions = await db.all(`
    SELECT * FROM extension_applications
    WHERE card_id = ? AND status = 'approved'
    ORDER BY created_at DESC
  `, [card.id]);

  const plateChanges = await db.all(`
    SELECT * FROM plate_changes
    WHERE card_id = ?
    ORDER BY created_at DESC
  `, [card.id]);

  const feeTransactions = await db.all(`
    SELECT * FROM fee_transactions
    WHERE card_id = ?
    ORDER BY created_at DESC
  `, [card.id]);

  return {
    card,
    extensions,
    plate_changes: plateChanges,
    fee_transactions: feeTransactions,
    total_extension_days: extensions.reduce((sum, e) => sum + e.extension_days, 0),
    total_fee: feeTransactions
      .filter(t => t.direction === 'in')
      .reduce((sum, t) => sum + t.amount, 0),
    total_refund: feeTransactions
      .filter(t => t.direction === 'out')
      .reduce((sum, t) => sum + t.amount, 0)
  };
}

async function checkCanExtend(cardId, reasonType) {
  const card = await getCardById(cardId);
  if (!card) {
    return { can: false, reason: '月卡不存在' };
  }

  if (card.status !== 'active') {
    return { can: false, reason: '月卡状态异常' };
  }

  const isExpiredTooLong = isCardExpiredTooLong(card.end_date, config.maxExpiredDaysForExtension);
  if (isExpiredTooLong && reasonType === 'other') {
    return {
      can: false,
      reason: `月卡已过期${getDaysExpired(card.end_date)}天，超过${config.maxExpiredDaysForExtension}天不能无理由延期`
    };
  }

  return { can: true, card };
}

module.exports = {
  createOwner,
  getOwnerById,
  getOwnerByNo,
  createCard,
  getCardById,
  getCardByNo,
  getCardByPlate,
  listCards,
  updateCardEndDate,
  updateCardPlate,
  getCardStatus,
  checkCanExtend
};
