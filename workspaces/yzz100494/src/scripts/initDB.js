require('dotenv').config();
const { db } = require('../db');

const createTables = () => {
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      real_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'worker', 'storekeeper', 'admin')),
      phone TEXT,
      student_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      campus TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL,
      room_no TEXT NOT NULL,
      floor INTEGER,
      capacity INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(building_id, room_no),
      FOREIGN KEY (building_id) REFERENCES buildings(id)
    )`,
    `CREATE TABLE IF NOT EXISTS repair_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      unit TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      safety_stock INTEGER DEFAULT 5,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      building_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      repair_type_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' 
        CHECK(status IN ('pending', 'assigned', 'in_progress', 'completed', 'confirmed', 'cancelled', 'overdue')),
      worker_id INTEGER,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      expected_hours INTEGER DEFAULT 4,
      assigned_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      confirmed_at DATETIME,
      deadline DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (building_id) REFERENCES buildings(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (repair_type_id) REFERENCES repair_types(id),
      FOREIGN KEY (worker_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS material_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      returned_quantity INTEGER DEFAULT 0,
      returned_at DATETIME,
      status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'partial_returned', 'full_returned')),
      remark TEXT,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (worker_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS material_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      storekeeper_id INTEGER NOT NULL,
      returned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      FOREIGN KEY (issue_id) REFERENCES material_issues(id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (storekeeper_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS satisfactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS work_order_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      operator_id INTEGER,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )`
  ];

  db.serialize(() => {
    sqlStatements.forEach((sql) => {
      db.run(sql, (err) => {
        if (err) {
          console.error('建表失败:', err.message);
        } else {
          console.log('建表成功:', sql.split('(')[0].replace('CREATE TABLE IF NOT EXISTS ', '').trim());
        }
      });
    });

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_student ON work_orders(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_worker ON work_orders(worker_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_room ON work_orders(room_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON work_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_issues_order ON material_issues(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)'
    ];
    indexes.forEach((idx) => db.run(idx));

    console.log('\n数据库初始化完成！');
    db.close();
  });
};

createTables();
