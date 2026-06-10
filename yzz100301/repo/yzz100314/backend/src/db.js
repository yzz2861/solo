const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'tickets.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultDb = {
  tickets: [],
  escalations: [],
  replies: [],
  reviews: [],
  import_batches: [],
};

let dbCache = null;
let lastModified = 0;

function loadDb() {
  if (!fs.existsSync(dbFile)) {
    dbCache = JSON.parse(JSON.stringify(defaultDb));
    saveDb();
    return dbCache;
  }
  
  const stat = fs.statSync(dbFile);
  if (dbCache && stat.mtimeMs === lastModified) {
    return dbCache;
  }
  
  try {
    const content = fs.readFileSync(dbFile, 'utf-8');
    dbCache = JSON.parse(content);
    lastModified = stat.mtimeMs;
    
    for (const key of Object.keys(defaultDb)) {
      if (!Array.isArray(dbCache[key])) {
        dbCache[key] = [];
      }
    }
  } catch (e) {
    console.error('数据库加载失败，使用空数据库', e.message);
    dbCache = JSON.parse(JSON.stringify(defaultDb));
  }
  
  return dbCache;
}

function saveDb() {
  if (!dbCache) return;
  const tmpFile = dbFile + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(dbCache, null, 2));
  fs.renameSync(tmpFile, dbFile);
  const stat = fs.statSync(dbFile);
  lastModified = stat.mtimeMs;
}

function getCollection(name) {
  const db = loadDb();
  return db[name] || [];
}

function setCollection(name, data) {
  const db = loadDb();
  db[name] = data;
  saveDb();
}

function insert(collection, record) {
  const db = loadDb();
  if (!db[collection]) db[collection] = [];
  
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const newRecord = { ...record, id };
  db[collection].push(newRecord);
  saveDb();
  return newRecord;
}

function update(collection, id, updates) {
  const db = loadDb();
  const idx = db[collection].findIndex(item => item.id === id);
  if (idx === -1) return null;
  db[collection][idx] = { ...db[collection][idx], ...updates };
  saveDb();
  return db[collection][idx];
}

function upsertByField(collection, field, value, record) {
  const db = loadDb();
  const idx = db[collection].findIndex(item => item[field] === value);
  if (idx === -1) {
    const newRecord = { ...record, id: Date.now() + Math.floor(Math.random() * 10000) };
    db[collection].push(newRecord);
    saveDb();
    return { record: newRecord, created: true };
  } else {
    db[collection][idx] = { ...db[collection][idx], ...record };
    saveDb();
    return { record: db[collection][idx], created: false };
  }
}

function findAll(collection, filterFn = null) {
  const items = getCollection(collection);
  return filterFn ? items.filter(filterFn) : [...items];
}

function findOne(collection, filterFn) {
  const items = getCollection(collection);
  return items.find(filterFn) || null;
}

function findByField(collection, field, value) {
  const items = getCollection(collection);
  return items.filter(item => item[field] === value);
}

function findOneByField(collection, field, value) {
  const items = getCollection(collection);
  return items.find(item => item[field] === value) || null;
}

function insertMany(collection, records, uniqueKey = null) {
  const db = loadDb();
  if (!db[collection]) db[collection] = [];
  
  let inserted = 0;
  let skipped = 0;
  
  for (const record of records) {
    if (uniqueKey) {
      const exists = db[collection].some(item => item[uniqueKey] === record[uniqueKey]);
      if (exists) {
        skipped++;
        continue;
      }
    }
    
    const newRecord = {
      ...record,
      id: Date.now() + Math.floor(Math.random() * 10000) + inserted,
    };
    db[collection].push(newRecord);
    inserted++;
  }
  
  saveDb();
  return { inserted, skipped, total: records.length };
}

module.exports = {
  loadDb,
  saveDb,
  getCollection,
  setCollection,
  insert,
  update,
  upsertByField,
  findAll,
  findOne,
  findByField,
  findOneByField,
  insertMany,
};
