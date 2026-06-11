CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  id_card_raw TEXT NOT NULL,
  phone_raw TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('男','女')),
  age INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medical_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  visit_date TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('image','text')),
  source_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded','extracted','confirmed','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_records_visit_date ON medical_records(visit_date);
CREATE INDEX IF NOT EXISTS idx_records_status ON medical_records(status);

CREATE TABLE IF NOT EXISTS extraction_fields (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('high','medium','low')),
  evidence_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  original_raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_extractions_record ON extraction_fields(record_id);

CREATE TABLE IF NOT EXISTS revision_history (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  operator TEXT NOT NULL,
  reason TEXT,
  operated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_revisions_record ON revision_history(record_id);

CREATE TABLE IF NOT EXISTS qa_reviews (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES revision_history(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('pass','needs_recheck')),
  comment TEXT,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
