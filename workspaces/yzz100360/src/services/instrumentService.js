const db = require('../db');

const listInstruments = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.name) {
    conditions.push('name LIKE ?');
    params.push(`%${filters.name}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.all(
    `SELECT * FROM instruments ${where} ORDER BY code ASC`,
    params
  );
};

const getInstrumentById = async (id) => {
  return db.get('SELECT * FROM instruments WHERE id = ?', [id]);
};

const getInstrumentByCode = async (code) => {
  return db.get('SELECT * FROM instruments WHERE code = ?', [code]);
};

const createInstrument = async (data) => {
  const { code, name, type, description } = data;

  const existing = await getInstrumentByCode(code);
  if (existing) {
    throw new Error('器械编号已存在');
  }

  const result = await db.run(
    'INSERT INTO instruments (code, name, type, description) VALUES (?, ?, ?, ?)',
    [code, name, type, description || '']
  );

  return getInstrumentById(result.lastID);
};

const updateInstrument = async (id, data) => {
  const fields = [];
  const params = [];

  ['name', 'type', 'description', 'status'].forEach(field => {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (fields.length === 0) {
    return getInstrumentById(id);
  }

  params.push(id);

  await db.run(
    `UPDATE instruments SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return getInstrumentById(id);
};

const deleteInstrument = async (id) => {
  const result = await db.run('DELETE FROM instruments WHERE id = ?', [id]);
  return result.changes > 0;
};

module.exports = {
  listInstruments,
  getInstrumentById,
  getInstrumentByCode,
  createInstrument,
  updateInstrument,
  deleteInstrument,
};
