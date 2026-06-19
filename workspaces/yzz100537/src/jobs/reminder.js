const { getDB } = require('../db');
const { generateId } = require('../utils/response');
const { isOverdue, daysUntilExpiry, isInsuranceExpiring, isInsuranceSufficient } = require('../utils/insurance');
const config = require('../config');

function checkOverdueBorrows() {
  const db = getDB();

  const overdueRecords = db.prepare(`
    SELECT br.*, s.name as sample_name, p.name as project_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.status = 'out'
      AND date(br.planned_return_date) < date('now')
  `).all();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO reminders (id, type, related_id, message)
    VALUES (@id, @type, @related_id, @message)
  `);

  const results = [];
  const transaction = db.transaction(() => {
    for (const record of overdueRecords) {
      const id = generateId('R');
      const daysLate = Math.abs(daysUntilExpiry(record.planned_return_date) || 0);
      const message = `样品【${record.sample_name}】已逾期 ${daysLate} 天未归还，借用人：${record.borrower_name}，项目：${record.project_name}`;

      const existing = db.prepare(`
        SELECT id FROM reminders
        WHERE type = 'overdue' AND related_id = ? AND is_read = 0
      `).get(record.id);

      if (!existing) {
        insertStmt.run({ id, type: 'overdue', related_id: record.id, message });
        results.push({ borrow_id: record.id, message });
      }
    }
  });
  transaction();

  console.log(`[逾期提醒] 生成 ${results.length} 条逾期提醒`);
  return results;
}

function checkExpiringInsurance() {
  const db = getDB();

  const expiringSamples = db.prepare(`
    SELECT * FROM samples
    WHERE insurance_expiry_date IS NOT NULL
      AND date(insurance_expiry_date) >= date('now')
      AND date(insurance_expiry_date) <= date('now', '+' || ? || ' days')
  `).all(config.insurance.expiryWarningDays);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO reminders (id, type, related_id, message)
    VALUES (@id, @type, @related_id, @message)
  `);

  const results = [];
  const transaction = db.transaction(() => {
    for (const sample of expiringSamples) {
      const id = generateId('R');
      const days = daysUntilExpiry(sample.insurance_expiry_date);
      const message = `样品【${sample.name}】保险将于 ${days} 天后到期（${sample.insurance_expiry_date}），请及时续保`;

      const existing = db.prepare(`
        SELECT id FROM reminders
        WHERE type = 'insurance_expiry' AND related_id = ? AND is_read = 0
      `).get(sample.id);

      if (!existing) {
        insertStmt.run({ id, type: 'insurance_expiry', related_id: sample.id, message });
        results.push({ sample_id: sample.id, message });
      }
    }
  });
  transaction();

  console.log(`[保险到期提醒] 生成 ${results.length} 条保险到期提醒`);
  return results;
}

function checkInsufficientInsurance() {
  const db = getDB();

  const samples = db.prepare(`
    SELECT * FROM samples
    WHERE insurance_amount < value * ?
  `).all(config.insurance.minInsuranceRatio);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO reminders (id, type, related_id, message)
    VALUES (@id, @type, @related_id, @message)
  `);

  const results = [];
  const transaction = db.transaction(() => {
    for (const sample of samples) {
      const id = generateId('R');
      const shortfall = (sample.value - sample.insurance_amount).toFixed(2);
      const message = `样品【${sample.name}】保险额度不足，价值${sample.value}元，保险仅${sample.insurance_amount}元，差额${shortfall}元`;

      const existing = db.prepare(`
        SELECT id FROM reminders
        WHERE type = 'insurance_insufficient' AND related_id = ? AND is_read = 0
      `).get(sample.id);

      if (!existing) {
        insertStmt.run({ id, type: 'insurance_insufficient', related_id: sample.id, message });
        results.push({ sample_id: sample.id, message });
      }
    }
  });
  transaction();

  console.log(`[保险不足提醒] 生成 ${results.length} 条保险不足提醒`);
  return results;
}

function runAllChecks() {
  console.log('='.repeat(50));
  console.log(`[提醒任务] 开始执行 - ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));

  const overdue = checkOverdueBorrows();
  const expiring = checkExpiringInsurance();
  const insufficient = checkInsufficientInsurance();

  console.log('='.repeat(50));
  console.log(`[提醒任务] 执行完成`);
  console.log(`  逾期提醒: ${overdue.length} 条`);
  console.log(`  保险到期: ${expiring.length} 条`);
  console.log(`  保险不足: ${insufficient.length} 条`);
  console.log('='.repeat(50));

  return { overdue, expiring, insufficient };
}

if (require.main === module) {
  const { initDB } = require('../db');
  initDB();
  runAllChecks();
}

module.exports = {
  checkOverdueBorrows,
  checkExpiringInsurance,
  checkInsufficientInsurance,
  runAllChecks
};
