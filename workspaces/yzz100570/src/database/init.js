const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'purchase.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const init = () => {
  return new Promise((resolve, reject) => {
    console.log('Initializing database...');

    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA foreign_keys = ON');

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('employee', 'admin', 'leader')),
          department TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS purchase_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_no TEXT UNIQUE NOT NULL,
          applicant_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          item_spec TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit TEXT,
          purpose TEXT NOT NULL,
          estimated_budget REAL,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'admin_review', 'leader_approved', 'leader_rejected', 'ordered', 'accepted', 'rejected', 'returned')),
          urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('low', 'normal', 'high')),
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (applicant_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS quotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          supplier_name TEXT NOT NULL,
          supplier_contact TEXT,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          delivery_days INTEGER,
          quote_image TEXT,
          is_selected INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS approvals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          approver_id INTEGER NOT NULL,
          approval_type TEXT NOT NULL CHECK(approval_type IN ('admin_review', 'leader_approval')),
          action TEXT NOT NULL CHECK(action IN ('approve', 'reject')),
          comment TEXT,
          approved_amount REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (approver_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          quotation_id INTEGER NOT NULL,
          order_no TEXT,
          order_amount REAL NOT NULL,
          order_date DATE,
          expected_delivery DATE,
          actual_delivery DATE,
          order_remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (quotation_id) REFERENCES quotations(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS acceptances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          order_id INTEGER NOT NULL,
          acceptance_date DATE,
          acceptance_result TEXT CHECK(acceptance_result IN ('pass', 'fail', 'partial')),
          acceptance_remark TEXT,
          invoice_status TEXT DEFAULT 'pending' CHECK(invoice_status IN ('pending', 'received', 'partial', 'not_needed')),
          invoice_no TEXT,
          invoice_amount REAL,
          acceptance_photos TEXT,
          accepted_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (accepted_by) REFERENCES users(id)
        )
      `);

      db.run('CREATE INDEX IF NOT EXISTS idx_requests_applicant ON purchase_requests(applicant_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_requests_status ON purchase_requests(status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_quotations_request ON quotations(request_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals(request_id)');

      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) return reject(err);
        
        if (row.count === 0) {
          console.log('Seeding initial users...');
          
          const salt = bcrypt.genSaltSync(10);
          const hashed = bcrypt.hashSync('123456', salt);
          
          const stmt = db.prepare('INSERT INTO users (username, password, name, role, department) VALUES (?, ?, ?, ?, ?)');
          
          stmt.run('employee1', hashed, '张三', 'employee', '市场部');
          stmt.run('employee2', hashed, '李四', 'employee', '技术部');
          stmt.run('admin1', hashed, '王行政', 'admin', '行政部');
          stmt.run('leader1', hashed, '赵总', 'leader', '总经办');
          
          stmt.finalize();
          
          console.log('Initial users created. Passwords: 123456');
          console.log('  - 员工: employee1 (张三), employee2 (李四)');
          console.log('  - 行政: admin1 (王行政)');
          console.log('  - 领导: leader1 (赵总)');
        }
        
        console.log('Database initialized successfully.');
        resolve(db);
      });
    });
  });
};

module.exports = { init, db };
