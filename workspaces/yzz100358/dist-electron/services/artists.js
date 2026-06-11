import { getDb } from '../database';
export function getArtists(activeOnly = true) {
    const db = getDb();
    let sql = `SELECT * FROM artists`;
    if (activeOnly) {
        sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY name`;
    return db.prepare(sql).all();
}
export function getArtistById(id) {
    const db = getDb();
    return db.prepare(`SELECT * FROM artists WHERE id = ?`).get(id);
}
export function saveArtist(artist) {
    const db = getDb();
    const now = new Date().toISOString();
    if (artist.id) {
        const stmt = db.prepare(`
      UPDATE artists 
      SET name = @name,
          specialty = @specialty,
          avatar_path = @avatar_path,
          is_active = @is_active
      WHERE id = @id
    `);
        stmt.run(artist);
        return getArtistById(artist.id);
    }
    else {
        const stmt = db.prepare(`
      INSERT INTO artists (name, specialty, avatar_path, is_active, created_at)
      VALUES (@name, @specialty, @avatar_path, @is_active, @created_at)
    `);
        const result = stmt.run({
            ...artist,
            is_active: artist.is_active ?? 1,
            created_at: now,
        });
        return getArtistById(result.lastInsertRowid);
    }
}
export default { getArtists, getArtistById, saveArtist };
