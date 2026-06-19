const assert = require('assert');
const { initDB, getDB } = require('../src/db');
const { generateId } = require('../src/utils/response');
const { isInsuranceSufficient, isOverdue } = require('../src/utils/insurance');
const { checkOverdueBorrows, checkExpiringInsurance, runAllChecks } = require('../src/jobs/reminder');

let db;
let testSampleId, testProjectId, testBorrowId;

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  影棚样品保险借用 API - 集成测试');
  console.log('='.repeat(60) + '\n');

  try {
    await test01_initDB();
    await test02_sampleCRUD();
    await test03_projectCRUD();
    await test04_borrowFlow();
    await test05_businessRules();
    await test06_queries();
    await test07_reminders();

    console.log('\n' + '='.repeat(60));
    console.log('  ✅ 所有测试通过!');
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

function test01_initDB() {
  log('🗄️', '测试数据库初始化...');
  initDB();
  db = getDB();
  assert(db, '数据库实例应存在');

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  assert(tableNames.includes('samples'), '应包含 samples 表');
  assert(tableNames.includes('borrow_records'), '应包含 borrow_records 表');
  assert(tableNames.includes('projects'), '应包含 projects 表');
  assert(tableNames.includes('photos'), '应包含 photos 表');
  assert(tableNames.includes('liability_confirmations'), '应包含 liability_confirmations 表');
  assert(tableNames.includes('reminders'), '应包含 reminders 表');

  log('✅', '数据库初始化成功');
}

function test02_sampleCRUD() {
  log('💎', '测试样品管理...');

  const id = generateId('S');
  db.prepare(`
    INSERT INTO samples (id, name, category, brand, description, value, insurance_amount, insurance_expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, '测试钻石项链', 'jewelry', 'Cartier', '18K金镶钻项链', 88000, 100000, '2027-12-31');

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(id);
  assert.strictEqual(sample.name, '测试钻石项链');
  assert.strictEqual(sample.category, 'jewelry');
  assert.strictEqual(sample.value, 88000);
  assert.strictEqual(sample.insurance_amount, 100000);
  assert.strictEqual(sample.status, 'in_stock');

  assert(isInsuranceSufficient(sample.value, sample.insurance_amount), '保险应充足');

  db.prepare('UPDATE samples SET insurance_amount = 50000 WHERE id = ?').run(id);
  const updated = db.prepare('SELECT * FROM samples WHERE id = ?').get(id);
  assert.strictEqual(updated.insurance_amount, 50000);
  assert(!isInsuranceSufficient(updated.value, updated.insurance_amount), '保险应不足');

  db.prepare('UPDATE samples SET insurance_amount = 100000 WHERE id = ?').run(id);

  testSampleId = id;
  log('✅', '样品管理测试通过');
}

function test03_projectCRUD() {
  log('📋', '测试项目管理...');

  const id = generateId('PRJ');
  db.prepare(`
    INSERT INTO projects (id, name, client, shoot_date, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, '春季珠宝大片', '周大福', '2026-07-15', 'active');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  assert.strictEqual(project.name, '春季珠宝大片');
  assert.strictEqual(project.client, '周大福');

  testProjectId = id;
  log('✅', '项目管理测试通过');
}

function test04_borrowFlow() {
  log('📦', '测试完整借用流程...');

  const id = generateId('B');
  db.prepare(`
    INSERT INTO borrow_records
    (id, sample_id, project_id, borrower_name, borrower_role, borrower_contact,
     planned_out_date, planned_return_date, status)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, testSampleId, testProjectId, '张摄影师', 'photographer', '13800138000',
        '2026-07-10', '2026-07-20');

  let borrow = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
  assert.strictEqual(borrow.status, 'pending');
  assert.strictEqual(borrow.borrower_name, '张摄影师');

  const confId = generateId('C');
  db.prepare(`
    INSERT INTO liability_confirmations (id, borrow_record_id, confirmer_name, confirmer_role)
    VALUES (?, ?, ?, ?)
  `).run(confId, id, '张摄影师', 'photographer');

  const conf = db.prepare('SELECT * FROM liability_confirmations WHERE id = ?').get(confId);
  assert.strictEqual(conf.confirmer_name, '张摄影师');
  assert.strictEqual(conf.confirmer_role, 'photographer');

  db.prepare(`
    UPDATE borrow_records
    SET status = 'out', actual_out_date = datetime('now'), out_verified_by = '李制片'
    WHERE id = ?
  `).run(id);

  db.prepare("UPDATE samples SET status = 'out_of_stock' WHERE id = ?").run(testSampleId);

  borrow = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(testSampleId);
  assert.strictEqual(borrow.status, 'out');
  assert.strictEqual(sample.status, 'out_of_stock');

  db.prepare(`
    UPDATE borrow_records
    SET status = 'returned', actual_return_date = datetime('now'),
        return_verified_by = '李制片', has_defect = 0
    WHERE id = ?
  `).run(id);

  db.prepare("UPDATE samples SET status = 'in_stock' WHERE id = ?").run(testSampleId);

  borrow = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
  assert.strictEqual(borrow.status, 'returned');

  testBorrowId = id;
  log('✅', '借用流程测试通过');
}

function test05_businessRules() {
  log('⚖️', '测试业务规则校验...');

  const lowInsuranceId = generateId('S');
  db.prepare(`
    INSERT INTO samples (id, name, category, value, insurance_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(lowInsuranceId, '保险不足测试样品', 'watch', 50000, 30000);

  const lowSample = db.prepare('SELECT * FROM samples WHERE id = ?').get(lowInsuranceId);
  assert(!isInsuranceSufficient(lowSample.value, lowSample.insurance_amount),
    '价值5万保险3万应判定为保险不足');

  const project2Id = generateId('PRJ');
  db.prepare("INSERT INTO projects (id, name, status) VALUES (?, ?, 'active')")
    .run(project2Id, '冲突测试项目');

  const conflictBorrowId = generateId('B');
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records
    WHERE sample_id = ?
      AND status IN ('pending', 'out')
      AND NOT (
        date(planned_return_date) < date(?)
        OR date(planned_out_date) > date(?)
      )
  `).get(testSampleId, '2026-07-12', '2026-07-18');

  assert.strictEqual(result.count, 0, '已归还的样品不应判定为冲突');

  const activeBorrowId = generateId('B');
  db.prepare(`
    INSERT INTO borrow_records
    (id, sample_id, project_id, borrower_name, borrower_role,
     planned_out_date, planned_return_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'out')
  `).run(activeBorrowId, testSampleId, testProjectId, '王造型师', 'stylist',
        '2026-07-15', '2026-07-25');

  const conflictResult = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records
    WHERE sample_id = ?
      AND status IN ('pending', 'out')
      AND NOT (
        date(planned_return_date) < date(?)
        OR date(planned_out_date) > date(?)
      )
  `).get(testSampleId, '2026-07-20', '2026-07-30');

  assert.strictEqual(conflictResult.count, 1, '时间重叠应判定为冲突');

  const defectId = generateId('B');
  db.prepare(`
    INSERT INTO borrow_records
    (id, sample_id, project_id, borrower_name, borrower_role,
     planned_out_date, planned_return_date, status, has_defect, defect_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'defect', 1, '表面轻微划痕')
  `).run(defectId, testSampleId, testProjectId, '测试瑕疵', 'client',
        '2026-06-01', '2026-06-10');

  const defectRecord = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(defectId);
  assert.strictEqual(defectRecord.status, 'defect');
  assert.strictEqual(defectRecord.has_defect, 1);
  assert.strictEqual(defectRecord.defect_description, '表面轻微划痕');

  log('✅', '业务规则测试通过');
}

function test06_queries() {
  log('🔍', '测试查询功能...');

  const outCount = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records WHERE status = 'out'
  `).get().count;
  assert(outCount >= 1, '应有至少1条在外记录');

  const projectSamples = db.prepare(`
    SELECT DISTINCT s.id
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    WHERE br.project_id = ?
  `).all(testProjectId);
  assert(projectSamples.length >= 1, '项目应有关联样品');

  const chain = db.prepare(`
    SELECT br.*, p.name as project_name,
           (SELECT COUNT(*) FROM liability_confirmations lc WHERE lc.borrow_record_id = br.id) as conf_count
    FROM borrow_records br
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.sample_id = ?
    ORDER BY br.created_at DESC
  `).all(testSampleId);
  assert(chain.length >= 1, '样品应有借用历史');

  log('✅', '查询功能测试通过');
}

function test07_reminders() {
  log('⏰', '测试提醒功能...');

  const overdueSampleId = generateId('S');
  db.prepare(`
    INSERT INTO samples (id, name, category, value, insurance_amount, status)
    VALUES (?, ?, ?, ?, ?, 'out_of_stock')
  `).run(overdueSampleId, '逾期测试样品', 'bag', 30000, 35000);

  const overdueBorrowId = generateId('B');
  db.prepare(`
    INSERT INTO borrow_records
    (id, sample_id, project_id, borrower_name, borrower_role,
     planned_out_date, planned_return_date, status, actual_out_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'out', datetime('now', '-30 days'))
  `).run(overdueBorrowId, overdueSampleId, testProjectId, '逾期测试人', 'client',
        '2026-05-01', '2026-06-01');

  const overdueRecord = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(overdueBorrowId);
  assert(isOverdue(overdueRecord.planned_return_date), '应判定为逾期');

  const expiringSampleId = generateId('S');
  db.prepare(`
    INSERT INTO samples (id, name, category, value, insurance_amount, insurance_expiry_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(expiringSampleId, '即将到期保险样品', 'jewelry', 10000, 15000, '2026-07-25');

  const expiringCount = db.prepare(`
    SELECT COUNT(*) as count FROM samples
    WHERE insurance_expiry_date IS NOT NULL
      AND date(insurance_expiry_date) >= date('now')
      AND date(insurance_expiry_date) <= date('now', '+30 days')
  `).get().count;
  assert(expiringCount >= 1, '应有即将到期的保险');

  const results = runAllChecks();
  assert(results.overdue.length >= 1, '应生成逾期提醒');
  assert(results.expiring.length >= 1, '应生成保险到期提醒');
  assert(results.insufficient.length >= 1, '应生成保险不足提醒');

  const reminders = db.prepare('SELECT * FROM reminders').all();
  assert(reminders.length >= 3, '提醒表中应有数据');

  log('✅', '提醒功能测试通过');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
