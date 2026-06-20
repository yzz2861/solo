const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'lost_and_found.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    brand TEXT,
    color TEXT,
    features TEXT,
    location TEXT NOT NULL,
    found_time TEXT NOT NULL,
    photo TEXT,
    storage_location TEXT NOT NULL,
    locker_number TEXT NOT NULL,
    is_valuable INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    storage_period_days INTEGER DEFAULT 30,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    student_id TEXT,
    id_last_four TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    verification_level INTEGER DEFAULT 0,
    first_verifier TEXT,
    first_verify_time TEXT,
    second_verifier TEXT,
    second_verify_time TEXT,
    receiver_name TEXT,
    receiver_id_last_four TEXT,
    handler TEXT,
    return_time TEXT,
    reject_reason TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
  CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
  CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
`);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, name, role) VALUES (?, ?, ?)
`);
insertUser.run('admin1', '张保卫', 'admin');
insertUser.run('admin2', '李保安', 'admin');
insertUser.run('student1', '王同学', 'student');

module.exports = db;
