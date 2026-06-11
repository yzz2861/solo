import { getDb } from '../database';
export function getBodyParts() {
    const db = getDb();
    return db.prepare(`SELECT * FROM body_parts ORDER BY category, name`).all();
}
export function getSensitiveBodyParts() {
    const db = getDb();
    return db.prepare(`SELECT * FROM body_parts WHERE is_sensitive = 1 ORDER BY name`).all();
}
export default { getBodyParts, getSensitiveBodyParts };
