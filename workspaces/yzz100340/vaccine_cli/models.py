DATABASE_SCHEMA = """
CREATE TABLE IF NOT EXISTS vaccines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    min_temp REAL NOT NULL,
    max_temp REAL NOT NULL,
    shelf_life_months INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaccine_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaccine_id INTEGER NOT NULL,
    batch_number TEXT NOT NULL UNIQUE,
    manufacture_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    initial_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(id)
);

CREATE TABLE IF NOT EXISTS temperature_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_time TEXT NOT NULL UNIQUE,
    temperature REAL,
    is_missing INTEGER NOT NULL DEFAULT 0,
    is_power_outage INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    age INTEGER,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, owner_phone)
);

CREATE TABLE IF NOT EXISTS vaccination_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    vaccination_date TEXT NOT NULL,
    dose_number INTEGER NOT NULL,
    administrator TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id),
    FOREIGN KEY (batch_id) REFERENCES vaccine_batches(id),
    UNIQUE(pet_id, batch_id, dose_number)
);

CREATE TABLE IF NOT EXISTS abnormal_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_start TEXT NOT NULL,
    event_end TEXT,
    batch_ids TEXT,
    description TEXT NOT NULL,
    action_taken TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    related_batch_id INTEGER,
    related_record_id INTEGER,
    related_pet_id INTEGER,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (related_batch_id) REFERENCES vaccine_batches(id),
    FOREIGN KEY (related_record_id) REFERENCES vaccination_records(id),
    FOREIGN KEY (related_pet_id) REFERENCES pets(id)
);

CREATE INDEX IF NOT EXISTS idx_temperature_logs_time ON temperature_logs(record_time);
CREATE INDEX IF NOT EXISTS idx_vaccine_batches_status ON vaccine_batches(status);
CREATE INDEX IF NOT EXISTS idx_vaccine_batches_expiry ON vaccine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_date ON vaccination_records(vaccination_date);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);
"""
