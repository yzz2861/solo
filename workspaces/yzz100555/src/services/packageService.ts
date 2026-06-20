import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import {
  CoursePackage,
  FreezeRecord,
  ConsumptionRecord,
  BalanceLedger,
  ExceptionAdjustment,
  FreezePackageRequest,
  UnfreezePackageRequest,
  ConsumeLessonRequest,
  AdjustBalanceRequest,
  ChangeType,
  RefRecordType,
  BusinessError,
  Student,
  Course,
} from './types';
import { getDb } from './database';

function parseDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new BusinessError(`无效日期格式: ${s}`, 'INVALID_DATE');
  return d;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isDateInRange(dateStr: string, startStr: string, endStr?: string): boolean {
  const d = parseDate(dateStr).getTime();
  const start = parseDate(startStr).getTime();
  if (d < start) return false;
  if (endStr) {
    const end = parseDate(endStr).getTime();
    if (d > end) return false;
  }
  return true;
}

export class PackageService {
  constructor(private db: Database.Database = getDb()) {}

  createStudent(name: string, parent_phone?: string, class_teacher_id?: string): Student {
    const id = uuid();
    this.db.prepare(`INSERT INTO students (id, name, parent_phone, class_teacher_id) VALUES (?, ?, ?, ?)`).run(
      id, name, parent_phone ?? null, class_teacher_id ?? null,
    );
    return this.db.prepare(`SELECT * FROM students WHERE id = ?`).get(id) as Student;
  }

  createCourse(name: string, subject: string, duration_minutes = 60): Course {
    const id = uuid();
    this.db.prepare(`INSERT INTO courses (id, name, subject, duration_minutes) VALUES (?, ?, ?, ?)`).run(
      id, name, subject, duration_minutes,
    );
    return this.db.prepare(`SELECT * FROM courses WHERE id = ?`).get(id) as Course;
  }

  createPackage(
    studentId: string,
    courseId: string,
    name: string,
    totalLessons: number,
    purchaseDate: string,
    expireDate: string,
  ): CoursePackage {
    const id = uuid();
    const tx = this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO course_packages (id, student_id, course_id, name, total_lessons, remaining_lessons, purchase_date, expire_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      ).run(id, studentId, courseId, name, totalLessons, totalLessons, purchaseDate, expireDate);

      const ledgerId = uuid();
      this.db.prepare(
        `INSERT INTO balance_ledger (id, package_id, student_id, change_type, change_amount, balance_after, description, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(ledgerId, id, studentId, 'purchase' as ChangeType, totalLessons, totalLessons, `购买课包：${name}（共${totalLessons}课时）`, 'system');
    });
    tx();
    return this.db.prepare(`SELECT * FROM course_packages WHERE id = ?`).get(id) as CoursePackage;
  }

  getPackage(packageId: string): CoursePackage {
    const pkg = this.db.prepare(`SELECT * FROM course_packages WHERE id = ?`).get(packageId) as CoursePackage | undefined;
    if (!pkg) throw new BusinessError(`课包不存在: ${packageId}`, 'PACKAGE_NOT_FOUND');
    return pkg;
  }

  isPackageFrozenOnDate(packageId: string, dateStr: string): FreezeRecord | null {
    const freezes = this.db.prepare(
      `SELECT * FROM freeze_records WHERE package_id = ? AND status = 'frozen'`,
    ).all(packageId) as FreezeRecord[];
    for (const f of freezes) {
      if (isDateInRange(dateStr, f.freeze_date, f.unfreeze_date)) return f;
    }
    return null;
  }

  isPackageExpired(pkg: CoursePackage): boolean {
    return parseDate(pkg.expire_date) < new Date(new Date().toDateString());
  }

  freezePackage(req: FreezePackageRequest): FreezeRecord {
    const pkg = this.getPackage(req.package_id);
    parseDate(req.freeze_date);
    if (req.unfreeze_date) {
      parseDate(req.unfreeze_date);
      if (parseDate(req.unfreeze_date) < parseDate(req.freeze_date)) {
        throw new BusinessError('解冻日期不能早于冻结日期', 'FREEZE_DATE_INVALID');
      }
    }

    const overlapped = this.db.prepare(
      `SELECT * FROM freeze_records
       WHERE package_id = ? AND status = 'frozen'
         AND ((unfreeze_date IS NULL) OR (unfreeze_date >= ?))
         AND freeze_date <= ?`,
    ).all(req.package_id, req.freeze_date, req.unfreeze_date ?? '9999-12-31') as FreezeRecord[];
    if (overlapped.length > 0) {
      throw new BusinessError('存在时间重叠的冻结记录，无法重复冻结', 'FREEZE_OVERLAP');
    }

    const freezeId = uuid();
    const tx = this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO freeze_records (id, package_id, student_id, freeze_date, unfreeze_date, reason, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'frozen', ?)`,
      ).run(freezeId, pkg.id, pkg.student_id, req.freeze_date, req.unfreeze_date ?? null, req.reason, req.operator);

      const ledgerId = uuid();
      this.db.prepare(
        `INSERT INTO balance_ledger (id, package_id, student_id, change_type, change_amount, balance_after, ref_record_id, ref_record_type, description, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ledgerId, pkg.id, pkg.student_id, 'freeze' as ChangeType, 0, pkg.remaining_lessons,
        freezeId, 'freeze' as RefRecordType,
        `冻结课包：${req.reason}（${req.freeze_date}${req.unfreeze_date ? ' ~ ' + req.unfreeze_date : ' 起'}）`,
        req.operator,
      );
    });
    tx();
    return this.db.prepare(`SELECT * FROM freeze_records WHERE id = ?`).get(freezeId) as FreezeRecord;
  }

  unfreezePackage(req: UnfreezePackageRequest): FreezeRecord {
    const freeze = this.db.prepare(`SELECT * FROM freeze_records WHERE id = ?`).get(req.freeze_id) as FreezeRecord | undefined;
    if (!freeze) throw new BusinessError(`冻结记录不存在: ${req.freeze_id}`, 'FREEZE_NOT_FOUND');
    if (freeze.status === 'unfrozen') throw new BusinessError('该冻结记录已经解冻', 'ALREADY_UNFROZEN');

    const pkg = this.getPackage(freeze.package_id);
    parseDate(req.unfreeze_date);

    const expired = this.isPackageExpired(pkg);
    const isUnfreezeAfterExpire = parseDate(req.unfreeze_date) > parseDate(pkg.expire_date);

    if (expired || isUnfreezeAfterExpire) {
      if (!req.expired_extend_reason) {
        throw new BusinessError(
          '课包已过期或解冻日期超过有效期，必须提供过期课包解冻原因',
          'EXPIRED_UNFREEZE_REASON_REQUIRED',
        );
      }
    }

    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db.prepare(
        `UPDATE freeze_records
         SET status = 'unfrozen', unfreeze_date = ?, unfreeze_reason = ?, unfrozen_by = ?, unfrozen_at = ?
         WHERE id = ?`,
      ).run(req.unfreeze_date, req.unfreeze_reason + (req.expired_extend_reason ? `；过期解冻原因：${req.expired_extend_reason}` : ''), req.operator, now, req.freeze_id);

      const ledgerId = uuid();
      this.db.prepare(
        `INSERT INTO balance_ledger (id, package_id, student_id, change_type, change_amount, balance_after, ref_record_id, ref_record_type, description, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ledgerId, pkg.id, pkg.student_id, 'unfreeze' as ChangeType, 0, pkg.remaining_lessons,
        freeze.id, 'unfreeze' as RefRecordType,
        `解冻课包：${req.unfreeze_reason}${req.expired_extend_reason ? `（过期特殊解冻：${req.expired_extend_reason}）` : ''}`,
        req.operator,
      );
    });
    tx();
    return this.db.prepare(`SELECT * FROM freeze_records WHERE id = ?`).get(req.freeze_id) as FreezeRecord;
  }

  consumeLesson(req: ConsumeLessonRequest): { record: ConsumptionRecord; duplicated: boolean } {
    const pkg = this.getPackage(req.package_id);
    parseDate(req.lesson_date);
    const lessons = req.lessons_consumed ?? 1;
    if (lessons <= 0) throw new BusinessError('消课数量必须大于0', 'INVALID_CONSUME_AMOUNT');

    const existing = this.db.prepare(
      `SELECT * FROM consumption_records WHERE schedule_id = ? AND package_id = ?`,
    ).get(req.schedule_id, req.package_id) as ConsumptionRecord | undefined;
    if (existing) {
      return { record: existing, duplicated: true };
    }

    const frozen = this.isPackageFrozenOnDate(req.package_id, req.lesson_date);
    if (frozen) {
      throw new BusinessError(
        `上课日期 ${req.lesson_date} 在冻结期内（${frozen.freeze_date}${frozen.unfreeze_date ? ' ~ ' + frozen.unfreeze_date : ''}），冻结原因：${frozen.reason}`,
        'IN_FREEZE_PERIOD',
      );
    }

    if (pkg.remaining_lessons < lessons) {
      throw new BusinessError(
        `余额不足：当前剩余 ${pkg.remaining_lessons} 课时，需要扣除 ${lessons} 课时`,
        'INSUFFICIENT_BALANCE',
      );
    }

    const recordId = uuid();
    const newBalance = pkg.remaining_lessons - lessons;
    const course = this.db.prepare(`SELECT * FROM courses WHERE id = ?`).get(pkg.course_id) as Course;

    const tx = this.db.transaction(() => {
      this.db.prepare(
        `INSERT INTO consumption_records (id, package_id, student_id, course_id, schedule_id, lesson_date, lessons_consumed, teacher_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(recordId, pkg.id, pkg.student_id, pkg.course_id, req.schedule_id, req.lesson_date, lessons, req.teacher_id ?? null, req.note ?? null);

      const newStatus = newBalance <= 0 ? 'exhausted' : pkg.status;
      this.db.prepare(
        `UPDATE course_packages SET remaining_lessons = ?, status = ? WHERE id = ?`,
      ).run(newBalance, newStatus, pkg.id);

      const ledgerId = uuid();
      this.db.prepare(
        `INSERT INTO balance_ledger (id, package_id, student_id, change_type, change_amount, balance_after, ref_record_id, ref_record_type, description, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ledgerId, pkg.id, pkg.student_id, 'consume' as ChangeType, -lessons, newBalance,
        recordId, 'consumption' as RefRecordType,
        `消课：${course?.name ?? '课程'} - ${req.lesson_date}（排课ID: ${req.schedule_id}），扣${lessons}课时`,
        req.operator,
      );
    });
    tx();
    return {
      record: this.db.prepare(`SELECT * FROM consumption_records WHERE id = ?`).get(recordId) as ConsumptionRecord,
      duplicated: false,
    };
  }

  adjustBalance(req: AdjustBalanceRequest): ExceptionAdjustment {
    const pkg = this.getPackage(req.package_id);
    if (req.adjustment === 0) throw new BusinessError('调整金额不能为0', 'INVALID_ADJUSTMENT');

    const newBalance = pkg.remaining_lessons + req.adjustment;
    if (newBalance < 0) throw new BusinessError('调整后余额不能为负数', 'ADJUSTMENT_NEGATIVE_BALANCE');

    const adjustId = uuid();
    const tx = this.db.transaction(() => {
      const ledgerId = uuid();
      this.db.prepare(
        `INSERT INTO balance_ledger (id, package_id, student_id, change_type, change_amount, balance_after, ref_record_id, ref_record_type, description, operator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ledgerId, pkg.id, pkg.student_id, 'adjust' as ChangeType, req.adjustment, newBalance,
        adjustId, 'exception_adjustment' as RefRecordType,
        `异常调整：${req.adjustment > 0 ? '+' : ''}${req.adjustment} 课时，原因：${req.reason}（审批人：${req.approved_by}）`,
        req.operator,
      );

      const newStatus = newBalance <= 0 ? 'exhausted' : pkg.status === 'exhausted' ? 'active' : pkg.status;
      this.db.prepare(
        `UPDATE course_packages SET remaining_lessons = ?, status = ? WHERE id = ?`,
      ).run(newBalance, newStatus, pkg.id);

      this.db.prepare(
        `INSERT INTO exception_adjustments (id, package_id, student_id, adjustment, reason, approved_by, ledger_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(adjustId, pkg.id, pkg.student_id, req.adjustment, req.reason, req.approved_by, ledgerId);
    });
    tx();
    return this.db.prepare(`SELECT * FROM exception_adjustments WHERE id = ?`).get(adjustId) as ExceptionAdjustment;
  }

  getBalance(packageId: string): { package: CoursePackage; active_freeze?: FreezeRecord } {
    const pkg = this.getPackage(packageId);
    const activeFreeze = this.isPackageFrozenOnDate(packageId, dateOnly(new Date()));
    return { package: pkg, active_freeze: activeFreeze ?? undefined };
  }

  getHistory(studentId: string, packageId?: string, startDate?: string, endDate?: string): BalanceLedger[] {
    let sql = `SELECT * FROM balance_ledger WHERE student_id = ?`;
    const params: any[] = [studentId];
    if (packageId) { sql += ` AND package_id = ?`; params.push(packageId); }
    if (startDate) { sql += ` AND date(created_at) >= ?`; params.push(startDate); }
    if (endDate) { sql += ` AND date(created_at) <= ?`; params.push(endDate); }
    sql += ` ORDER BY created_at DESC`;
    return this.db.prepare(sql).all(...params) as BalanceLedger[];
  }

  getLedgerDetail(ledgerId: string): {
    ledger: BalanceLedger;
    freeze?: FreezeRecord;
    consumption?: ConsumptionRecord & { course_name?: string };
    adjustment?: ExceptionAdjustment;
    package?: CoursePackage;
    student?: Student;
  } {
    const ledger = this.db.prepare(`SELECT * FROM balance_ledger WHERE id = ?`).get(ledgerId) as BalanceLedger | undefined;
    if (!ledger) throw new BusinessError(`流水记录不存在: ${ledgerId}`, 'LEDGER_NOT_FOUND');

    const result: any = { ledger };
    result.student = this.db.prepare(`SELECT * FROM students WHERE id = ?`).get(ledger.student_id) as Student;
    result.package = this.db.prepare(`SELECT * FROM course_packages WHERE id = ?`).get(ledger.package_id) as CoursePackage;

    if (ledger.ref_record_type === 'freeze' || ledger.ref_record_type === 'unfreeze') {
      result.freeze = this.db.prepare(`SELECT * FROM freeze_records WHERE id = ?`).get(ledger.ref_record_id) as FreezeRecord | undefined;
    } else if (ledger.ref_record_type === 'consumption') {
      const cr = this.db.prepare(`SELECT * FROM consumption_records WHERE id = ?`).get(ledger.ref_record_id) as ConsumptionRecord | undefined;
      if (cr) {
        const course = this.db.prepare(`SELECT * FROM courses WHERE id = ?`).get(cr.course_id) as Course | undefined;
        result.consumption = { ...cr, course_name: course?.name };
      }
    } else if (ledger.ref_record_type === 'exception_adjustment') {
      result.adjustment = this.db.prepare(`SELECT * FROM exception_adjustments WHERE id = ?`).get(ledger.ref_record_id) as ExceptionAdjustment | undefined;
    }
    return result;
  }

  getAvailableStudentsThisWeek(teacherId?: string): {
    student: Student;
    package: CoursePackage;
    course: Course;
    available_dates: string[];
    freeze_notes: string[];
  }[] {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(dateOnly(d));
    }

    const sql = teacherId
      ? `SELECT cp.* FROM course_packages cp
         JOIN students s ON cp.student_id = s.id
         WHERE s.class_teacher_id = ? AND cp.remaining_lessons > 0 AND cp.status = 'active'`
      : `SELECT * FROM course_packages WHERE remaining_lessons > 0 AND status = 'active'`;
    const pkgs = (teacherId ? this.db.prepare(sql).all(teacherId) : this.db.prepare(sql).all()) as CoursePackage[];

    const results: any[] = [];
    for (const pkg of pkgs) {
      const freezes = this.db.prepare(
        `SELECT * FROM freeze_records WHERE package_id = ? AND status = 'frozen'`,
      ).all(pkg.id) as FreezeRecord[];

      const availableDates: string[] = [];
      const freezeNotes: string[] = [];

      for (const d of weekDates) {
        let blocked = false;
        for (const f of freezes) {
          if (isDateInRange(d, f.freeze_date, f.unfreeze_date)) {
            blocked = true;
            freezeNotes.push(`${d} 冻结中：${f.reason}（${f.freeze_date}${f.unfreeze_date ? '~' + f.unfreeze_date : ''}）`);
            break;
          }
        }
        if (!blocked) availableDates.push(d);
      }

      if (availableDates.length > 0) {
        const student = this.db.prepare(`SELECT * FROM students WHERE id = ?`).get(pkg.student_id) as Student;
        const course = this.db.prepare(`SELECT * FROM courses WHERE id = ?`).get(pkg.course_id) as Course;
        results.push({ student, package: pkg, course, available_dates: availableDates, freeze_notes: freezeNotes });
      }
    }
    return results;
  }

  getFreezeRecords(params: { startDate?: string; endDate?: string; status?: string }): FreezeRecord[] {
    let sql = `SELECT * FROM freeze_records WHERE 1=1`;
    const p: any[] = [];
    if (params.startDate) { sql += ` AND date(freeze_date) >= ?`; p.push(params.startDate); }
    if (params.endDate) { sql += ` AND date(freeze_date) <= ?`; p.push(params.endDate); }
    if (params.status) { sql += ` AND status = ?`; p.push(params.status); }
    sql += ` ORDER BY freeze_date DESC`;
    return this.db.prepare(sql).all(...p) as FreezeRecord[];
  }

  getConsumptionRecords(params: { startDate?: string; endDate?: string }): ConsumptionRecord[] {
    let sql = `SELECT * FROM consumption_records WHERE 1=1`;
    const p: any[] = [];
    if (params.startDate) { sql += ` AND date(lesson_date) >= ?`; p.push(params.startDate); }
    if (params.endDate) { sql += ` AND date(lesson_date) <= ?`; p.push(params.endDate); }
    sql += ` ORDER BY lesson_date DESC`;
    return this.db.prepare(sql).all(...p) as ConsumptionRecord[];
  }

  getExceptionAdjustments(params: { startDate?: string; endDate?: string }): ExceptionAdjustment[] {
    let sql = `SELECT * FROM exception_adjustments WHERE 1=1`;
    const p: any[] = [];
    if (params.startDate) { sql += ` AND date(created_at) >= ?`; p.push(params.startDate); }
    if (params.endDate) { sql += ` AND date(created_at) <= ?`; p.push(params.endDate); }
    sql += ` ORDER BY created_at DESC`;
    return this.db.prepare(sql).all(...p) as ExceptionAdjustment[];
  }
}
