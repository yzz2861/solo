const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'volunteer.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  initSeedData();

  saveDatabase();
  console.log('数据库初始化完成');
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function initSeedData() {
  const row = db.exec('SELECT COUNT(*) as count FROM users');
  const count = row[0].values[0][0];
  if (count > 0) return;

  db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", ['张志愿', 'volunteer1@test.com', 'volunteer']);
  db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", ['李志愿', 'volunteer2@test.com', 'volunteer']);
  db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", ['王志愿', 'volunteer3@test.com', 'volunteer']);
  db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", ['赵管理员', 'admin@test.com', 'admin']);
  db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", ['钱负责人', 'manager@test.com', 'activity_manager']);

  db.run(`INSERT INTO activities (name, description, location, start_time, end_time, manager_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['社区环保宣传活动', '垃圾分类知识宣传', '阳光社区广场', '2024-01-15 09:00:00', '2024-01-15 12:00:00', 5, 'published']
  );

  db.run(`INSERT INTO attendance_records (activity_id, volunteer_id, sign_in_time, sign_out_time, hours, source, is_public)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 1, '2024-01-15 09:00:00', '2024-01-15 12:00:00', 3.0, 'normal', 1]
  );
  db.run(`INSERT INTO attendance_records (activity_id, volunteer_id, sign_in_time, sign_out_time, hours, source, is_public)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 2, '2024-01-15 09:00:00', null, 0, 'normal', 1]
  );
  db.run(`INSERT INTO attendance_records (activity_id, volunteer_id, sign_in_time, sign_out_time, hours, source, is_public)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 3, '2024-01-15 09:30:00', '2024-01-15 11:30:00', 2.0, 'normal', 1]
  );

  console.log('种子数据初始化完成');
}

function sanitizeParams(params) {
  return params.map(p => p === undefined ? null : p);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const cleanParams = sanitizeParams(params);
      const stmt = db.prepare(sql);
      stmt.bind(cleanParams);
      stmt.step();
      stmt.free();
      const result = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
      const lastID = result[0]?.values[0]?.[0] ?? 0;
      const changes = result[0]?.values[0]?.[1] ?? 0;
      saveDatabase();
      resolve({ lastID, changes });
    } catch (err) {
      reject(err);
    }
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const cleanParams = sanitizeParams(params);
      const stmt = db.prepare(sql);
      stmt.bind(cleanParams);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const cleanParams = sanitizeParams(params);
      const stmt = db.prepare(sql);
      stmt.bind(cleanParams);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    try {
      db.exec(sql);
      saveDatabase();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

async function initialize() {
  await initDatabase();
}

module.exports = {
  db,
  run,
  get,
  all,
  exec,
  initialize,
  saveDatabase
};
