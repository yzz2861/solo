const db = require('./index');

const createTables = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'in_use',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sterilization_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT UNIQUE NOT NULL,
      bag_no TEXT NOT NULL,
      sterilizer_id TEXT,
      pot_cycle TEXT,
      status TEXT DEFAULT 'collected',
      collected_at DATETIME,
      cleaned_at DATETIME,
      sterilized_at DATETIME,
      sterilization_result TEXT,
      stored_at DATETIME,
      issued_at DATETIME,
      used_at DATETIME,
      expire_at DATETIME,
      operator_collect TEXT,
      operator_clean TEXT,
      operator_sterilize TEXT,
      operator_store TEXT,
      operator_issue TEXT,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      instrument_id INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES sterilization_batches(id),
      FOREIGN KEY (instrument_id) REFERENCES instruments(id),
      UNIQUE(batch_id, instrument_id)
    );

    CREATE TABLE IF NOT EXISTS scan_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT,
      location TEXT,
      operator TEXT,
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS treatment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor TEXT NOT NULL,
      treatment_type TEXT,
      treatment_date DATE NOT NULL,
      clinic_room TEXT,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS treatment_instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treatment_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      instrument_id INTEGER,
      picked_up_at DATETIME,
      used_at DATETIME,
      returned_at DATETIME,
      FOREIGN KEY (treatment_id) REFERENCES treatment_records(id),
      FOREIGN KEY (batch_id) REFERENCES sterilization_batches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_batch_status ON sterilization_batches(status);
    CREATE INDEX IF NOT EXISTS idx_batch_qr ON sterilization_batches(qr_code);
    CREATE INDEX IF NOT EXISTS idx_scan_qr ON scan_records(qr_code);
    CREATE INDEX IF NOT EXISTS idx_treatment_date ON treatment_records(treatment_date);
    CREATE INDEX IF NOT EXISTS idx_batch_expire ON sterilization_batches(expire_at);
  `);

  console.log('数据库表创建完成');
};

const seedData = async () => {
  const row = await db.get('SELECT COUNT(*) as count FROM instruments');
  
  if (row.count === 0) {
    const instruments = [
      ['INS-001', '洁牙头A型', 'scaler_tip', '超声波洁牙机工作尖'],
      ['INS-002', '洁牙头B型', 'scaler_tip', '牙周袋深部清洁工作尖'],
      ['INS-003', '拔牙钳-上颌', 'forceps', '上颌磨牙拔牙钳'],
      ['INS-004', '拔牙钳-下颌', 'forceps', '下颌磨牙拔牙钳'],
      ['INS-005', '种植工具包-基础', 'implant_kit', '种植手术基础工具包'],
      ['INS-006', '种植工具包-高级', 'implant_kit', '种植手术高级工具包'],
      ['INS-007', '口镜', 'mirror', '口腔检查镜'],
      ['INS-008', '探针', 'probe', '牙周探针'],
    ];

    const stmt = db.prepare('INSERT INTO instruments (code, name, type, description) VALUES (?, ?, ?, ?)');
    for (const inst of instruments) {
      await stmt.run(...inst);
    }
    await stmt.finalize();

    console.log('示例器械数据已插入');
  }
};

const init = async () => {
  await createTables();
  await seedData();
  console.log('数据库初始化完成');
};

init().catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
