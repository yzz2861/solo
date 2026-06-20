const { get, all } = require('../config/database');

class RetakeBatchDao {
  async findByCode(batchCode) {
    return await get(
      `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.batch_code = ?`,
      [batchCode]
    );
  }

  async findById(id) {
    return await get(
      `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.id = ?`,
      [id]
    );
  }

  async findByCourse(courseId) {
    return await all(
      `SELECT rb.*, c.course_code, c.course_name
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       WHERE rb.course_id = ? ORDER BY rb.registration_start DESC`,
      [courseId]
    );
  }

  async findOpenBatches(courseId = null) {
    let sql = `SELECT rb.*, c.course_code, c.course_name, c.pass_score, c.max_retake_count
               FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
               WHERE rb.status = 'open'`;
    const params = [];
    if (courseId) {
      sql += ' AND rb.course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY rb.registration_start DESC';
    return await all(sql, params);
  }

  async findAll() {
    return await all(
      `SELECT rb.*, c.course_code, c.course_name
       FROM retake_batches rb JOIN courses c ON rb.course_id = c.id
       ORDER BY rb.created_at DESC`
    );
  }
}

module.exports = new RetakeBatchDao();
