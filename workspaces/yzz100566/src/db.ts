import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  PRESERVATION_HOURS,
  LAB_RESULTS_SLA_HOURS,
  DISPATCH_SLA_HOURS,
} from './types';

const DB_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(path.join(DB_DIR, 'sewage.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outlets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sample_bottles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'unused',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sampling_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bottle_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      outlet_id INTEGER NOT NULL,
      outlet_code TEXT NOT NULL,
      outlet_name TEXT NOT NULL,
      sampled_at TEXT NOT NULL,
      sampler TEXT NOT NULL,
      sampler_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'sampled',
      preservation_deadline TEXT NOT NULL,
      is_sample_overdue INTEGER NOT NULL DEFAULT 0,
      is_dispatch_overdue INTEGER NOT NULL DEFAULT 0,
      is_lab_overdue INTEGER NOT NULL DEFAULT 0,
      dispatched_at TEXT,
      dispatcher TEXT,
      dispatcher_id INTEGER,
      dispatch_deadline TEXT NOT NULL,
      lab_received_at TEXT,
      lab_operator TEXT,
      lab_operator_id INTEGER,
      lab_sla_deadline TEXT,
      result_cod REAL,
      result_nh3n REAL,
      result_tp REAL,
      result_tn REAL,
      result_ph REAL,
      result_ss REAL,
      result_remark TEXT,
      result_reported_at TEXT,
      result_reporter TEXT,
      result_reporter_id INTEGER,
      parent_sampling_id INTEGER,
      is_re_sample INTEGER NOT NULL DEFAULT 0,
      re_sample_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (bottle_id) REFERENCES sample_bottles(id),
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sampling_barcode ON sampling_records(barcode);
    CREATE INDEX IF NOT EXISTS idx_sampling_status ON sampling_records(status);
    CREATE INDEX IF NOT EXISTS idx_sampling_outlet ON sampling_records(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_sampling_sampled_at ON sampling_records(sampled_at);
    CREATE INDEX IF NOT EXISTS idx_sampling_parent ON sampling_records(parent_sampling_id);

    CREATE TABLE IF NOT EXISTS rejection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sampling_id INTEGER NOT NULL UNIQUE,
      rejected_at TEXT NOT NULL,
      rejected_by TEXT NOT NULL,
      reject_reason TEXT NOT NULL,
      re_sample_requirement TEXT NOT NULL,
      re_sample_deadline TEXT NOT NULL,
      re_sample_completed INTEGER NOT NULL DEFAULT 0,
      re_sample_sampling_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (sampling_id) REFERENCES sampling_records(id)
    );

    CREATE TABLE IF NOT EXISTS alert_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sampling_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      alert_message TEXT NOT NULL,
      alert_level TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (sampling_id) REFERENCES sampling_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_alert_type ON alert_records(alert_type);
    CREATE INDEX IF NOT EXISTS idx_alert_sampling ON alert_records(sampling_id);
    CREATE INDEX IF NOT EXISTS idx_alert_acked ON alert_records(acknowledged);
  `);
}

initSchema();

export default db;

export {
  PRESERVATION_HOURS,
  LAB_RESULTS_SLA_HOURS,
  DISPATCH_SLA_HOURS,
};

export function addHours(dateStr: string, hours: number): string {
  const d = new Date(dateStr.replace(' ', 'T'));
  d.setTime(d.getTime() + hours * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export function nowStr(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function isOverdue(deadlineStr: string | null | undefined): boolean {
  if (!deadlineStr) return false;
  const d = new Date(deadlineStr.replace(' ', 'T'));
  return Date.now() > d.getTime();
}

export function diffHours(fromStr: string, toStr: string): number {
  const a = new Date(fromStr.replace(' ', 'T')).getTime();
  const b = new Date(toStr.replace(' ', 'T')).getTime();
  return (b - a) / 3600000;
}
