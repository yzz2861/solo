const { getDb, closeDb } = require('../config/database');

function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      manager_employee_id TEXT,
      assistant_employee_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department_id INTEGER,
      email TEXT,
      phone TEXT,
      position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT NOT NULL UNIQUE,
      course_name TEXT NOT NULL,
      pass_score INTEGER NOT NULL DEFAULT 60,
      max_retake_count INTEGER NOT NULL DEFAULT 2,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS original_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      is_passed INTEGER NOT NULL DEFAULT 0,
      exam_date DATE NOT NULL,
      exam_batch TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(employee_id, course_id, exam_date)
    );

    CREATE TABLE IF NOT EXISTS retake_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_code TEXT NOT NULL UNIQUE,
      course_id INTEGER NOT NULL,
      batch_name TEXT NOT NULL,
      exam_date DATE,
      registration_start DATE,
      registration_end DATE,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS retake_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_no TEXT NOT NULL UNIQUE,
      employee_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      original_score_id INTEGER NOT NULL,
      retake_batch_id INTEGER NOT NULL,
      original_score INTEGER NOT NULL,
      registration_status TEXT NOT NULL DEFAULT 'pending',
      final_score INTEGER,
      final_is_passed INTEGER,
      retake_attempt_no INTEGER NOT NULL DEFAULT 1,
      need_offline_communication INTEGER DEFAULT 0,
      offline_communication_note TEXT,
      notified_to_assistant INTEGER DEFAULT 0,
      last_notified_at DATETIME,
      approved_by TEXT,
      approved_at DATETIME,
      rejected_by TEXT,
      rejected_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (original_score_id) REFERENCES original_scores(id),
      FOREIGN KEY (retake_batch_id) REFERENCES retake_batches(id),
      UNIQUE(employee_id, course_id, retake_batch_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reg_employee_course ON retake_registrations(employee_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_reg_status ON retake_registrations(registration_status);
    CREATE INDEX IF NOT EXISTS idx_reg_batch ON retake_registrations(retake_batch_id);
    CREATE INDEX IF NOT EXISTS idx_scores_employee_course ON original_scores(employee_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_emp_department ON employees(department_id);
  `);

  console.log('数据库表结构初始化完成');
}

function seedTestData() {
  const db = getDb();

  const deptCount = db.prepare('SELECT COUNT(*) as cnt FROM departments').get().cnt;
  if (deptCount > 0) {
    console.log('测试数据已存在，跳过初始化');
    return;
  }

  const insertDept = db.prepare(
    'INSERT INTO departments (name, manager_employee_id, assistant_employee_id) VALUES (?, ?, ?)'
  );
  insertDept.run('技术研发部', 'M001', 'A001');
  insertDept.run('市场销售部', 'M002', 'A002');
  insertDept.run('人力资源部', 'M003', 'A003');
  insertDept.run('财务部', 'M004', 'A004');
  console.log('部门数据初始化完成');

  const insertEmp = db.prepare(
    'INSERT INTO employees (employee_id, name, department_id, email, phone, position) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const employees = [
    ['M001', '张三', 1, 'zhangsan@company.com', '13800000001', '研发总监'],
    ['A001', '李四', 1, 'lisi@company.com', '13800000002', '研发部助理'],
    ['E001', '王五', 1, 'wangwu@company.com', '13800000003', '高级工程师'],
    ['E002', '赵六', 1, 'zhaoliu@company.com', '13800000004', '工程师'],
    ['E003', '孙七', 1, 'sunqi@company.com', '13800000005', '工程师'],
    ['M002', '周八', 2, 'zhouba@company.com', '13800000006', '市场总监'],
    ['A002', '吴九', 2, 'wujiu@company.com', '13800000007', '市场部助理'],
    ['E004', '郑十', 2, 'zhengshi@company.com', '13800000008', '销售经理'],
    ['E005', '冯十一', 2, 'fengshiyi@company.com', '13800000009', '销售代表'],
    ['M003', '陈十二', 3, 'chenshier@company.com', '13800000010', 'HR总监'],
    ['A003', '褚十三', 3, 'chushisan@company.com', '13800000011', 'HR专员'],
    ['HR001', '卫十四', 3, 'weishisi@company.com', '13800000012', 'HR专员'],
    ['M004', '蒋十五', 4, 'jiangshiwu@company.com', '13800000013', '财务总监'],
    ['A004', '沈十六', 4, 'shenshiliu@company.com', '13800000014', '财务助理'],
    ['E006', '韩十七', 4, 'hanshiqi@company.com', '13800000015', '会计'],
  ];
  employees.forEach(e => insertEmp.run(...e));
  console.log('员工数据初始化完成');

  const insertCourse = db.prepare(
    'INSERT INTO courses (course_code, course_name, pass_score, max_retake_count, description) VALUES (?, ?, ?, ?, ?)'
  );
  const courses = [
    ['C001', '网络安全合规培训', 80, 2, '全员必修的网络安全合规课程'],
    ['C002', '数据隐私保护培训', 75, 2, '涉及客户数据处理岗位必修'],
    ['C003', '反商业贿赂培训', 70, 3, '全员每年必修合规课程'],
    ['C004', '信息安全等级保护', 80, 2, '技术岗位必修课程'],
  ];
  courses.forEach(c => insertCourse.run(...c));
  console.log('课程数据初始化完成');

  const insertBatch = db.prepare(
    'INSERT INTO retake_batches (batch_code, course_id, batch_name, exam_date, registration_start, registration_end, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const batches = [
    ['B202606_C001', 1, '2026年6月C001补考第一批', '2026-06-25', '2026-06-15', '2026-06-23', 'open'],
    ['B202606_C002', 2, '2026年6月C002补考第一批', '2026-06-26', '2026-06-15', '2026-06-24', 'open'],
    ['B202606_C003', 3, '2026年6月C003补考第一批', '2026-06-27', '2026-06-15', '2026-06-25', 'open'],
    ['B202607_C001', 1, '2026年7月C001补考第二批', '2026-07-10', '2026-07-01', '2026-07-08', 'open'],
  ];
  batches.forEach(b => insertBatch.run(...b));
  console.log('补考批次数据初始化完成');

  const insertScore = db.prepare(
    'INSERT INTO original_scores (employee_id, course_id, score, is_passed, exam_date, exam_batch, remark) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const scores = [
    [3, 1, 72, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [4, 1, 58, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [5, 1, 65, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [3, 2, 80, 1, '2026-06-10', '2026-Q2-01', '已通过'],
    [4, 2, 60, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [8, 3, 55, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [9, 3, 68, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [15, 3, 72, 1, '2026-06-10', '2026-Q2-01', '已通过'],
    [3, 4, 85, 1, '2026-06-10', '2026-Q2-01', '已通过'],
    [5, 4, 70, 0, '2026-06-10', '2026-Q2-01', '未通过'],
    [8, 1, 90, 1, '2026-06-10', '2026-Q2-01', '已通过'],
  ];
  scores.forEach(s => insertScore.run(...s));
  console.log('原始成绩数据初始化完成');

  console.log('\n测试数据初始化全部完成！');
}

if (require.main === module) {
  try {
    initDatabase();
    seedTestData();
    console.log('\n数据库初始化成功！');
    closeDb();
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
}

module.exports = { initDatabase, seedTestData };
