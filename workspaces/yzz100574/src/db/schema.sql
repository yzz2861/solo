CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('volunteer', 'admin', 'activity_manager')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  manager_id INTEGER,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  volunteer_id INTEGER NOT NULL,
  sign_in_time DATETIME,
  sign_out_time DATETIME,
  hours REAL DEFAULT 0,
  source TEXT DEFAULT 'normal' CHECK(source IN ('normal', 'appeal_fix', 'manual')),
  is_public INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id),
  FOREIGN KEY (volunteer_id) REFERENCES users(id),
  UNIQUE(activity_id, volunteer_id)
);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  volunteer_id INTEGER NOT NULL,
  appeal_type TEXT NOT NULL CHECK(appeal_type IN ('missed_sign', 'extended_activity', 'admin_error')),
  reason TEXT NOT NULL,
  requested_hours REAL,
  requested_sign_in DATETIME,
  requested_sign_out DATETIME,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'merged')),
  merged_to_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id),
  FOREIGN KEY (volunteer_id) REFERENCES users(id),
  FOREIGN KEY (merged_to_id) REFERENCES appeals(id)
);

CREATE TABLE IF NOT EXISTS appeal_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appeal_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appeal_id) REFERENCES appeals(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appeal_id INTEGER NOT NULL,
  operator_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  remark TEXT,
  old_status TEXT,
  new_status TEXT,
  old_hours REAL,
  new_hours REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appeal_id) REFERENCES appeals(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  batch_no TEXT NOT NULL,
  status TEXT DEFAULT 'pending_review' CHECK(status IN ('pending_review', 'reviewed', 'published', 'revised')),
  created_by INTEGER,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS publication_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id INTEGER NOT NULL,
  attendance_id INTEGER NOT NULL,
  volunteer_id INTEGER NOT NULL,
  volunteer_name TEXT,
  original_hours REAL,
  final_hours REAL,
  is_corrected INTEGER DEFAULT 0,
  correction_reason TEXT,
  appeal_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publication_id) REFERENCES publications(id),
  FOREIGN KEY (attendance_id) REFERENCES attendance_records(id),
  FOREIGN KEY (volunteer_id) REFERENCES users(id),
  FOREIGN KEY (appeal_id) REFERENCES appeals(id)
);
