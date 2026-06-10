const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'review.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id TEXT UNIQUE NOT NULL,
      title TEXT,
      content TEXT,
      channel TEXT,
      submit_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rule_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      hit_detail TEXT,
      hit_time TEXT,
      import_batch TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(material_id, rule_type, rule_name)
    );

    CREATE TABLE IF NOT EXISTS channel_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id TEXT NOT NULL,
      channel TEXT,
      status TEXT NOT NULL,
      reject_reason TEXT,
      feedback_time TEXT,
      import_batch TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(material_id, channel, import_batch)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id TEXT NOT NULL,
      reviewer TEXT,
      review_status TEXT DEFAULT 'pending',
      review_opinion TEXT,
      previous_opinion TEXT,
      review_time TEXT DEFAULT CURRENT_TIMESTAMP,
      is_overridden INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_type TEXT NOT NULL,
      file_name TEXT,
      import_time TEXT DEFAULT CURRENT_TIMESTAMP,
      record_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS banned_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT UNIQUE NOT NULL,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_materials_material_id ON materials(material_id);
    CREATE INDEX IF NOT EXISTS idx_rule_hits_material_id ON rule_hits(material_id);
    CREATE INDEX IF NOT EXISTS idx_channel_feedbacks_material_id ON channel_feedbacks(material_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_material_id ON reviews(material_id);
  `);

  const stmt = db.prepare('SELECT COUNT(*) as count FROM banned_words');
  const result = stmt.get();
  if (result.count === 0) {
    const defaultWords = [
      { word: '最', category: '绝对化用语' },
      { word: '第一', category: '绝对化用语' },
      { word: '国家级', category: '绝对化用语' },
      { word: '最高级', category: '绝对化用语' },
      { word: '最佳', category: '绝对化用语' },
      { word: '唯一', category: '绝对化用语' },
      { word: '特效', category: '虚假宣传' },
      { word: '无效退款', category: '虚假宣传' },
      { word: '根治', category: '虚假宣传' },
      { word: '100%', category: '虚假宣传' },
    ];
    const insert = db.prepare('INSERT INTO banned_words (word, category) VALUES (?, ?)');
    const transaction = db.transaction((words) => {
      for (const w of words) {
        insert.run(w.word, w.category);
      }
    });
    transaction(defaultWords);
  }
}

initDB();

module.exports = db;
