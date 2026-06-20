const { getCardByPlate, getCardByNo } = require('./cardService');
const { getPlateChangesByCard } = require('./plateService');
const { getExtensionsByCard } = require('./extensionService');

async function getGateInfoByPlate(plateNumber) {
  const card = await getCardByPlate(plateNumber);
  if (!card) {
    return {
      valid: false,
      reason: '未找到该车牌对应的月卡',
      plate: plateNumber
    };
  }

  const isExpired = new Date(card.end_date) < new Date();
  const isValid = card.status === 'active' && !isExpired;

  return {
    valid: isValid,
    reason: isValid ? '有效月卡' : (isExpired ? '月卡已过期' : '月卡状态异常'),
    card_no: card.card_no,
    plate_number: card.plate_number,
    card_type: card.card_type,
    owner_name: card.owner_name,
    company: card.company,
    start_date: card.start_date,
    end_date: card.end_date,
    status: card.status,
    is_expired: isExpired
  };
}

async function getGateInfoByCardNo(cardNo) {
  const card = await getCardByNo(cardNo);
  if (!card) {
    return {
      valid: false,
      reason: '月卡不存在',
      card_no: cardNo
    };
  }

  const isExpired = new Date(card.end_date) < new Date();
  const isValid = card.status === 'active' && !isExpired;

  return {
    valid: isValid,
    reason: isValid ? '有效月卡' : (isExpired ? '月卡已过期' : '月卡状态异常'),
    card_no: card.card_no,
    plate_number: card.plate_number,
    card_type: card.card_type,
    owner_name: card.owner_name,
    company: card.company,
    start_date: card.start_date,
    end_date: card.end_date,
    status: card.status,
    is_expired: isExpired
  };
}

async function getCardFullInfo(cardNo) {
  const card = await getCardByNo(cardNo);
  if (!card) return null;

  const extensions = await getExtensionsByCard(card.id);
  const plateChanges = await getPlateChangesByCard(card.id);

  const totalExtensionDays = extensions.reduce((sum, e) => sum + e.extension_days, 0);
  const oldPlates = plateChanges.map(p => ({
    plate: p.old_plate,
    change_date: p.created_at,
    change_no: p.change_no
  }));

  return {
    card,
    summary: {
      total_extension_days: totalExtensionDays,
      original_end_date: card.original_end_date,
      current_end_date: card.end_date,
      plate_change_count: plateChanges.length,
      old_plates: oldPlates
    },
    extensions,
    plate_changes: plateChanges
  };
}

module.exports = {
  getGateInfoByPlate,
  getGateInfoByCardNo,
  getCardFullInfo
};
