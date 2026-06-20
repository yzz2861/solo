import { dbHelper, getDatabase } from '../database';
import { Patient, Company, Staff, StaffRole, ReportBatch, ReportStatus, Authorization, AuthStatus, AuthorizationRevoke, PickupRecord, PickupMethod, MailRecord, MailStatus, ExceptionLog, PaginationParams, PaginatedResult } from '../types';

export function execInTransaction<T>(fn: () => T): T {
  const db = getDatabase();
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    dbHelper.save();
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

export class PatientRepository {
  static create(data: Omit<Patient, 'id' | 'created_at'>): Patient {
    const result = dbHelper.run(
      `INSERT INTO patients (name, id_card_no, phone) VALUES (?, ?, ?)`,
      [data.name, data.id_card_no, data.phone]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): Patient | null {
    return dbHelper.getOne<Patient>('SELECT * FROM patients WHERE id = ?', [id]);
  }

  static findByIdCard(idCardNo: string): Patient | null {
    return dbHelper.getOne<Patient>('SELECT * FROM patients WHERE id_card_no = ?', [idCardNo]);
  }
}

export class CompanyRepository {
  static create(data: Omit<Company, 'id' | 'created_at'>): Company {
    const result = dbHelper.run(
      `INSERT INTO companies (name, contact_person, contact_phone) VALUES (?, ?, ?)`,
      [data.name, data.contact_person, data.contact_phone]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): Company | null {
    return dbHelper.getOne<Company>('SELECT * FROM companies WHERE id = ?', [id]);
  }

  static findByName(name: string): Company | null {
    return dbHelper.getOne<Company>('SELECT * FROM companies WHERE name = ?', [name]);
  }
}

export class StaffRepository {
  static create(data: Omit<Staff, 'id' | 'created_at'>): Staff {
    const result = dbHelper.run(
      `INSERT INTO staff (name, role, employee_no) VALUES (?, ?, ?)`,
      [data.name, data.role, data.employee_no]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): Staff | null {
    return dbHelper.getOne<Staff>('SELECT * FROM staff WHERE id = ?', [id]);
  }

  static findByEmployeeNo(employeeNo: string): Staff | null {
    return dbHelper.getOne<Staff>('SELECT * FROM staff WHERE employee_no = ?', [employeeNo]);
  }
}

function convertReportBatch(row: any): ReportBatch {
  return { ...row, is_group: !!row.is_group } as ReportBatch;
}

export class ReportBatchRepository {
  static create(data: Omit<ReportBatch, 'id' | 'created_at' | 'updated_at'>): ReportBatch {
    const isGroup = data.is_group ? 1 : 0;
    const result = dbHelper.run(
      `INSERT INTO report_batches (batch_no, patient_id, patient_name, patient_id_card_no, is_group, company_id, company_name, status, report_ready_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.batch_no, data.patient_id, data.patient_name, data.patient_id_card_no,
        isGroup, data.company_id, data.company_name, data.status, data.report_ready_at]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): ReportBatch | null {
    const row = dbHelper.getOne<any>('SELECT * FROM report_batches WHERE id = ?', [id]);
    return row ? convertReportBatch(row) : null;
  }

  static findByBatchNo(batchNo: string): ReportBatch | null {
    const row = dbHelper.getOne<any>('SELECT * FROM report_batches WHERE batch_no = ?', [batchNo]);
    return row ? convertReportBatch(row) : null;
  }

  static updateStatus(id: number, status: ReportStatus): void {
    dbHelper.run(
      `UPDATE report_batches SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [status, id]
    );
  }

  static findReadyForPickup(params: PaginationParams & { date?: string; company_id?: number }): PaginatedResult<ReportBatch> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = "status = 'ready'";
    const args: any[] = [];

    if (params.date) {
      where += " AND date(report_ready_at) = ?";
      args.push(params.date);
    }
    if (params.company_id) {
      where += " AND company_id = ?";
      args.push(params.company_id);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM report_batches WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const rows = dbHelper.getAll<any>(
      `SELECT * FROM report_batches WHERE ${where} ORDER BY report_ready_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return {
      list: rows.map(convertReportBatch),
      total, page, page_size: pageSize
    };
  }

  static findGroupBatches(companyId: number, params: PaginationParams): PaginatedResult<ReportBatch> {
    const page = params.page || 1;
    const pageSize = params.page_size || 50;
    const offset = (page - 1) * pageSize;

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM report_batches WHERE company_id = ?`, [companyId]);
    const total = totalRow ? Number(totalRow.c) : 0;

    const rows = dbHelper.getAll<any>(
      `SELECT * FROM report_batches WHERE company_id = ? ORDER BY report_ready_at DESC LIMIT ? OFFSET ?`,
      [companyId, pageSize, offset]
    );

    return {
      list: rows.map(convertReportBatch),
      total, page, page_size: pageSize
    };
  }
}

export class AuthorizationRepository {
  static create(data: Omit<Authorization, 'id' | 'created_at' | 'updated_at'>): Authorization {
    const result = dbHelper.run(
      `INSERT INTO authorizations (report_batch_id, batch_no, pickup_method, authorized_type,
        authorized_person_name, authorized_person_id_card, authorized_person_phone,
        authorization_material, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.report_batch_id, data.batch_no, data.pickup_method, data.authorized_type,
        data.authorized_person_name, data.authorized_person_id_card, data.authorized_person_phone,
        data.authorization_material, data.status, data.created_by, data.created_by_name]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): Authorization | null {
    return dbHelper.getOne<Authorization>('SELECT * FROM authorizations WHERE id = ?', [id]);
  }

  static findActiveByReportBatchId(reportBatchId: number): Authorization | null {
    return dbHelper.getOne<Authorization>(
      `SELECT * FROM authorizations WHERE report_batch_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
      [reportBatchId]
    );
  }

  static findByReportBatchId(reportBatchId: number): Authorization[] {
    return dbHelper.getAll<Authorization>(
      `SELECT * FROM authorizations WHERE report_batch_id = ? ORDER BY id DESC`,
      [reportBatchId]
    );
  }

  static updateStatus(id: number, status: AuthStatus): void {
    dbHelper.run(
      `UPDATE authorizations SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [status, id]
    );
  }

  static list(params: PaginationParams & { status?: AuthStatus; pickup_method?: PickupMethod; start_date?: string; end_date?: string }): PaginatedResult<Authorization> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const args: any[] = [];

    if (params.status) {
      where += ' AND status = ?';
      args.push(params.status);
    }
    if (params.pickup_method) {
      where += ' AND pickup_method = ?';
      args.push(params.pickup_method);
    }
    if (params.start_date) {
      where += ' AND date(created_at) >= ?';
      args.push(params.start_date);
    }
    if (params.end_date) {
      where += ' AND date(created_at) <= ?';
      args.push(params.end_date);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM authorizations WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const list = dbHelper.getAll<Authorization>(
      `SELECT * FROM authorizations WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total, page, page_size: pageSize };
  }
}

export class AuthorizationRevokeRepository {
  static create(data: Omit<AuthorizationRevoke, 'id' | 'revoked_at'>): AuthorizationRevoke {
    const result = dbHelper.run(
      `INSERT INTO authorization_revokes (authorization_id, revoked_by, revoked_by_name, reason)
       VALUES (?, ?, ?, ?)`,
      [data.authorization_id, data.revoked_by, data.revoked_by_name, data.reason]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): AuthorizationRevoke | null {
    return dbHelper.getOne<AuthorizationRevoke>('SELECT * FROM authorization_revokes WHERE id = ?', [id]);
  }

  static findByAuthorizationId(authorizationId: number): AuthorizationRevoke | null {
    return dbHelper.getOne<AuthorizationRevoke>(
      `SELECT * FROM authorization_revokes WHERE authorization_id = ? ORDER BY id DESC LIMIT 1`,
      [authorizationId]
    );
  }

  static list(params: PaginationParams & { start_date?: string; end_date?: string }): PaginatedResult<AuthorizationRevoke> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const args: any[] = [];

    if (params.start_date) {
      where += ' AND date(revoked_at) >= ?';
      args.push(params.start_date);
    }
    if (params.end_date) {
      where += ' AND date(revoked_at) <= ?';
      args.push(params.end_date);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM authorization_revokes WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const list = dbHelper.getAll<AuthorizationRevoke>(
      `SELECT * FROM authorization_revokes WHERE ${where} ORDER BY revoked_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total, page, page_size: pageSize };
  }
}

export class PickupRecordRepository {
  static create(data: Omit<PickupRecord, 'id' | 'picked_up_at'>): PickupRecord {
    const result = dbHelper.run(
      `INSERT INTO pickup_records (report_batch_id, batch_no, authorization_id, pickup_method,
        pickup_person_name, pickup_person_id_card, picked_up_by, picked_up_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.report_batch_id, data.batch_no, data.authorization_id, data.pickup_method,
        data.pickup_person_name, data.pickup_person_id_card, data.picked_up_by, data.picked_up_by_name]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): PickupRecord | null {
    return dbHelper.getOne<PickupRecord>('SELECT * FROM pickup_records WHERE id = ?', [id]);
  }

  static findByReportBatchId(reportBatchId: number): PickupRecord | null {
    return dbHelper.getOne<PickupRecord>(
      `SELECT * FROM pickup_records WHERE report_batch_id = ? ORDER BY id DESC LIMIT 1`,
      [reportBatchId]
    );
  }

  static list(params: PaginationParams & { date?: string; start_date?: string; end_date?: string; pickup_method?: PickupMethod }): PaginatedResult<PickupRecord> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const args: any[] = [];

    if (params.date) {
      where += ' AND date(picked_up_at) = ?';
      args.push(params.date);
    }
    if (params.start_date) {
      where += ' AND date(picked_up_at) >= ?';
      args.push(params.start_date);
    }
    if (params.end_date) {
      where += ' AND date(picked_up_at) <= ?';
      args.push(params.end_date);
    }
    if (params.pickup_method) {
      where += ' AND pickup_method = ?';
      args.push(params.pickup_method);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM pickup_records WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const list = dbHelper.getAll<PickupRecord>(
      `SELECT * FROM pickup_records WHERE ${where} ORDER BY picked_up_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total, page, page_size: pageSize };
  }
}

export class MailRecordRepository {
  static create(data: Omit<MailRecord, 'id' | 'mailed_at' | 'updated_at' | 'delivered_at'> & { delivered_at?: string | null }): MailRecord {
    const result = dbHelper.run(
      `INSERT INTO mail_records (report_batch_id, batch_no, receiver_name, receiver_phone, receiver_address,
        courier_company, tracking_no, status, mailed_by, mailed_by_name, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.report_batch_id, data.batch_no, data.receiver_name, data.receiver_phone, data.receiver_address,
        data.courier_company, data.tracking_no, data.status, data.mailed_by, data.mailed_by_name, data.delivered_at ?? null]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): MailRecord | null {
    return dbHelper.getOne<MailRecord>('SELECT * FROM mail_records WHERE id = ?', [id]);
  }

  static findByReportBatchId(reportBatchId: number): MailRecord | null {
    return dbHelper.getOne<MailRecord>(
      `SELECT * FROM mail_records WHERE report_batch_id = ? ORDER BY id DESC LIMIT 1`,
      [reportBatchId]
    );
  }

  static findByTrackingNo(trackingNo: string): MailRecord | null {
    return dbHelper.getOne<MailRecord>('SELECT * FROM mail_records WHERE tracking_no = ?', [trackingNo]);
  }

  static updateStatus(id: number, status: MailStatus, deliveredAt?: string): void {
    if (deliveredAt) {
      dbHelper.run(
        `UPDATE mail_records SET status = ?, delivered_at = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [status, deliveredAt, id]
      );
    } else {
      dbHelper.run(
        `UPDATE mail_records SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [status, id]
      );
    }
  }

  static list(params: PaginationParams & { status?: MailStatus; start_date?: string; end_date?: string; batch_no?: string }): PaginatedResult<MailRecord> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const args: any[] = [];

    if (params.status) {
      where += ' AND status = ?';
      args.push(params.status);
    }
    if (params.start_date) {
      where += ' AND date(mailed_at) >= ?';
      args.push(params.start_date);
    }
    if (params.end_date) {
      where += ' AND date(mailed_at) <= ?';
      args.push(params.end_date);
    }
    if (params.batch_no) {
      where += ' AND batch_no = ?';
      args.push(params.batch_no);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM mail_records WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const list = dbHelper.getAll<MailRecord>(
      `SELECT * FROM mail_records WHERE ${where} ORDER BY mailed_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total, page, page_size: pageSize };
  }
}

export class ExceptionLogRepository {
  static create(data: Omit<ExceptionLog, 'id' | 'created_at'>): ExceptionLog {
    const result = dbHelper.run(
      `INSERT INTO exception_logs (report_batch_id, batch_no, attempt_person_name, attempt_person_id_card,
        attempt_type, intercepted_by, intercepted_by_name, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.report_batch_id, data.batch_no, data.attempt_person_name, data.attempt_person_id_card,
        data.attempt_type, data.intercepted_by, data.intercepted_by_name, data.reason]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  static findById(id: number): ExceptionLog | null {
    return dbHelper.getOne<ExceptionLog>('SELECT * FROM exception_logs WHERE id = ?', [id]);
  }

  static list(params: PaginationParams & { start_date?: string; end_date?: string; attempt_type?: string }): PaginatedResult<ExceptionLog> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const args: any[] = [];

    if (params.start_date) {
      where += ' AND date(created_at) >= ?';
      args.push(params.start_date);
    }
    if (params.end_date) {
      where += ' AND date(created_at) <= ?';
      args.push(params.end_date);
    }
    if (params.attempt_type) {
      where += ' AND attempt_type = ?';
      args.push(params.attempt_type);
    }

    const totalRow = dbHelper.getOne<any>(`SELECT COUNT(*) as c FROM exception_logs WHERE ${where}`, args);
    const total = totalRow ? Number(totalRow.c) : 0;

    const list = dbHelper.getAll<ExceptionLog>(
      `SELECT * FROM exception_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total, page, page_size: pageSize };
  }
}
