const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'customs.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_no TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_no TEXT NOT NULL,
    batch_id TEXT,
    sender_name TEXT,
    sender_id_no TEXT,
    receiver_name TEXT,
    receiver_id_no TEXT,
    category TEXT,
    item_name TEXT,
    declared_value REAL,
    weight REAL,
    origin_country TEXT,
    raw_csv TEXT,
    import_time TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_no, batch_id)
  );

  CREATE TABLE IF NOT EXISTS supplementary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_no TEXT NOT NULL,
    batch_id TEXT,
    id_proof_url TEXT,
    id_proof_type TEXT,
    id_verified INTEGER DEFAULT 0,
    item_category TEXT,
    item_quantity INTEGER,
    purchase_receipt_url TEXT,
    additional_info TEXT,
    import_time TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_no, batch_id)
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_no TEXT NOT NULL,
    batch_id TEXT,
    inspect_result TEXT,
    inspect_time TEXT,
    inspector TEXT,
    category_checked TEXT,
    category_match INTEGER,
    id_checked INTEGER,
    id_match INTEGER,
    value_checked REAL,
    value_match INTEGER,
    notes TEXT,
    import_time TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_no, batch_id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_no TEXT NOT NULL,
    reviewer TEXT,
    review_comment TEXT,
    review_status TEXT,
    review_time TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_declarations_pkg ON declarations(package_no);
  CREATE INDEX IF NOT EXISTS idx_supplementary_pkg ON supplementary(package_no);
  CREATE INDEX IF NOT EXISTS idx_inspections_pkg ON inspections(package_no);
  CREATE INDEX IF NOT EXISTS idx_reviews_pkg ON reviews(package_no);
  CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
`);

function upsertPackage(packageNo, status) {
  const existing = db.prepare('SELECT id FROM packages WHERE package_no = ?').get(packageNo);
  if (existing) {
    if (status) {
      db.prepare('UPDATE packages SET status = ?, updated_at = datetime(\'now\') WHERE package_no = ?')
        .run(status, packageNo);
    }
    return { id: existing.id, created: false };
  }
  const stmt = db.prepare('INSERT INTO packages (package_no, status) VALUES (?, ?)');
  const info = stmt.run(packageNo, status || 'pending');
  return { id: info.lastInsertRowid, created: true };
}

function updatePackageStatus(packageNo, status) {
  db.prepare('UPDATE packages SET status = ?, updated_at = datetime(\'now\') WHERE package_no = ?')
    .run(status, packageNo);
}

module.exports = { db, upsertPackage, updatePackageStatus };
