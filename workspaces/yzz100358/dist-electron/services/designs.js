import { getDb, getImagesPath } from '../database';
import fs from 'fs';
import path from 'path';
export function getDesigns(filters) {
    const db = getDb();
    let sql = `
    SELECT 
      td.*,
      c.name as client_name
    FROM tattoo_designs td
    LEFT JOIN clients c ON td.client_id = c.id
    WHERE 1=1
  `;
    const params = {};
    if (filters?.clientId) {
        sql += ` AND td.client_id = @clientId`;
        params.clientId = filters.clientId;
    }
    if (filters?.bookingId) {
        sql += ` AND td.booking_id = @bookingId`;
        params.bookingId = filters.bookingId;
    }
    sql += ` ORDER BY td.created_at DESC`;
    const designs = db.prepare(sql).all(params);
    return designs.map((design) => ({
        ...design,
        versions: getDesignVersions(design.id),
    }));
}
export function getDesignById(id) {
    const db = getDb();
    const sql = `
    SELECT 
      td.*,
      c.name as client_name
    FROM tattoo_designs td
    LEFT JOIN clients c ON td.client_id = c.id
    WHERE td.id = ?
  `;
    const design = db.prepare(sql).get(id);
    if (!design)
        return undefined;
    return {
        ...design,
        versions: getDesignVersions(design.id),
    };
}
export function getDesignVersions(designId) {
    const db = getDb();
    return db
        .prepare(`SELECT * FROM design_versions WHERE design_id = ? ORDER BY version_number DESC`)
        .all(designId);
}
export function uploadDesignImage(sourcePath, designId) {
    const imagesDir = getImagesPath();
    const designDir = path.join(imagesDir, `design_${designId}`);
    if (!fs.existsSync(designDir)) {
        fs.mkdirSync(designDir, { recursive: true });
    }
    const ext = path.extname(sourcePath);
    const timestamp = Date.now();
    const fileName = `v_${timestamp}${ext}`;
    const savedPath = path.join(designDir, fileName);
    fs.copyFileSync(sourcePath, savedPath);
    return { savedPath };
}
export function uploadDepositImage(sourcePath, bookingId) {
    const imagesDir = getImagesPath();
    const depositDir = path.join(imagesDir, `deposits`);
    if (!fs.existsSync(depositDir)) {
        fs.mkdirSync(depositDir, { recursive: true });
    }
    const ext = path.extname(sourcePath);
    const timestamp = Date.now();
    const fileName = `booking_${bookingId}_${timestamp}${ext}`;
    const savedPath = path.join(depositDir, fileName);
    fs.copyFileSync(sourcePath, savedPath);
    return { savedPath };
}
export function saveDesign(design) {
    const db = getDb();
    const now = new Date().toISOString();
    if (design.id) {
        const stmt = db.prepare(`
      UPDATE tattoo_designs 
      SET name = @name,
          description = @description
      WHERE id = @id
    `);
        stmt.run(design);
        if (design.image_path) {
            const currentDesign = getDesignById(design.id);
            addDesignVersion(design.id, design.image_path, design.feedback, currentDesign.current_version + 1);
            db.prepare(`
        UPDATE tattoo_designs 
        SET current_version = current_version + 1
        WHERE id = ?
      `).run(design.id);
            if (design.booking_id) {
                db.prepare(`
          UPDATE bookings 
          SET revision_count = revision_count + 1,
              updated_at = @updated_at
          WHERE id = @bookingId
        `).run({ bookingId: design.booking_id, updated_at: now });
            }
        }
        return getDesignById(design.id);
    }
    else {
        const stmt = db.prepare(`
      INSERT INTO tattoo_designs (client_id, booking_id, name, description, current_version, created_at)
      VALUES (@client_id, @booking_id, @name, @description, @current_version, @created_at)
    `);
        const result = stmt.run({
            ...design,
            current_version: 1,
            created_at: now,
        });
        const designId = result.lastInsertRowid;
        if (design.image_path) {
            addDesignVersion(designId, design.image_path, design.feedback, 1);
        }
        return getDesignById(designId);
    }
}
function addDesignVersion(designId, imagePath, feedback, versionNumber = 1) {
    const db = getDb();
    const stmt = db.prepare(`
    INSERT INTO design_versions (design_id, version_number, image_path, feedback, created_at)
    VALUES (@design_id, @version_number, @image_path, @feedback, @created_at)
  `);
    const result = stmt.run({
        design_id: designId,
        version_number: versionNumber,
        image_path: imagePath,
        feedback: feedback ?? null,
        created_at: new Date().toISOString(),
    });
    return db.prepare(`SELECT * FROM design_versions WHERE id = ?`).get(result.lastInsertRowid);
}
export function checkAllImages() {
    const db = getDb();
    const versions = db.prepare(`
    SELECT dv.*, td.name as design_name
    FROM design_versions dv
    JOIN tattoo_designs td ON dv.design_id = td.id
  `).all();
    const deposits = db.prepare(`
    SELECT * FROM deposits WHERE screenshot_path IS NOT NULL
  `).all();
    const valid = [];
    const invalid = [];
    for (const v of versions) {
        if (fs.existsSync(v.image_path)) {
            valid.push(v.image_path);
        }
        else {
            invalid.push({
                path: v.image_path,
                designId: v.design_id,
                versionId: v.id,
                designName: v.design_name,
            });
        }
    }
    for (const d of deposits) {
        if (fs.existsSync(d.screenshot_path)) {
            valid.push(d.screenshot_path);
        }
        else {
            invalid.push({
                path: d.screenshot_path,
                designId: 0,
                versionId: d.id,
                designName: `定金凭证-${d.id}`,
            });
        }
    }
    return { valid, invalid };
}
export function deleteDesign(id) {
    const db = getDb();
    const result = db.prepare(`DELETE FROM tattoo_designs WHERE id = ?`).run(id);
    return result.changes > 0;
}
export default {
    getDesigns,
    getDesignById,
    getDesignVersions,
    uploadDesignImage,
    uploadDepositImage,
    saveDesign,
    checkAllImages,
    deleteDesign,
};
