require('dotenv').config();
process.env.DB_PATH = './data/debug_test.db';
const fs = require('fs');
const dbPath = process.env.DB_PATH;
if(fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, real_name) VALUES (?,?,?,?)');
const adminId = insertUser.run('a', bcrypt.hashSync('1',10), 'admin', 'A').lastInsertRowid;

const insertOwner = db.prepare('INSERT INTO owners (name, phone) VALUES (?,?)');
const oid = insertOwner.run('测试','13800138000').lastInsertRowid;

const insertRoom = db.prepare('INSERT INTO rooms (room_number, building, owner_id) VALUES (?,?,?)');
const rid = insertRoom.run('101','1',oid).lastInsertRowid;

const insertCard = db.prepare('INSERT INTO access_cards (card_number, owner_id, room_id, status) VALUES (?,?,?,?)');
const cid = insertCard.run('XX1', oid, rid, 'active').lastInsertRowid;

db.prepare(`INSERT INTO card_reissues 
  (old_card_id,room_id,owner_id,status,reported_by,warning_flags) 
  VALUES (?,?,?,?,?,?)`).run(cid,rid,oid,'completed',adminId,'same_room_daily_count_2');

console.log('Test data inserted');

try {
  const anomalies = db.prepare(`
    (
      SELECT 
        'recover' as anomaly_type,
        cr.id as source_id,
        cr.reported_at as event_time,
        cr.old_card_id as card_id,
        oc.card_number,
        r.room_number,
        r.building,
        r.unit,
        o.name as owner_name,
        '旧卡挂失后找回复开' as description,
        cr.completed_at as anomaly_time,
        null as handler_name
      FROM card_reissues cr
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      WHERE cr.status = 'old_card_recovered'
        AND DATE(cr.completed_at) >= ? AND DATE(cr.completed_at) <= ?
    )
    UNION ALL
    (
      SELECT 
        'same_day_multiple' as anomaly_type,
        cr.id as source_id,
        cr.reported_at as event_time,
        cr.old_card_id as card_id,
        oc.card_number,
        r.room_number,
        r.building,
        r.unit,
        o.name as owner_name,
        '同一房号同日多次补办: ' || cr.warning_flags as description,
        cr.reported_at as anomaly_time,
        u1.real_name as handler_name
      FROM card_reissues cr
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      LEFT JOIN users u1 ON cr.reported_by = u1.id
      WHERE cr.warning_flags IS NOT NULL AND cr.status != 'cancelled'
        AND DATE(cr.reported_at) >= ? AND DATE(cr.reported_at) <= ?
    )
    UNION ALL
    (
      SELECT 
        'deposit_no_refund' as anomaly_type,
        dr.id as source_id,
        dr.handled_at as event_time,
        cr.old_card_id as card_id,
        oc.card_number,
        r.room_number,
        r.building,
        r.unit,
        o.name as owner_name,
        '押金未退还: ' || COALESCE(dr.notes, '') as description,
        dr.handled_at as anomaly_time,
        u.real_name as handler_name
      FROM deposit_records dr
      JOIN card_reissues cr ON dr.reissue_id = cr.id
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      LEFT JOIN users u ON dr.handler = u.id
      WHERE dr.type = 'refund' AND dr.amount = 0
        AND DATE(dr.handled_at) >= ? AND DATE(dr.handled_at) <= ?
    )
    UNION ALL
    (
      SELECT 
        'cancelled_after_stop' as anomaly_type,
        cr.id as source_id,
        cr.completed_at as event_time,
        cr.old_card_id as card_id,
        oc.card_number,
        r.room_number,
        r.building,
        r.unit,
        o.name as owner_name,
        '旧卡停用后取消补办' as description,
        cr.completed_at as anomaly_time,
        null as handler_name
      FROM card_reissues cr
      JOIN access_cards oc ON cr.old_card_id = oc.id
      JOIN rooms r ON cr.room_id = r.id
      JOIN owners o ON cr.owner_id = o.id
      WHERE cr.status = 'cancelled' AND cr.stopped_at IS NOT NULL
        AND DATE(cr.completed_at) >= ? AND DATE(cr.completed_at) <= ?
    )
    ORDER BY anomaly_time DESC
  `).all('2024-01-01','2099-12-31','2024-01-01','2099-12-31','2024-01-01','2099-12-31','2024-01-01','2099-12-31');
  console.log('Rows:', anomalies.length);
  console.log(JSON.stringify(anomalies, null, 2));
} catch(e) {
  console.log('Error code:', e.code);
  console.log('Error msg:', e.message);
  console.log(e);
}
