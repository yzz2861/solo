const BaseDao = require('./base-dao');

class RetakeBatchDao extends BaseDao {
  findByCode(batchCode) {
    return this.get(
      `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.batch_code = ?`,
      [batchCode]
    );
  }

  findById(id) {
    return this.get(
      `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.id = ?`,
      [id]
    );
  }

  findByCourse(courseId) {
    return this.all(
      `SELECT rb.*, c.course_code, c.course_name
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.course_id = ? ORDER BY rb.registration_start DESC`,
      [courseId]
    );
  }

  findOpenBatches(courseId = null) {
    let sql = `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
               FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
               WHERE rb.status = 'open'`;
    const params = [];
    if (courseId) {
      sql += ' AND rb.course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY rb.registration_start DESC';
    return this.all(sql, params);
  }

  findAll() {
    return this.all(
      `SELECT rb.*, c.course_code, c.course_name
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       ORDER BY rb.created_at DESC`
    );
  }
}

module.exports = new RetakeBatchDao();
