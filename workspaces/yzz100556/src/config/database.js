const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/access_cards.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('receptionist', 'security', 'admin')),
      real_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      id_card TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      building TEXT NOT NULL,
      unit TEXT,
      owner_id INTEGER,
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    );

    CREATE TABLE IF NOT EXISTS access_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_number TEXT UNIQUE NOT NULL,
      owner_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'lost', 'disabled', 'replaced')),
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      lost_at DATETIME,
      disabled_at DATETIME,
      disabled_by INTEGER,
      notes TEXT,
      FOREIGN KEY (owner_id) REFERENCES owners(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (disabled_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS card_reissues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_card_id INTEGER NOT NULL,
      new_card_id INTEGER,
      room_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_stop' 
        CHECK(status IN ('pending_stop', 'stopped', 'new_card_issued', 'completed', 'cancelled', 'old_card_recovered')),
      reported_by INTEGER NOT NULL,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      stopped_by INTEGER,
      stopped_at DATETIME,
      new_issued_by INTEGER,
      new_issued_at DATETIME,
      completed_at DATETIME,
      deposit_amount DECIMAL(10,2) DEFAULT 0,
      deposit_status TEXT DEFAULT 'unpaid' CHECK(deposit_status IN ('unpaid', 'paid', 'refunded', 'no_refund')),
      deposit_paid_at DATETIME,
      deposit_refunded_at DATETIME,
      deposit_handler INTEGER,
      notes TEXT,
      warning_flags TEXT,
      FOREIGN KEY (old_card_id) REFERENCES access_cards(id),
      FOREIGN KEY (new_card_id) REFERENCES access_cards(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (owner_id) REFERENCES owners(id),
      FOREIGN KEY (reported_by) REFERENCES users(id),
      FOREIGN KEY (stopped_by) REFERENCES users(id),
      FOREIGN KEY (new_issued_by) REFERENCES users(id),
      FOREIGN KEY (deposit_handler) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS deposit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reissue_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('collect', 'refund')),
      amount DECIMAL(10,2) NOT NULL,
      handler INTEGER NOT NULL,
      handled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (reissue_id) REFERENCES card_reissues(id),
      FOREIGN KEY (handler) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cards_status ON access_cards(status);
    CREATE INDEX IF NOT EXISTS idx_cards_room ON access_cards(room_id);
    CREATE INDEX IF NOT EXISTS idx_reissues_status ON card_reissues(status);
    CREATE INDEX IF NOT EXISTS idx_reissues_room ON card_reissues(room_id);
    CREATE INDEX IF NOT EXISTS idx_reissues_date ON card_reissues(reported_at);
    CREATE INDEX IF NOT EXISTS idx_deposit_reissue ON deposit_records(reissue_id);
  `);
}

initDatabase();

module.exports = db;
