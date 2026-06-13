const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'claim.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('adjuster', 'supervisor')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    accident_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL CHECK(doc_type IN ('medical', 'invoice', 'accident', 'photo', 'other')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    upload_by INTEGER NOT NULL,
    upload_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parse_status TEXT NOT NULL DEFAULT 'pending' CHECK(parse_status IN ('pending', 'processing', 'success', 'failed', 'unsupported')),
    parse_error TEXT,
    parsed_at DATETIME,
    page_count INTEGER DEFAULT 0,
    text_length INTEGER DEFAULT 0,
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (upload_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    page_no INTEGER,
    content TEXT,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER UNIQUE NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    has_manual_revision INTEGER DEFAULT 0,
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (generated_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS summary_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    source_ref TEXT,
    confidence REAL,
    is_manual INTEGER DEFAULT 0,
    FOREIGN KEY (summary_id) REFERENCES summaries(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    conflict_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
    resolved INTEGER DEFAULT 0,
    FOREIGN KEY (summary_id) REFERENCES summaries(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS missing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    reason TEXT,
    priority TEXT NOT NULL CHECK(priority IN ('required', 'optional')),
    FOREIGN KEY (summary_id) REFERENCES summaries(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS follow_up_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (summary_id) REFERENCES summaries(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    revised_by INTEGER NOT NULL,
    revised_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (summary_id) REFERENCES summaries(id),
    FOREIGN KEY (revised_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS supervisor_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_id INTEGER NOT NULL,
    supervisor_id INTEGER NOT NULL,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
    risk_notes TEXT,
    approved INTEGER DEFAULT 0,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (summary_id) REFERENCES summaries(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS export_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL,
    export_type TEXT NOT NULL CHECK(export_type IN ('customer', 'internal')),
    exported_by INTEGER NOT NULL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (exported_by) REFERENCES users(id)
  )`);

  const salt = bcrypt.genSaltSync(10);
  const adjusterPwd = bcrypt.hashSync('adjuster123', salt);
  const supervisorPwd = bcrypt.hashSync('supervisor123', salt);

  const stmt = db.prepare(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`);
  stmt.run('adjuster1', adjusterPwd, '张三', 'adjuster');
  stmt.run('adjuster2', adjusterPwd, '李四', 'adjuster');
  stmt.run('supervisor1', supervisorPwd, '王主管', 'supervisor');
  stmt.finalize();

  console.log('数据库初始化完成！');
  console.log('默认账号：');
  console.log('  理赔员: adjuster1 / adjuster123 (张三)');
  console.log('  理赔员: adjuster2 / adjuster123 (李四)');
  console.log('  主管:   supervisor1 / supervisor123 (王主管)');
});

db.close();
