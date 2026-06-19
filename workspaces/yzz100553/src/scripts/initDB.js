const bcrypt = require('bcryptjs');
const db = require('../config/database');

const createTables = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      phone TEXT,
      email TEXT,
      violation_count INTEGER DEFAULT 0,
      blacklisted_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      location TEXT,
      equipment TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      group_size INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'reserved',
      checked_in_at DATETIME,
      check_in_deadline DATETIME NOT NULL,
      purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reservation_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS release_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      released_by INTEGER,
      release_type TEXT NOT NULL,
      reason TEXT,
      remark TEXT,
      released_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id),
      FOREIGN KEY (released_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_room_time ON reservations(room_id, start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);
  `);

  console.log('数据库表创建完成');
};

const seedData = async () => {
  const row = await db.get('SELECT COUNT(*) as count FROM users');
  if (row.count > 0) {
    console.log('已有数据，跳过种子数据插入');
    return;
  }

  const hashedPassword = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare
    ? db.prepare('INSERT INTO users (username, password, name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?)')
    : null;

  const insert = async (...args) => {
    if (insertUser) {
      return insertUser.run(...args);
    }
    return db.run('INSERT INTO users (username, password, name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?)', ...args);
  };

  await insert('librarian', hashedPassword, '张馆员', 'librarian', '13800138000', 'lib@library.edu');
  await insert('student1', hashedPassword, '李小明', 'student', '13900139001', 'stu1@library.edu');
  await insert('student2', hashedPassword, '王小红', 'student', '13900139002', 'stu2@library.edu');
  await insert('student3', hashedPassword, '赵小刚', 'student', '13900139003', 'stu3@library.edu');

  console.log('测试用户已创建（密码均为 123456）：');
  console.log('  - 馆员: librarian / 123456');
  console.log('  - 学生: student1 / 123456');
  console.log('  - 学生: student2 / 123456');
  console.log('  - 学生: student3 / 123456');

  const insertRoom = async (...args) => {
    return db.run('INSERT INTO rooms (name, capacity, location, equipment) VALUES (?, ?, ?, ?)', ...args);
  };

  await insertRoom('研修间A101', 6, '一楼东侧', '白板、投影仪、电视');
  await insertRoom('研修间A102', 4, '一楼东侧', '白板、电视');
  await insertRoom('研修间B201', 8, '二楼北侧', '白板、投影仪、视频会议设备');
  await insertRoom('研修间B202', 4, '二楼北侧', '白板');
  await insertRoom('研修间C301', 12, '三楼南侧', '白板、投影仪、电视、音响');

  console.log('5 个测试研修间已创建');
};

const init = async () => {
  console.log('开始初始化数据库...');
  await createTables();
  await seedData();
  console.log('数据库初始化完成！');
  process.exit(0);
};

init().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
