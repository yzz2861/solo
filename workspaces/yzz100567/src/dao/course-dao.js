const BaseDao = require('./base-dao');

class CourseDao extends BaseDao {
  findByCode(courseCode) {
    return this.get('SELECT * FROM courses WHERE course_code = ?', [courseCode]);
  }

  findById(id) {
    return this.get('SELECT * FROM courses WHERE id = ?', [id]);
  }

  findAll(activeOnly = true) {
    const sql = activeOnly
      ? 'SELECT * FROM courses WHERE is_active = 1 ORDER BY course_code'
      : 'SELECT * FROM courses ORDER BY course_code';
    return this.all(sql);
  }
}

module.exports = new CourseDao();
