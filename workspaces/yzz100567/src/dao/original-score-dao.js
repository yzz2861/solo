const BaseDao = require('./base-dao');

class OriginalScoreDao extends BaseDao {
  findByEmployeeAndCourse(employeeId, courseId) {
    return this.all(
      `SELECT os.*, c.course_name, c.course_code, c.pass_score, c.max_retake_count
       FROM original_scores os
       JOIN courses c ON os.course_id = c.id
       WHERE os.employee_id = ? AND os.course_id = ?
       ORDER BY os.exam_date DESC`,
      [employeeId, courseId]
    );
  }

  findLatestByEmployeeAndCourse(employeeId, courseId) {
    return this.get(
      `SELECT os.*, c.course_name, c.course_code, c.pass_score, c.max_retake_count
       FROM original_scores os
       JOIN courses c ON os.course_id = c.id
       WHERE os.employee_id = ? AND os.course_id = ?
       ORDER BY os.exam_date DESC LIMIT 1`,
      [employeeId, courseId]
    );
  }

  hasPassed(employeeId, courseId) {
    const result = this.get(
      `SELECT 1 FROM original_scores
       WHERE employee_id = ? AND course_id = ? AND is_passed = 1
       LIMIT 1`,
      [employeeId, courseId]
    );
    return !!result;
  }

  findById(id) {
    return this.get(
      `SELECT os.*, c.course_name, c.course_code, c.pass_score, c.max_retake_count
       FROM original_scores os
       JOIN courses c ON os.course_id = c.id
       WHERE os.id = ?`,
      [id]
    );
  }

  findUnpassedByDepartment(departmentId) {
    return this.all(
      `SELECT DISTINCT
         os.id, os.employee_id, os.course_id, os.score, os.is_passed, os.exam_date,
         e.employee_id as emp_code, e.name as employee_name,
         c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM original_scores os
       JOIN employees e ON os.employee_id = e.id
       JOIN courses c ON os.course_id = c.id
       WHERE e.department_id = ? AND os.is_passed = 0
         AND NOT EXISTS (
           SELECT 1 FROM original_scores os2
           WHERE os2.employee_id = os.employee_id
             AND os2.course_id = os.course_id
             AND os2.is_passed = 1
         )
       ORDER BY e.name, c.course_code`,
      [departmentId]
    );
  }
}

module.exports = new OriginalScoreDao();
