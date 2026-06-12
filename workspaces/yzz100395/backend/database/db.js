const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sample.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS schools (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          address TEXT,
          contact TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS dishes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          category TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS storage_slots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fridge_number INTEGER NOT NULL,
          slot_number INTEGER NOT NULL,
          status TEXT DEFAULT 'available',
          occupied_by INTEGER,
          occupied_at TEXT,
          FOREIGN KEY (occupied_by) REFERENCES sample_records(id),
          UNIQUE(fridge_number, slot_number)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sample_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          school_id INTEGER NOT NULL,
          dish_id INTEGER NOT NULL,
          batch_number TEXT NOT NULL,
          sample_date TEXT NOT NULL,
          sample_time TEXT NOT NULL,
          weight REAL NOT NULL,
          fridge_number INTEGER NOT NULL,
          slot_number INTEGER NOT NULL,
          responsible_person TEXT NOT NULL,
          photo_path TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (school_id) REFERENCES schools(id),
          FOREIGN KEY (dish_id) REFERENCES dishes(id),
          UNIQUE(batch_number)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS inspection_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_id INTEGER NOT NULL,
          inspection_date TEXT,
          inspector TEXT,
          result TEXT,
          result_date TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES sample_records(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS destruction_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_id INTEGER NOT NULL,
          destruction_date TEXT,
          destroyer TEXT,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES sample_records(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS anomaly_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_id INTEGER NOT NULL,
          anomaly_type TEXT NOT NULL,
          description TEXT,
          handler TEXT,
          handle_date TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES sample_records(id)
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO schools (name, address, contact) VALUES 
        ('第一中学', '文化路100号', '张主任 13800138001'),
        ('第二小学', '幸福路200号', '李老师 13800138002'),
        ('第三幼儿园', '阳光街300号', '王园长 13800138003')
      `);

      db.run(`
        INSERT OR IGNORE INTO dishes (name, category) VALUES 
        ('红烧肉', '荤菜'),
        ('炒青菜', '素菜'),
        ('番茄炒蛋', '荤素'),
        ('清蒸鱼', '荤菜'),
        ('土豆丝', '素菜'),
        ('冬瓜汤', '汤类')
      `);

      for (let fridge = 1; fridge <= 3; fridge++) {
        for (let slot = 1; slot <= 20; slot++) {
          db.run(`INSERT OR IGNORE INTO storage_slots (fridge_number, slot_number) VALUES (?, ?)`, [fridge, slot]);
        }
      }

      console.log('Database initialized');
      resolve();
    });
  });
};

module.exports = { db, initDatabase };