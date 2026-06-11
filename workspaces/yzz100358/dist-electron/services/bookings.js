import { getDb } from '../database';
import dayjs from 'dayjs';
export function getBookings(filters) {
    const db = getDb();
    let sql = `
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      c.allergies as client_allergies,
      c.contraindications as client_contraindications,
      c.is_sensitive_skin as client_is_sensitive_skin,
      a.name as artist_name,
      bp.name as body_part_name,
      bp.is_sensitive as body_part_is_sensitive,
      d.amount as deposit_amount,
      CASE WHEN d.paid_at IS NOT NULL THEN 1 ELSE 0 END as deposit_paid,
      td.name as design_name,
      dv.image_path as design_image_path
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    LEFT JOIN deposits d ON b.id = d.booking_id
    LEFT JOIN tattoo_designs td ON b.id = td.booking_id
    LEFT JOIN (
      SELECT design_id, MAX(version_number) as max_version
      FROM design_versions
      GROUP BY design_id
    ) dv_max ON td.id = dv_max.design_id
    LEFT JOIN design_versions dv ON dv_max.design_id = dv.design_id AND dv_max.max_version = dv.version_number
    WHERE 1=1
  `;
    const params = {};
    if (filters?.dateRange) {
        sql += ` AND DATE(b.start_time) >= DATE(@startDate) AND DATE(b.start_time) <= DATE(@endDate)`;
        params.startDate = filters.dateRange[0];
        params.endDate = filters.dateRange[1];
    }
    if (filters?.artistId) {
        sql += ` AND b.artist_id = @artistId`;
        params.artistId = filters.artistId;
    }
    if (filters?.status) {
        sql += ` AND b.status = @status`;
        params.status = filters.status;
    }
    if (filters?.clientId) {
        sql += ` AND b.client_id = @clientId`;
        params.clientId = filters.clientId;
    }
    sql += ` ORDER BY b.start_time ASC`;
    return db.prepare(sql).all(params);
}
export function getBookingById(id) {
    const db = getDb();
    const sql = `
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      c.allergies as client_allergies,
      c.contraindications as client_contraindications,
      c.is_sensitive_skin as client_is_sensitive_skin,
      a.name as artist_name,
      bp.name as body_part_name,
      bp.is_sensitive as body_part_is_sensitive,
      d.amount as deposit_amount,
      CASE WHEN d.paid_at IS NOT NULL THEN 1 ELSE 0 END as deposit_paid,
      td.name as design_name,
      dv.image_path as design_image_path
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    LEFT JOIN deposits d ON b.id = d.booking_id
    LEFT JOIN tattoo_designs td ON b.id = td.booking_id
    LEFT JOIN (
      SELECT design_id, MAX(version_number) as max_version
      FROM design_versions
      GROUP BY design_id
    ) dv_max ON td.id = dv_max.design_id
    LEFT JOIN design_versions dv ON dv_max.design_id = dv.design_id AND dv_max.max_version = dv.version_number
    WHERE b.id = ?
  `;
    return db.prepare(sql).get(id);
}
export function checkTimeConflict(artistId, startTime, endTime, excludeBookingId) {
    const db = getDb();
    const overlapThreshold = 15 * 60 * 1000;
    let sql = `
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      a.name as artist_name,
      bp.name as body_part_name
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    WHERE b.artist_id = @artistId
      AND b.status NOT IN ('cancelled')
  `;
    if (excludeBookingId) {
        sql += ` AND b.id != @excludeId`;
    }
    const bookings = db.prepare(sql).all({
        artistId,
        excludeId: excludeBookingId,
    });
    const newStart = dayjs(startTime).valueOf();
    const newEnd = dayjs(endTime).valueOf();
    const conflictBookings = bookings.filter((b) => {
        const bStart = dayjs(b.start_time).valueOf();
        const bEnd = dayjs(b.end_time).valueOf();
        const overlapStart = Math.max(bStart, newStart);
        const overlapEnd = Math.min(bEnd, newEnd);
        const overlapDuration = overlapEnd - overlapStart;
        return overlapDuration > overlapThreshold;
    });
    return {
        hasConflict: conflictBookings.length > 0,
        conflictBookings,
    };
}
export function saveBooking(booking) {
    const db = getDb();
    const now = new Date().toISOString();
    const isSensitiveArea = booking.is_sensitive_area ?? 0;
    if (booking.id) {
        const stmt = db.prepare(`
      UPDATE bookings 
      SET client_id = @client_id,
          artist_id = @artist_id,
          body_part_id = @body_part_id,
          start_time = @start_time,
          end_time = @end_time,
          estimated_duration = @estimated_duration,
          status = @status,
          internal_notes = @internal_notes,
          client_notes = @client_notes,
          is_sensitive_area = @is_sensitive_area,
          revision_count = @revision_count,
          updated_at = @updated_at
      WHERE id = @id
    `);
        stmt.run({
            ...booking,
            is_sensitive_area: isSensitiveArea,
            updated_at: now,
        });
        return getBookingById(booking.id);
    }
    else {
        const stmt = db.prepare(`
      INSERT INTO bookings (
        client_id, artist_id, body_part_id, start_time, end_time,
        estimated_duration, status, internal_notes, client_notes,
        is_sensitive_area, revision_count, created_at, updated_at
      ) VALUES (
        @client_id, @artist_id, @body_part_id, @start_time, @end_time,
        @estimated_duration, @status, @internal_notes, @client_notes,
        @is_sensitive_area, @revision_count, @created_at, @updated_at
      )
    `);
        const result = stmt.run({
            ...booking,
            status: booking.status ?? 'pending_deposit',
            is_sensitive_area: isSensitiveArea,
            revision_count: booking.revision_count ?? 0,
            created_at: now,
            updated_at: now,
        });
        return getBookingById(result.lastInsertRowid);
    }
}
export function cancelBooking(id) {
    const db = getDb();
    const stmt = db.prepare(`
    UPDATE bookings 
    SET status = 'cancelled', updated_at = @updated_at
    WHERE id = @id
  `);
    const result = stmt.run({
        id,
        updated_at: new Date().toISOString(),
    });
    return result.changes > 0;
}
export function getTodayBookings(artistId) {
    const today = dayjs().format('YYYY-MM-DD');
    return getBookings({
        dateRange: [today, today],
        artistId,
    }).filter(b => b.status !== 'cancelled');
}
export default {
    getBookings,
    getBookingById,
    checkTimeConflict,
    saveBooking,
    cancelBooking,
    getTodayBookings,
};
