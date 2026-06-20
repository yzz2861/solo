const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');

const exportDir = path.join(__dirname, '..', '..', 'exports');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

async function exportExtensions(params = {}) {
  const { start_date, end_date, status, extension_source } = params;

  let where = [];
  let values = [];

  if (status) {
    where.push('ea.status = ?');
    values.push(status);
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

  const list = await db.all(`
    SELECT
      ea.application_no,
      mc.card_no,
      mc.plate_number,
      co.owner_no,
      co.name as owner_name,
      co.phone,
      co.company,
      ea.reason_type,
      ea.reason_detail,
      ea.extension_days,
      ea.extension_source,
      ea.status,
      ea.original_end_date,
      ea.new_end_date,
      ea.fee_amount,
      ea.operator,
      ea.merged_from,
      ea.created_at,
      ea.updated_at
    FROM extension_applications ea
    JOIN monthly_cards mc ON ea.card_id = mc.id
    JOIN car_owners co ON ea.owner_id = co.id
    ${whereSql}
    ORDER BY ea.id DESC
  `, values);

  const fileName = `extensions_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'application_no', title: '申请编号' },
      { id: 'card_no', title: '月卡编号' },
      { id: 'plate_number', title: '车牌号' },
      { id: 'owner_no', title: '车主编号' },
      { id: 'owner_name', title: '车主姓名' },
      { id: 'phone', title: '联系电话' },
      { id: 'company', title: '公司' },
      { id: 'reason_type', title: '延期原因类型' },
      { id: 'reason_detail', title: '延期原因详情' },
      { id: 'extension_days', title: '延期天数' },
      { id: 'extension_source', title: '延期来源(manual人工/rule规则)' },
      { id: 'status', title: '状态' },
      { id: 'original_end_date', title: '原到期日' },
      { id: 'new_end_date', title: '新到期日' },
      { id: 'fee_amount', title: '费用(元)' },
      { id: 'operator', title: '操作人' },
      { id: 'merged_from', title: '合并来源' },
      { id: 'created_at', title: '创建时间' },
      { id: 'updated_at', title: '更新时间' }
    ]
  });

  await csvWriter.writeRecords(list);
  return {
    file_name: fileName,
    file_path: filePath,
    record_count: list.length
  };
}

async function exportRefunds(params = {}) {
  const { start_date, end_date } = params;

  let where = [];
  let values = [];

  if (start_date) {
    where.push('rr.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('rr.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const list = await db.all(`
    SELECT
      rr.refund_no,
      mc.card_no,
      mc.plate_number,
      co.owner_no,
      co.name as owner_name,
      co.phone,
      rr.refund_days,
      rr.refund_amount,
      rr.reason,
      rr.original_end_date,
      rr.new_end_date,
      rr.operator,
      rr.status,
      rr.created_at
    FROM refund_records rr
    JOIN monthly_cards mc ON rr.card_id = mc.id
    JOIN car_owners co ON rr.owner_id = co.id
    ${whereSql}
    ORDER BY rr.id DESC
  `, values);

  const fileName = `refunds_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'refund_no', title: '退款编号' },
      { id: 'card_no', title: '月卡编号' },
      { id: 'plate_number', title: '车牌号' },
      { id: 'owner_no', title: '车主编号' },
      { id: 'owner_name', title: '车主姓名' },
      { id: 'phone', title: '联系电话' },
      { id: 'refund_days', title: '退款天数' },
      { id: 'refund_amount', title: '退款金额(元)' },
      { id: 'reason', title: '退款原因' },
      { id: 'original_end_date', title: '原到期日' },
      { id: 'new_end_date', title: '新到期日' },
      { id: 'operator', title: '操作人' },
      { id: 'status', title: '状态' },
      { id: 'created_at', title: '创建时间' }
    ]
  });

  await csvWriter.writeRecords(list);
  return {
    file_name: fileName,
    file_path: filePath,
    record_count: list.length
  };
}

async function exportPlateChanges(params = {}) {
  const { start_date, end_date } = params;

  let where = [];
  let values = [];

  if (start_date) {
    where.push('pc.created_at >= ?');
    values.push(start_date);
  }
  if (end_date) {
    where.push('pc.created_at <= ?');
    values.push(end_date + ' 23:59:59');
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const list = await db.all(`
    SELECT
      pc.change_no,
      mc.card_no,
      co.owner_no,
      co.name as owner_name,
      co.phone,
      pc.old_plate,
      pc.new_plate,
      pc.reason,
      pc.effective_date,
      pc.operator,
      pc.created_at
    FROM plate_changes pc
    JOIN monthly_cards mc ON pc.card_id = mc.id
    JOIN car_owners co ON pc.owner_id = co.id
    ${whereSql}
    ORDER BY pc.id DESC
  `, values);

  const fileName = `plate_changes_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'change_no', title: '变更编号' },
      { id: 'card_no', title: '月卡编号' },
      { id: 'owner_no', title: '车主编号' },
      { id: 'owner_name', title: '车主姓名' },
      { id: 'phone', title: '联系电话' },
      { id: 'old_plate', title: '原车牌号' },
      { id: 'new_plate', title: '新车牌号' },
      { id: 'reason', title: '变更原因' },
      { id: 'effective_date', title: '生效日期' },
      { id: 'operator', title: '操作人' },
      { id: 'created_at', title: '创建时间' }
    ]
  });

  await csvWriter.writeRecords(list);
  return {
    file_name: fileName,
    file_path: filePath,
    record_count: list.length
  };
}

async function exportManualAdjustments(params = {}) {
  const { start_date, end_date, adjust_type } = params;

  let where = [];
  let values = [];

  if (adjust_type) {
    where.push('ma.adjust_type = ?');
    values.push(adjust_type);
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

  const list = await db.all(`
    SELECT
      ma.adjustment_no,
      mc.card_no,
      mc.plate_number,
      co.owner_no,
      co.name as owner_name,
      co.phone,
      ma.adjust_type,
      ma.adjust_days,
      ma.adjust_amount,
      ma.old_end_date,
      ma.new_end_date,
      ma.reason,
      ma.operator,
      ma.created_at
    FROM manual_adjustments ma
    JOIN monthly_cards mc ON ma.card_id = mc.id
    JOIN car_owners co ON ma.owner_id = co.id
    ${whereSql}
    ORDER BY ma.id DESC
  `, values);

  const fileName = `manual_adjustments_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'adjustment_no', title: '调整编号' },
      { id: 'card_no', title: '月卡编号' },
      { id: 'plate_number', title: '车牌号' },
      { id: 'owner_no', title: '车主编号' },
      { id: 'owner_name', title: '车主姓名' },
      { id: 'phone', title: '联系电话' },
      { id: 'adjust_type', title: '调整类型' },
      { id: 'adjust_days', title: '调整天数' },
      { id: 'adjust_amount', title: '调整金额(元)' },
      { id: 'old_end_date', title: '原到期日' },
      { id: 'new_end_date', title: '新到期日' },
      { id: 'reason', title: '调整原因' },
      { id: 'operator', title: '操作人' },
      { id: 'created_at', title: '创建时间' }
    ]
  });

  await csvWriter.writeRecords(list);
  return {
    file_name: fileName,
    file_path: filePath,
    record_count: list.length
  };
}

async function exportFeeTransactions(params = {}) {
  const { start_date, end_date, transaction_type, direction } = params;

  let where = [];
  let values = [];

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

  const list = await db.all(`
    SELECT
      ft.transaction_no,
      mc.card_no,
      mc.plate_number,
      co.owner_no,
      co.name as owner_name,
      ft.transaction_type,
      ft.amount,
      ft.direction,
      ft.related_type,
      ft.related_no,
      ft.remark,
      ft.operator,
      ft.created_at
    FROM fee_transactions ft
    JOIN monthly_cards mc ON ft.card_id = mc.id
    JOIN car_owners co ON ft.owner_id = co.id
    ${whereSql}
    ORDER BY ft.id DESC
  `, values);

  const fileName = `fee_transactions_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'transaction_no', title: '流水编号' },
      { id: 'card_no', title: '月卡编号' },
      { id: 'plate_number', title: '车牌号' },
      { id: 'owner_no', title: '车主编号' },
      { id: 'owner_name', title: '车主姓名' },
      { id: 'transaction_type', title: '交易类型' },
      { id: 'amount', title: '金额(元)' },
      { id: 'direction', title: '方向(in收入/out支出)' },
      { id: 'related_type', title: '关联类型' },
      { id: 'related_no', title: '关联编号' },
      { id: 'remark', title: '备注' },
      { id: 'operator', title: '操作人' },
      { id: 'created_at', title: '创建时间' }
    ]
  });

  await csvWriter.writeRecords(list);
  return {
    file_name: fileName,
    file_path: filePath,
    record_count: list.length
  };
}

module.exports = {
  exportExtensions,
  exportRefunds,
  exportPlateChanges,
  exportManualAdjustments,
  exportFeeTransactions
};
