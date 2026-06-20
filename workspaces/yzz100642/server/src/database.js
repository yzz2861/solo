const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

let db;

function ensureDataDir() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getDb() {
  if (!db) {
    ensureDataDir();
    const dbPath = path.join(__dirname, '..', 'data', 'commitments.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
      }
    });
    db.serialize();
  }
  return db;
}

function run(sql, params = []) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function serialize(callback) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      callback()
        .then(resolve)
        .catch(reject);
    });
  });
}

async function initDatabase() {
  const db = getDb();

  const exec = promisify(db.exec.bind(db));

  await exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      salesperson TEXT,
      source TEXT,
      raw_content TEXT NOT NULL,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME,
      message_type TEXT DEFAULT 'text',
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );

    CREATE TABLE IF NOT EXISTS commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_message_id INTEGER,
      opportunity_id INTEGER,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      original_sentence TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      confidence_reason TEXT,
      status TEXT DEFAULT 'pending',
      contract_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    );

    CREATE TABLE IF NOT EXISTS commitment_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commitment_id INTEGER,
      content TEXT NOT NULL,
      original_sentence TEXT,
      type TEXT,
      confidence REAL,
      confidence_reason TEXT,
      changed_by TEXT,
      change_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commitment_id) REFERENCES commitments(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commitment_id INTEGER,
      approver TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commitment_id) REFERENCES commitments(id)
    );
  `);

  console.log('Database initialized successfully');
}

module.exports = { getDb, initDatabase, run, all, get };
