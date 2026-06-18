import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {
  Seat,
  Locker,
  Reservation,
  Violation,
  LostItem,
  Clearance,
  HourlySnapshot,
  User,
} from '@/types';
import { genId, todayStr, dayjs, deriveStudentId } from '@/utils';
import {
  generateSeats,
  generateLockers,
  generateViolations,
  generateLostItems,
  todayClearancePlaceholder,
  generateHourlySnapshots,
  generateRuntimeSeats,
  generateRuntimeLockers,
} from '@/data/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'study-room.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 5174;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    zone TEXT NOT NULL,
    floor INTEGER NOT NULL,
    position TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    studentId TEXT,
    studentName TEXT,
    lockerId TEXT,
    checkInAt INTEGER,
    checkOutAt INTEGER,
    reservationExpireAt INTEGER,
    tempAwayAt INTEGER,
    tempAwayExpireAt INTEGER,
    tempAwayExtensionsLeft INTEGER DEFAULT 0,
    totalMinutes INTEGER DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS lockers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    zone TEXT NOT NULL,
    floor INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    seatId TEXT,
    studentId TEXT,
    maintenanceNote TEXT
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    seatId TEXT NOT NULL,
    seatCode TEXT NOT NULL,
    lockerId TEXT,
    lockerCode TEXT,
    studentId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    studentPhone TEXT,
    status TEXT NOT NULL DEFAULT 'pending_checkin',
    reservedAt INTEGER NOT NULL,
    checkedInAt INTEGER,
    checkedOutAt INTEGER,
    reservationExpireAt INTEGER,
    tempAwayCount INTEGER DEFAULT 0,
    totalMinutes INTEGER DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS violations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    seatId TEXT NOT NULL,
    seatCode TEXT NOT NULL,
    studentId TEXT,
    studentName TEXT,
    occurredAt INTEGER NOT NULL,
    description TEXT,
    handled INTEGER DEFAULT 0,
    handledBy TEXT,
    handledAt INTEGER
  );
  CREATE TABLE IF NOT EXISTS lost_items (
    id TEXT PRIMARY KEY,
    clearanceId TEXT,
    seatId TEXT,
    seatCode TEXT,
    studentId TEXT,
    studentName TEXT,
    type TEXT NOT NULL,
    description TEXT,
    foundAt INTEGER NOT NULL,
    status TEXT DEFAULT 'unclaimed',
    claimedBy TEXT,
    claimedAt INTEGER,
    storedLocation TEXT
  );
  CREATE TABLE IF NOT EXISTS clearances (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    startedAt INTEGER,
    completedAt INTEGER,
    operatorName TEXT,
    seatsChecked TEXT,
    lostItemsFound INTEGER DEFAULT 0,
    seatsReleased INTEGER DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS hourly_snapshots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL,
    zone TEXT NOT NULL,
    totalSeats INTEGER NOT NULL,
    inUse INTEGER NOT NULL,
    reserved INTEGER NOT NULL,
    tempAway INTEGER NOT NULL,
    available INTEGER NOT NULL,
    violation INTEGER NOT NULL,
    maintenance INTEGER NOT NULL,
    occupancyRate REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    UNIQUE(date, hour, zone)
  );
  CREATE TABLE IF NOT EXISTS event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor TEXT,
    payload TEXT,
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

function seedIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS c FROM seats').get() as { c: number };
  if (row.c > 0) return;

  const seats0 = generateSeats();
  const lockers0 = generateLockers();
  const seats = generateRuntimeSeats(seats0);
  const lockers = generateRuntimeLockers(lockers0, seats);
  const violations = generateViolations(seats);
  const clearance = todayClearancePlaceholder();
  const lostItems = generateLostItems(seats, clearance);
  const snapshots = generateHourlySnapshots(7);

  const insSeat = db.prepare(
    `INSERT INTO seats VALUES (@id,@code,@zone,@floor,@position,@status,@studentId,@studentName,@lockerId,@checkInAt,@checkOutAt,@reservationExpireAt,@tempAwayAt,@tempAwayExpireAt,@tempAwayExtensionsLeft,@totalMinutes,@notes)`,
  );
  const insLocker = db.prepare(
    `INSERT INTO lockers VALUES (@id,@code,@zone,@floor,@status,@seatId,@studentId,@maintenanceNote)`,
  );
  const insRes = db.prepare(
    `INSERT INTO reservations VALUES (@id,@seatId,@seatCode,@lockerId,@lockerCode,@studentId,@studentName,@studentPhone,@status,@reservedAt,@checkedInAt,@checkedOutAt,@reservationExpireAt,@tempAwayCount,@totalMinutes,@notes)`,
  );
  const insVio = db.prepare(
    `INSERT INTO violations VALUES (@id,@type,@seatId,@seatCode,@studentId,@studentName,@occurredAt,@description,@handled,@handledBy,@handledAt)`,
  );
  const insLost = db.prepare(
    `INSERT INTO lost_items VALUES (@id,@clearanceId,@seatId,@seatCode,@studentId,@studentName,@type,@description,@foundAt,@status,@claimedBy,@claimedAt,@storedLocation)`,
  );
  const insClear = db.prepare(
    `INSERT INTO clearances VALUES (@id,@date,@startedAt,@completedAt,@operatorName,@seatsChecked,@lostItemsFound,@seatsReleased,@notes)`,
  );
  const insSnap = db.prepare(
    `INSERT INTO hourly_snapshots VALUES (@id,@date,@hour,@zone,@totalSeats,@inUse,@reserved,@tempAway,@available,@violation,@maintenance,@occupancyRate,@timestamp)`,
  );

  const tx = db.transaction(() => {
    for (const s of seats) {
      insSeat.run({ ...s, notes: null });
    }
    for (const l of lockers) {
      insLocker.run({ ...l, maintenanceNote: null });
    }
    for (const v of violations) {
      insVio.run(v);
    }
    insClear.run({ ...clearance, completedAt: null, seatsChecked: JSON.stringify(clearance.seatsChecked), notes: null });
    for (const it of lostItems) {
      insLost.run({ ...it, status: 'unclaimed', claimedBy: null, claimedAt: null, storedLocation: null });
    }
    for (const sp of snapshots) {
      insSnap.run(sp);
    }
    db.prepare("INSERT INTO meta VALUES ('seed_version', ?)").run('1.0');
  });
  tx();
  console.log(`[api] 数据库初始化完成: ${seats.length} 座位, ${lockers.length} 储物柜`);
}

seedIfEmpty();

function logEvent(action: string, actor?: string, payload?: unknown) {
  db.prepare('INSERT INTO event_log (action, actor, payload, created) VALUES (?, ?, ?, ?)').run(
    action,
    actor ?? 'system',
    payload ? JSON.stringify(payload) : null,
    Date.now(),
  );
}

function rows<T>(stmt: Database.Statement, ...params: unknown[]): T[] {
  return stmt.all(...params) as T[];
}
function row<T>(stmt: Database.Statement, ...params: unknown[]): T | undefined {
  return stmt.get(...params) as T | undefined;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), db: DB_PATH });
});

app.get('/api/state', (_req, res) => {
  const seats = rows<Seat>(db.prepare('SELECT * FROM seats ORDER BY code'));
  const lockers = rows<Locker>(db.prepare('SELECT * FROM lockers ORDER BY code'));
  const reservations = rows<Reservation>(db.prepare('SELECT * FROM reservations ORDER BY reservedAt DESC'));
  const violations = rows<Violation>(db.prepare('SELECT * FROM violations ORDER BY occurredAt DESC'));
  const lostItems = rows<LostItem>(db.prepare('SELECT * FROM lost_items ORDER BY foundAt DESC'));
  const clearances = rows<any>(db.prepare('SELECT * FROM clearances ORDER BY date DESC')).map((c) => ({
    ...c,
    seatsChecked: c.seatsChecked ? JSON.parse(c.seatsChecked) : [],
  })) as Clearance[];
  const snapshots = rows<HourlySnapshot>(db.prepare('SELECT * FROM hourly_snapshots ORDER BY timestamp ASC'));
  res.json({ ok: true, data: { seats, lockers, reservations, violations, lostItems, clearances, snapshots } });
});

app.get('/api/seats', (_req, res) => {
  res.json({ ok: true, data: rows<Seat>(db.prepare('SELECT * FROM seats ORDER BY code')) });
});

app.get('/api/lockers', (_req, res) => {
  res.json({ ok: true, data: rows<Locker>(db.prepare('SELECT * FROM lockers ORDER BY code')) });
});

app.get('/api/reservations', (_req, res) => {
  res.json({ ok: true, data: rows<Reservation>(db.prepare('SELECT * FROM reservations ORDER BY reservedAt DESC LIMIT 200')) });
});

app.get('/api/violations', (_req, res) => {
  res.json({ ok: true, data: rows<Violation>(db.prepare('SELECT * FROM violations ORDER BY occurredAt DESC LIMIT 200')) });
});

app.post('/api/reserve', (req, res) => {
  const { seatId, studentName, studentPhone, operator } = req.body as {
    seatId?: string; studentName?: string; studentPhone?: string; operator?: string;
  };
  if (!seatId || !studentName) return res.status(400).json({ ok: false, error: '座位与学生姓名必填' });

  const name = studentName.trim();
  const sid = deriveStudentId(name);
  const active = row<any>(
    db.prepare(
      `SELECT s.code FROM seats s WHERE (s.studentId = ? OR s.studentName = ?) AND s.status IN ('reserved','in_use','temporarily_away','violation') LIMIT 1`,
    ),
    sid,
    name,
  );
  if (active) {
    return res.json({ ok: false, error: `${name} 已占用座位 ${active.code}` });
  }
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (seat.status !== 'available') return res.json({ ok: false, error: '座位不可预约' });

  const locker = row<Locker>(
    db.prepare("SELECT * FROM lockers WHERE zone = ? AND status = 'available' LIMIT 1"),
    seat.zone,
  );
  if (!locker) return res.json({ ok: false, error: `${seat.zone}区储物柜已满` });

  const now = Date.now();
  const expire = now + 30 * 60 * 1000;
  const resId = genId('res');
  const reservation: Reservation = {
    id: resId,
    seatId,
    seatCode: seat.code,
    lockerId: locker.id,
    lockerCode: locker.code,
    studentId: sid,
    studentName: name,
    studentPhone: studentPhone?.trim(),
    status: 'pending_checkin',
    reservedAt: now,
    reservationExpireAt: expire,
    tempAwayCount: 0,
    totalMinutes: 0,
  };

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET status='reserved', studentId=?, studentName=?, lockerId=?, reservationExpireAt=? WHERE id=?",
    ).run(sid, name, locker.id, expire, seatId);
    db.prepare("UPDATE lockers SET status='in_use', seatId=?, studentId=? WHERE id=?").run(seatId, sid, locker.id);
    db.prepare(
      'INSERT INTO reservations VALUES (@id,@seatId,@seatCode,@lockerId,@lockerCode,@studentId,@studentName,@studentPhone,@status,@reservedAt,@checkedInAt,@checkedOutAt,@reservationExpireAt,@tempAwayCount,@totalMinutes,@notes)',
    ).run({ ...reservation, checkedInAt: null, checkedOutAt: null, notes: null });
    logEvent('reserve', operator ?? name, reservation);
  });
  tx();

  res.json({ ok: true, data: reservation, message: `座位 ${seat.code} / 柜位 ${locker.code}` });
});

app.post('/api/checkin', (req, res) => {
  const { seatId, operator } = req.body as { seatId?: string; operator?: string };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (seat.status !== 'reserved') return res.json({ ok: false, error: '座位未处于预约状态' });

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare("UPDATE seats SET status='in_use', checkInAt=?, reservationExpireAt=NULL WHERE id=?").run(now, seatId);
    db.prepare(
      "UPDATE reservations SET status='checked_in', checkedInAt=? WHERE seatId=? AND status='pending_checkin'",
    ).run(now, seatId);
    logEvent('checkin', operator ?? 'system', { seatId, code: seat.code });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code, checkInAt: now } });
});

app.post('/api/checkout', (req, res) => {
  const { seatId, operator, reason = '正常离座' } = req.body as {
    seatId?: string; operator?: string; reason?: string;
  };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (!['in_use', 'temporarily_away', 'violation'].includes(seat.status)) {
    return res.json({ ok: false, error: '当前座位状态不可离座' });
  }

  const now = Date.now();
  const total = seat.checkInAt ? Math.max(0, Math.floor((now - seat.checkInAt) / 60000)) : 0;
  const lockerId = seat.lockerId;
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET status='available', studentId=NULL, studentName=NULL, lockerId=NULL, checkInAt=NULL, checkOutAt=?, tempAwayAt=NULL, tempAwayExpireAt=NULL, tempAwayExtensionsLeft=0, totalMinutes=? WHERE id=?",
    ).run(now, total, seatId);
    if (lockerId) {
      db.prepare("UPDATE lockers SET status='available', seatId=NULL, studentId=NULL WHERE id=?").run(lockerId);
    }
    db.prepare(
      "UPDATE reservations SET status='checked_out', checkedOutAt=?, totalMinutes=? WHERE seatId=? AND status IN ('checked_in','violation','pending_checkin')",
    ).run(now, total, seatId);
    logEvent('checkout', operator ?? 'system', { seatId, code: seat.code, total, reason });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code, totalMinutes: total } });
});

app.post('/api/temp-away', (req, res) => {
  const { seatId, operator } = req.body as { seatId?: string; operator?: string };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (seat.status !== 'in_use') return res.json({ ok: false, error: '只有使用中座位可临时离座' });

  const now = Date.now();
  const expire = now + 30 * 60 * 1000;
  const extensions = 2;
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET status='temporarily_away', tempAwayAt=?, tempAwayExpireAt=?, tempAwayExtensionsLeft=? WHERE id=?",
    ).run(now, expire, extensions, seatId);
    db.prepare(
      "UPDATE reservations SET tempAwayCount = tempAwayCount + 1 WHERE seatId=? AND status='checked_in'",
    ).run(seatId);
    logEvent('temp_away', operator ?? 'system', { seatId, code: seat.code, expire });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code, expireAt: expire } });
});

app.post('/api/extend-away', (req, res) => {
  const { seatId, operator } = req.body as { seatId?: string; operator?: string };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (seat.status !== 'temporarily_away') return res.json({ ok: false, error: '未处于临时离座状态' });
  if ((seat.tempAwayExtensionsLeft ?? 0) <= 0) return res.json({ ok: false, error: '续时次数已用完' });

  const expire = (seat.tempAwayExpireAt ?? Date.now()) + 30 * 60 * 1000;
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET tempAwayExpireAt=?, tempAwayExtensionsLeft = tempAwayExtensionsLeft - 1 WHERE id=?",
    ).run(expire, seatId);
    logEvent('extend_away', operator ?? 'system', { seatId, code: seat.code, expire });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code, expireAt: expire } });
});

app.post('/api/return', (req, res) => {
  const { seatId, operator } = req.body as { seatId?: string; operator?: string };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (!['temporarily_away', 'violation'].includes(seat.status)) {
    return res.json({ ok: false, error: '当前状态不可返回' });
  }
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET status='in_use', tempAwayAt=NULL, tempAwayExpireAt=NULL, tempAwayExtensionsLeft=0 WHERE id=?",
    ).run(seatId);
    logEvent('return', operator ?? 'system', { seatId, code: seat.code, from: seat.status });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code } });
});

app.post('/api/release', (req, res) => {
  const { seatId, operator, reason = '强制释放' } = req.body as {
    seatId?: string; operator?: string; reason?: string;
  };
  if (!seatId) return res.status(400).json({ ok: false, error: 'seatId 必传' });
  const seat = row<Seat>(db.prepare('SELECT * FROM seats WHERE id = ?'), seatId);
  if (!seat) return res.status(404).json({ ok: false, error: '座位不存在' });
  if (seat.status === 'available') return res.json({ ok: false, error: '座位已是空闲' });

  const now = Date.now();
  const total = seat.checkInAt ? Math.max(0, Math.floor((now - seat.checkInAt) / 60000)) : 0;
  const lockerId = seat.lockerId;
  const studentName = seat.studentName ?? '';
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE seats SET status='available', studentId=NULL, studentName=NULL, lockerId=NULL, checkInAt=NULL, checkOutAt=?, reservationExpireAt=NULL, tempAwayAt=NULL, tempAwayExpireAt=NULL, tempAwayExtensionsLeft=0, totalMinutes=? WHERE id=?",
    ).run(now, total, seatId);
    if (lockerId) {
      db.prepare("UPDATE lockers SET status='available', seatId=NULL, studentId=NULL WHERE id=?").run(lockerId);
    }
    db.prepare(
      "UPDATE reservations SET status='cancelled', checkedOutAt=? WHERE seatId=? AND status IN ('pending_checkin','checked_in','violation')",
    ).run(now, seatId);
    if (studentName) {
      const vId = genId('vio');
      db.prepare(
        'INSERT INTO violations VALUES (@id,@type,@seatId,@seatCode,@studentId,@studentName,@occurredAt,@description,@handled,@handledBy,@handledAt)',
      ).run({
        id: vId,
        type: 'forced_release',
        seatId,
        seatCode: seat.code,
        studentId: seat.studentId ?? null,
        studentName,
        occurredAt: now,
        description: reason,
        handled: operator ? 1 : 0,
        handledBy: operator ?? null,
        handledAt: operator ? now : null,
      });
    }
    logEvent('release', operator ?? 'system', { seatId, code: seat.code, reason });
  });
  tx();
  res.json({ ok: true, data: { seatCode: seat.code, totalMinutes: total } });
});

app.post('/api/violations/:id/handle', (req, res) => {
  const id = req.params.id;
  const { operator, action } = req.body as { operator?: string; action?: 'release' | 'return' | 'warn' };
  const v = row<Violation>(db.prepare('SELECT * FROM violations WHERE id=?'), id);
  if (!v) return res.status(404).json({ ok: false, error: '违规不存在' });
  const now = Date.now();
  db.prepare(
    "UPDATE violations SET handled=1, handledBy=?, handledAt=? WHERE id=?",
  ).run(operator ?? 'system', now, id);
  logEvent('handle_violation', operator ?? 'system', { id, action });
  res.json({ ok: true });
});

app.post('/api/sync', (req, res) => {
  const payload = req.body as {
    seats?: Seat[]; lockers?: Locker[]; reservations?: Reservation[];
    violations?: Violation[]; operator?: string;
  };
  const tx = db.transaction(() => {
    if (payload.seats?.length) {
      const stmt = db.prepare(
        `INSERT INTO seats (id,code,zone,floor,position,status,studentId,studentName,lockerId,checkInAt,checkOutAt,reservationExpireAt,tempAwayAt,tempAwayExpireAt,tempAwayExtensionsLeft,totalMinutes,notes)
         VALUES (@id,@code,@zone,@floor,@position,@status,@studentId,@studentName,@lockerId,@checkInAt,@checkOutAt,@reservationExpireAt,@tempAwayAt,@tempAwayExpireAt,@tempAwayExtensionsLeft,@totalMinutes,@notes)
         ON CONFLICT(id) DO UPDATE SET
           status=excluded.status, studentId=excluded.studentId, studentName=excluded.studentName, lockerId=excluded.lockerId,
           checkInAt=excluded.checkInAt, checkOutAt=excluded.checkOutAt, reservationExpireAt=excluded.reservationExpireAt,
           tempAwayAt=excluded.tempAwayAt, tempAwayExpireAt=excluded.tempAwayExpireAt,
           tempAwayExtensionsLeft=excluded.tempAwayExtensionsLeft, totalMinutes=excluded.totalMinutes`,
      );
      for (const s of payload.seats) stmt.run({ ...s, notes: null });
    }
    if (payload.lockers?.length) {
      const stmt = db.prepare(
        `INSERT INTO lockers (id,code,zone,floor,status,seatId,studentId,maintenanceNote)
         VALUES (@id,@code,@zone,@floor,@status,@seatId,@studentId,@maintenanceNote)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status, seatId=excluded.seatId, studentId=excluded.studentId, maintenanceNote=excluded.maintenanceNote`,
      );
      for (const l of payload.lockers) stmt.run({ ...l, maintenanceNote: l.maintenanceNote ?? null });
    }
    if (payload.reservations?.length) {
      const stmt = db.prepare(
        `INSERT INTO reservations (id,seatId,seatCode,lockerId,lockerCode,studentId,studentName,studentPhone,status,reservedAt,checkInAt,checkOutAt,reservationExpireAt,tempAwayCount,totalMinutes,notes)
         VALUES (@id,@seatId,@seatCode,@lockerId,@lockerCode,@studentId,@studentName,@studentPhone,@status,@reservedAt,@checkInAt,@checkOutAt,@reservationExpireAt,@tempAwayCount,@totalMinutes,@notes)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status, checkInAt=excluded.checkInAt, checkOutAt=excluded.checkOutAt,
           reservationExpireAt=excluded.reservationExpireAt, tempAwayCount=excluded.tempAwayCount, totalMinutes=excluded.totalMinutes`,
      );
      for (const r of payload.reservations) {
        stmt.run({ ...r, checkInAt: r.checkInAt ?? null, checkOutAt: r.checkOutAt ?? null, notes: null });
      }
    }
    if (payload.violations?.length) {
      const stmt = db.prepare(
        `INSERT INTO violations (id,type,seatId,seatCode,studentId,studentName,occurredAt,description,handled,handledBy,handledAt)
         VALUES (@id,@type,@seatId,@seatCode,@studentId,@studentName,@occurredAt,@description,@handled,@handledBy,@handledAt)
         ON CONFLICT(id) DO UPDATE SET handled=excluded.handled, handledBy=excluded.handledBy, handledAt=excluded.handledAt`,
      );
      for (const v of payload.violations) {
        stmt.run({
          ...v,
          studentId: v.studentId ?? null,
          handledBy: v.handledBy ?? null,
          handledAt: v.handledAt ?? null,
        });
      }
    }
    logEvent('sync', payload.operator ?? 'system', {
      seats: payload.seats?.length ?? 0,
      lockers: payload.lockers?.length ?? 0,
      reservations: payload.reservations?.length ?? 0,
      violations: payload.violations?.length ?? 0,
    });
  });
  tx();
  res.json({ ok: true });
});

app.get('/api/export/utilization', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT date,hour,zone,totalSeats,inUse,reserved,tempAway,available,violation,occupancyRate,timestamp
       FROM hourly_snapshots ORDER BY timestamp DESC`,
    )
    .all();
  res.json({ ok: true, data: rows });
});

app.get('/api/events', (_req, res) => {
  const data = db.prepare('SELECT * FROM event_log ORDER BY id DESC LIMIT 300').all();
  res.json({ ok: true, data });
});

app.listen(PORT, () => {
  console.log(`[api] 自习室 API 服务已启动: http://localhost:${PORT}`);
  console.log(`[api] 数据库位置: ${DB_PATH}`);
});

export default app;
