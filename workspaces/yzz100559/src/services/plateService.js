const { db } = require('../db/database');
const { generateNo } = require('../utils/helpers');
const { getCardById, updateCardPlate } = require('./cardService');

async function changePlate(data) {
  const card = await getCardById(data.card_id);
  if (!card) {
    throw new Error('月卡不存在');
  }

  const oldPlate = card.plate_number;
  const newPlate = data.new_plate;

  if (oldPlate === newPlate) {
    throw new Error('新车牌与旧车牌相同');
  }

  const changeNo = generateNo('PLT');

  await db.run(
    `INSERT INTO plate_changes (
      change_no, card_id, owner_id, old_plate, new_plate,
      reason, operator, effective_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      changeNo,
      data.card_id,
      card.owner_id,
      oldPlate,
      newPlate,
      data.reason || null,
      data.operator || null,
      data.effective_date || new Date().toISOString().split('T')[0]
    ]
  );

  await updateCardPlate(data.card_id, newPlate);

  return getPlateChangeByNo(changeNo);
}

async function getPlateChangeByNo(changeNo) {
  return db.get(`
    SELECT pc.*, mc.card_no, co.owner_no, co.name as owner_name
    FROM plate_changes pc
    JOIN monthly_cards mc ON pc.card_id = mc.id
    JOIN car_owners co ON pc.owner_id = co.id
    WHERE pc.change_no = ?
  `, [changeNo]);
}

async function getPlateChangesByCard(cardId) {
  return db.all(`
    SELECT * FROM plate_changes
    WHERE card_id = ?
    ORDER BY created_at DESC
  `, [cardId]);
}

async function listPlateChanges(params = {}) {
  const { page = 1, pageSize = 20, card_no, start_date, end_date } = params;

  let where = [];
  let values = [];

  if (card_no) {
    where.push('mc.card_no = ?');
    values.push(card_no);
  }
  if (start_date) {
    where.push('pc.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('pc.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await db.get(`
    SELECT COUNT(*) as count
    FROM plate_changes pc
    JOIN monthly_cards mc ON pc.card_id = mc.id
    ${whereSql}
  `, values);
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const list = await db.all(`
    SELECT pc.*, mc.card_no, co.owner_no, co.name as owner_name
    FROM plate_changes pc
    JOIN monthly_cards mc ON pc.card_id = mc.id
    JOIN car_owners co ON pc.owner_id = co.id
    ${whereSql}
    ORDER BY pc.id DESC
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  return { total, page, pageSize, list };
}

async function getAllOldPlates(cardId) {
  const changes = await getPlateChangesByCard(cardId);
  return changes.map(c => ({
    plate: c.old_plate,
    effective_from: c.effective_date,
    effective_to: c.created_at,
    change_no: c.change_no
  }));
}

module.exports = {
  changePlate,
  getPlateChangeByNo,
  getPlateChangesByCard,
  listPlateChanges,
  getAllOldPlates
};
