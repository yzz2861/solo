const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const TABLES = [
  'technicians',
  'work_orders',
  'spare_parts',
  'checkout_records',
  'install_records',
  'old_part_recoveries',
  'return_records',
  'scrap_records',
  'inventory_flows',
  'users'
];

function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) return load();

  const db = {};
  for (const t of TABLES) db[t] = [];
  save(db);
  return db;
}

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(db) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function getDb() {
  return load();
}

function persist(db) {
  save(db);
}

let _idCounters = {};

function nextId(db, table) {
  if (!_idCounters[table]) _idCounters[table] = 0;
  const rows = db[table] || [];
  const maxId = rows.reduce((m, r) => {
    const n = parseInt(r.id, 10);
    return n > m ? n : m;
  }, 0);
  const next = Math.max(maxId + 1, (_idCounters[table] || 0) + 1);
  _idCounters[table] = next;
  return String(next);
}

function insert(db, table, record) {
  if (!db[table]) db[table] = [];
  const id = nextId(db, table);
  const row = { id, ...record, created_at: record.created_at || new Date().toISOString() };
  db[table].push(row);
  persist(db);
  return row;
}

function update(db, table, id, updates) {
  const idx = db[table].findIndex(r => r.id === String(id));
  if (idx === -1) return null;
  db[table][idx] = { ...db[table][idx], ...updates, updated_at: new Date().toISOString() };
  persist(db);
  return db[table][idx];
}

function findById(db, table, id) {
  return (db[table] || []).find(r => r.id === String(id)) || null;
}

function find(db, table, predicate) {
  return (db[table] || []).filter(predicate);
}

function findOne(db, table, predicate) {
  return (db[table] || []).find(predicate) || null;
}

function count(db, table, predicate) {
  if (!predicate) return (db[table] || []).length;
  return (db[table] || []).filter(predicate).length;
}

function remove(db, table, id) {
  const idx = db[table].findIndex(r => r.id === String(id));
  if (idx === -1) return false;
  db[table].splice(idx, 1);
  persist(db);
  return true;
}

module.exports = { initDb, getDb, persist, insert, update, findById, find, findOne, count, remove, nextId, TABLES };
