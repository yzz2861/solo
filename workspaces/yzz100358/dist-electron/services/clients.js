import { getDb } from '../database';
export function getClients(filters) {
    const db = getDb();
    let sql = `
    SELECT * FROM clients 
    WHERE 1=1
  `;
    const params = {};
    if (filters?.keyword) {
        sql += ` AND (name LIKE @keyword OR phone LIKE @keyword OR wechat_id LIKE @keyword)`;
        params.keyword = `%${filters.keyword}%`;
    }
    if (filters?.hasAllergies) {
        sql += ` AND (allergies IS NOT NULL AND allergies != '' OR is_sensitive_skin = 1)`;
    }
    sql += ` ORDER BY updated_at DESC`;
    return db.prepare(sql).all(params);
}
export function getClientById(id) {
    const db = getDb();
    return db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id);
}
export function saveClient(client) {
    const db = getDb();
    const now = new Date().toISOString();
    if (client.id) {
        const stmt = db.prepare(`
      UPDATE clients 
      SET name = @name,
          phone = @phone,
          wechat_id = @wechat_id,
          birthday = @birthday,
          allergies = @allergies,
          contraindications = @contraindications,
          is_sensitive_skin = @is_sensitive_skin,
          updated_at = @updated_at
      WHERE id = @id
    `);
        stmt.run({
            ...client,
            updated_at: now,
        });
        return getClientById(client.id);
    }
    else {
        const stmt = db.prepare(`
      INSERT INTO clients (name, phone, wechat_id, birthday, allergies, contraindications, is_sensitive_skin, created_at, updated_at)
      VALUES (@name, @phone, @wechat_id, @birthday, @allergies, @contraindications, @is_sensitive_skin, @created_at, @updated_at)
    `);
        const result = stmt.run({
            ...client,
            created_at: now,
            updated_at: now,
        });
        return getClientById(result.lastInsertRowid);
    }
}
export function deleteClient(id) {
    const db = getDb();
    const result = db.prepare(`DELETE FROM clients WHERE id = ?`).run(id);
    return result.changes > 0;
}
export default { getClients, getClientById, saveClient, deleteClient };
