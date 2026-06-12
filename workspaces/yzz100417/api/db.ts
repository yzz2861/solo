import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '..', 'data', 'inventory.db');

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'nurse', 'doctor', 'warehouse')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  treatment_plan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachment_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('template', 'material', 'aligner_batch')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  clinic_room TEXT NOT NULL,
  shelf TEXT NOT NULL,
  slot TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  model_id TEXT NOT NULL REFERENCES attachment_models(id),
  batch_no TEXT NOT NULL,
  location_id TEXT REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'bound', 'recalled', 'expired')),
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_attachments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  attachment_id TEXT NOT NULL REFERENCES attachments(id),
  aligner_batch TEXT NOT NULL,
  follow_up_date TEXT NOT NULL,
  clinic_room TEXT NOT NULL,
  missing_reason TEXT,
  is_prepared INTEGER NOT NULL DEFAULT 0,
  bound_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(attachment_id)
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  attachment_id TEXT NOT NULL REFERENCES attachments(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  operator_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follow_up_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  attachment_id TEXT NOT NULL REFERENCES attachments(id),
  visit_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(status);
CREATE INDEX IF NOT EXISTS idx_attachments_batch ON attachments(batch_no);
CREATE INDEX IF NOT EXISTS idx_attachments_expiry ON attachments(expiry_date);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient ON patient_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_follow_up ON patient_attachments(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_clinic_room ON patient_attachments(clinic_room);
CREATE INDEX IF NOT EXISTS idx_patient_attachments_prepared ON patient_attachments(is_prepared);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created ON inventory_adjustments(created_at);
`;

const SEED_SQL = `
INSERT OR IGNORE INTO users (id, username, role) VALUES ('u_admin', 'admin', 'admin');
INSERT OR IGNORE INTO users (id, username, role) VALUES ('u_nurse1', '护士小王', 'nurse');
INSERT OR IGNORE INTO users (id, username, role) VALUES ('u_doctor1', '张医生', 'doctor');
INSERT OR IGNORE INTO users (id, username, role) VALUES ('u_wh1', '库管老李', 'warehouse');

INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_001', '附件模板 A1', 'template');
INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_002', '附件模板 A2', 'template');
INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_003', '附件材料 M1', 'material');
INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_004', '附件材料 M2', 'material');
INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_005', '牙套批次 B1', 'aligner_batch');
INSERT OR IGNORE INTO attachment_models (id, name, type) VALUES ('am_006', '牙套批次 B2', 'aligner_batch');

INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_001', 'A诊室', '1号架', 'A1');
INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_002', 'A诊室', '1号架', 'A2');
INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_003', 'A诊室', '2号架', 'B1');
INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_004', 'B诊室', '1号架', 'A1');
INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_005', 'B诊室', '1号架', 'A2');
INSERT OR IGNORE INTO locations (id, clinic_room, shelf, slot) VALUES ('loc_006', 'C诊室', '1号架', 'A1');

INSERT OR IGNORE INTO patients (id, name, phone, treatment_plan) VALUES ('p_001', '李明', '13800001111', '隐适美全口矫正');
INSERT OR IGNORE INTO patients (id, name, phone, treatment_plan) VALUES ('p_002', '王芳', '13800002222', '传统金属托槽');
INSERT OR IGNORE INTO patients (id, name, phone, treatment_plan) VALUES ('p_003', '张伟', '13800003333', '隐形矫正二期');
INSERT OR IGNORE INTO patients (id, name, phone, treatment_plan) VALUES ('p_004', '刘洋', '13800004444', '自锁托槽矫正');
INSERT OR IGNORE INTO patients (id, name, phone, treatment_plan) VALUES ('p_005', '陈静', '13800005555', '隐形保持器阶段');

INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_001', 'ATT00001', 'am_001', 'BT20260101', 'loc_001', 'available', '2027-01-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_002', 'ATT00002', 'am_002', 'BT20260101', 'loc_002', 'available', '2027-01-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_003', 'ATT00003', 'am_003', 'BM20260201', 'loc_001', 'available', '2026-08-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_004', 'ATT00004', 'am_004', 'BM20260201', 'loc_003', 'available', '2026-12-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_005', 'ATT00005', 'am_005', 'BY20260301', 'loc_004', 'available', '2027-03-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_006', 'ATT00006', 'am_006', 'BY20260302', 'loc_005', 'available', '2027-03-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_007', 'ATT00007', 'am_001', 'BT20260102', 'loc_001', 'available', '2026-07-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_008', 'ATT00008', 'am_003', 'BM20260202', 'loc_002', 'available', '2026-06-20');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_009', 'ATT00009', 'am_002', 'BT20260103', 'loc_006', 'available', '2027-06-01');
INSERT OR IGNORE INTO attachments (id, code, model_id, batch_no, location_id, status, expiry_date) VALUES ('a_010', 'ATT00010', 'am_005', 'BY20260303', 'loc_004', 'available', '2027-06-01');
`;

function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadExistingDB(): Buffer | undefined {
  if (fs.existsSync(DB_FILE)) {
    return fs.readFileSync(DB_FILE);
  }
  return undefined;
}

export async function saveDB(): Promise<void> {
  if (!db || !SQL) return;
  ensureDataDir();
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

export async function getDB(): Promise<Database> {
  if (db && SQL) return db;
  ensureDataDir();
  SQL = await initSqlJs();
  const existing = loadExistingDB();
  db = existing ? new SQL.Database(existing) : new SQL.Database();
  db.run(SCHEMA_SQL);
  if (!existing) {
    db.run(SEED_SQL);
    await saveDB();
  }
  return db;
}

export function getRows<T>(stmt: any): T[] {
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function getOne<T>(stmt: any): T | null {
  const rows = getRows<T>(stmt);
  return rows.length ? rows[0] : null;
}
