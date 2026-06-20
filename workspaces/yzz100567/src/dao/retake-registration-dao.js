const BaseDao = require('./base-dao');

function generateRegistrationNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RT${dateStr}${rand}`;
}

class RetakeRegistrationDao extends BaseDao {
  findByEmployeeCourseBatch(employeeId, courseId, retakeBatchId) {
    return this.get(
      `SELECT rr.* FROM retake_registrations rr
       WHERE rr.employee_id = ? AND rr.course_id = ? AND rr.retake_batch_id = ?`,
      [employeeId, courseId, retakeBatchId]
    );
  }

  findByEmployeeAndCourse(employeeId, courseId) {
    return this.all(
      `SELECT rr.*, rb.batch_code, rb.batch_name, rb.exam_date,
              c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM retake_registrations rr
       JOIN retake_batches rb ON rr.retake_batch_id = rb.id
       JOIN courses c ON rr.course_id = c.id
       WHERE rr.employee_id = ? AND rr.course_id = ?
       ORDER BY rr.created_at DESC`,
      [employeeId, courseId]
    );
  }

  countRetakeAttempts(employeeId, courseId) {
    const result = this.get(
      `SELECT COUNT(*) as cnt FROM retake_registrations
       WHERE employee_id = ? AND course_id = ?
         AND registration_status NOT IN ('rejected', 'cancelled')`,
      [employeeId, courseId]
    );
    return result.cnt;
  }

  getMaxRetakeAttemptNo(employeeId, courseId) {
    const result = this.get(
      `SELECT MAX(retake_attempt_no) as max_no FROM retake_registrations
       WHERE employee_id = ? AND course_id = ?`,
      [employeeId, courseId]
    );
    return result.max_no || 0;
  }

  findById(id) {
    return this.get(
      `SELECT rr.*,
              e.employee_id as emp_code, e.name as employee_name, e.email as employee_email,
              e.department_id, d.name as department_name,
              c.course_code, c.course_name, c.pass_score, c.max_retake_count,
              rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date,
              os.score as original_score_val, os.exam_date as original_exam_date
       FROM retake_registrations rr
       JOIN employees e ON rr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN courses c ON rr.course_id = c.id
       JOIN retake_batches rb ON rr.retake_batch_id = rb.id
       JOIN original_scores os ON rr.original_score_id = os.id
       WHERE rr.id = ?`,
      [id]
    );
  }

  findByRegistrationNo(registrationNo) {
    return this.get(
      `SELECT rr.*,
              e.employee_id as emp_code, e.name as employee_name,
              c.course_code, c.course_name,
              rb.batch_code, rb.batch_name
       FROM retake_registrations rr
       JOIN employees e ON rr.employee_id = e.id
       JOIN courses c ON rr.course_id = c.id
       JOIN retake_batches rb ON rr.retake_batch_id = rb.id
       WHERE rr.registration_no = ?`,
      [registrationNo]
    );
  }

  create(data) {
    const registrationNo = generateRegistrationNo();
    const maxAttemptNo = this.getMaxRetakeAttemptNo(data.employee_id, data.course_id);
    const attemptNo = maxAttemptNo + 1;

    const stmt = this.prepare(`
      INSERT INTO retake_registrations
        (registration_no, employee_id, course_id, original_score_id, retake_batch_id,
         original_score, registration_status, retake_attempt_no)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    const result = stmt.run(
      registrationNo, data.employee_id, data.course_id, data.original_score_id,
      data.retake_batch_id, data.original_score, attemptNo
    );
    return {
      id: result.lastInsertRowid,
      registration_no: registrationNo,
      retake_attempt_no: attemptNo
    };
  }

  findPendingList(filters = {}) {
    let sql = `SELECT rr.*,
               e.employee_id as emp_code, e.name as employee_name, e.email,
               d.id as dept_id, d.name as department_name,
               c.course_code, c.course_name, c.pass_score, c.max_retake_count,
               rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date
              FROM retake_registrations rr
              JOIN employees e ON rr.employee_id = e.id
              LEFT JOIN departments d ON e.department_id = d.id
              JOIN courses c ON rr.course_id = c.id
              JOIN retake_batches rb ON rr.retake_batch_id = rb.id
              WHERE 1=1`;
    const params = [];

    if (filters.status) {
      sql += ' AND rr.registration_status = ?';
      params.push(filters.status);
    } else {
      sql += " AND rr.registration_status IN ('pending', 'approved', 'rejected')";
    }

    if (filters.retake_batch_id) {
      sql += ' AND rr.retake_batch_id = ?';
      params.push(filters.retake_batch_id);
    }
    if (filters.course_id) {
      sql += ' AND rr.course_id = ?';
      params.push(filters.course_id);
    }
    if (filters.department_id) {
      sql += ' AND e.department_id = ?';
      params.push(filters.department_id);
    }

    sql += ' ORDER BY rr.created_at DESC';
    return this.all(sql, params);
  }

  updateStatus(id, status, operator, extra = {}) {
    const fields = ['registration_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (status === 'approved') {
      fields.push('approved_by = ?');
      fields.push('approved_at = CURRENT_TIMESTAMP');
      params.push(operator);
    } else if (status === 'rejected') {
      fields.push('rejected_by = ?');
      fields.push('rejected_at = CURRENT_TIMESTAMP');
      if (extra.rejection_reason) {
        fields.push('rejection_reason = ?');
        params.push(extra.rejection_reason);
      }
      params.push(operator);
    }

    if (extra.need_offline_communication !== undefined) {
      fields.push('need_offline_communication = ?');
      params.push(extra.need_offline_communication ? 1 : 0);
    }
    if (extra.offline_communication_note) {
      fields.push('offline_communication_note = ?');
      params.push(extra.offline_communication_note);
    }

    params.push(id);
    const sql = `UPDATE retake_registrations SET ${fields.join(', ')} WHERE id = ?`;
    return this.run(sql, params);
  }

  updateFinalScore(id, finalScore, isPassed) {
    return this.run(`
      UPDATE retake_registrations
      SET final_score = ?, final_is_passed = ?,
          registration_status = 'completed',
          notified_to_assistant = 1,
          last_notified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [finalScore, isPassed ? 1 : 0, id]
    );
  }

  markNotified(ids) {
    if (!ids || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    return this.run(
      `UPDATE retake_registrations
       SET notified_to_assistant = 1, last_notified_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`,
      ids
    );
  }

  findByDepartment(departmentId, filters = {}) {
    let sql = `SELECT rr.*,
               e.employee_id as emp_code, e.name as employee_name,
               c.course_code, c.course_name, c.pass_score, c.max_retake_count,
               rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date
              FROM retake_registrations rr
              JOIN employees e ON rr.employee_id = e.id
              JOIN courses c ON rr.course_id = c.id
              JOIN retake_batches rb ON rr.retake_batch_id = rb.id
              WHERE e.department_id = ?`;
    const params = [departmentId];

    if (filters.status) {
      sql += ' AND rr.registration_status = ?';
      params.push(filters.status);
    }
    if (filters.excludeNotified) {
      sql += ' AND rr.notified_to_assistant = 0';
    }
    if (filters.notFinalPassed) {
      sql += ' AND (rr.final_is_passed IS NULL OR rr.final_is_passed = 0)';
    }

    sql += ' ORDER BY rr.created_at DESC';
    return this.all(sql, params);
  }

  findUnnotifiedByDepartment(departmentId) {
    return this.all(`
      SELECT rr.*,
             e.employee_id as emp_code, e.name as employee_name, e.email,
             c.course_code, c.course_name, c.pass_score, c.max_retake_count,
             rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date,
             os.score as original_score_val, os.exam_date as original_exam_date
      FROM retake_registrations rr
      JOIN employees e ON rr.employee_id = e.id
      JOIN courses c ON rr.course_id = c.id
      JOIN retake_batches rb ON rr.retake_batch_id = rb.id
      JOIN original_scores os ON rr.original_score_id = os.id
      WHERE e.department_id = ?
        AND rr.notified_to_assistant = 0
        AND rr.registration_status IN ('pending', 'approved')
        AND (rr.final_is_passed IS NULL OR rr.final_is_passed = 0)
      ORDER BY rr.created_at ASC`,
      [departmentId]
    );
  }

  getMonthlyExport(year, month) {
    const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

    return {
      notPassed: this.all(`
        SELECT rr.*,
               e.employee_id as emp_code, e.name as employee_name, e.email, e.phone,
               d.name as department_name,
               c.course_code, c.course_name, c.pass_score, c.max_retake_count,
               rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        JOIN courses c ON rr.course_id = c.id
        JOIN retake_batches rb ON rr.retake_batch_id = rb.id
        WHERE rr.created_at >= ? AND rr.created_at < ?
          AND (rr.final_is_passed = 0
               OR (rr.final_is_passed IS NULL AND rr.registration_status != 'rejected'))
        ORDER BY d.name, e.name, c.course_code`,
        [monthStart, monthEnd]
      ),

      retaken: this.all(`
        SELECT rr.*,
               e.employee_id as emp_code, e.name as employee_name, e.email, e.phone,
               d.name as department_name,
               c.course_code, c.course_name,
               rb.batch_code, rb.batch_name, rb.exam_date as batch_exam_date
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        JOIN courses c ON rr.course_id = c.id
        JOIN retake_batches rb ON rr.retake_batch_id = rb.id
        WHERE rr.created_at >= ? AND rr.created_at < ?
          AND rr.final_score IS NOT NULL
        ORDER BY d.name, e.name, c.course_code`,
        [monthStart, monthEnd]
      ),

      needOffline: this.all(`
        SELECT rr.*,
               e.employee_id as emp_code, e.name as employee_name, e.email, e.phone,
               d.name as department_name,
               c.course_code, c.course_name,
               rb.batch_code, rb.batch_name,
               rr.offline_communication_note
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        JOIN courses c ON rr.course_id = c.id
        JOIN retake_batches rb ON rr.retake_batch_id = rb.id
        WHERE rr.created_at >= ? AND rr.created_at < ?
          AND rr.need_offline_communication = 1
        ORDER BY d.name, e.name, c.course_code`,
        [monthStart, monthEnd]
      )
    };
  }

  getDepartmentRiskReport(departmentId) {
    return {
      summary: this.get(`
        SELECT
          COUNT(DISTINCT rr.employee_id) as affected_employees,
          COUNT(*) as total_registrations,
          SUM(CASE WHEN rr.registration_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN rr.registration_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN rr.registration_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          SUM(CASE WHEN rr.final_is_passed = 1 THEN 1 ELSE 0 END) as passed_count,
          SUM(CASE WHEN rr.final_is_passed = 0 THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN rr.final_is_passed IS NULL AND rr.registration_status != 'rejected' THEN 1 ELSE 0 END) as awaiting_count,
          SUM(CASE WHEN rr.need_offline_communication = 1 THEN 1 ELSE 0 END) as offline_count,
          MAX(rr.retake_attempt_no) as max_attempts
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        WHERE e.department_id = ?`,
        [departmentId]
      ),

      byCourse: this.all(`
        SELECT c.course_code, c.course_name, c.max_retake_count,
               COUNT(*) as total_reg,
               SUM(CASE WHEN rr.final_is_passed = 1 THEN 1 ELSE 0 END) as passed,
               SUM(CASE WHEN rr.final_is_passed = 0 THEN 1 ELSE 0 END) as failed,
               SUM(CASE WHEN rr.final_is_passed IS NULL AND rr.registration_status != 'rejected' THEN 1 ELSE 0 END) as awaiting
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        JOIN courses c ON rr.course_id = c.id
        WHERE e.department_id = ?
        GROUP BY c.id ORDER BY total_reg DESC`,
        [departmentId]
      ),

      highRiskEmployees: this.all(`
        SELECT e.employee_id, e.name, e.email,
               COUNT(rr.id) as retake_times,
               MAX(rr.retake_attempt_no) as max_attempt,
               GROUP_CONCAT(c.course_code, ', ') as courses
        FROM retake_registrations rr
        JOIN employees e ON rr.employee_id = e.id
        JOIN courses c ON rr.course_id = c.id
        WHERE e.department_id = ?
          AND (rr.final_is_passed = 0 OR rr.final_is_passed IS NULL)
          AND rr.registration_status != 'rejected'
        GROUP BY e.id
        HAVING retake_times >= 1
        ORDER BY retake_times DESC, e.name`,
        [departmentId]
      )
    };
  }
}

module.exports = new RetakeRegistrationDao();
