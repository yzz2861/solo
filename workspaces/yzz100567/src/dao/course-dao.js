const { get, all } = require('../config/database');

class CourseDao {
  async findByCode(courseCode) {
    return await get('SELECT * FROM courses WHERE course_code = ?', [courseCode]);
  }

  async findById(id) {
    return await get('SELECT * FROM courses WHERE id = ?', [id]);
  }

  async findAll(activeOnly = true) {
    const sql = activeOnly
      ? 'SELECT * FROM courses WHERE is_active = 1 ORDER BY course_code'
      : 'SELECT * FROM courses ORDER BY course_code';
    return await all(sql);
  }
}

module.exports = new CourseDao();
