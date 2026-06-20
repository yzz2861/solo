const { get, all } = require('../config/database');

class EmployeeDao {
  async findByEmployeeId(employeeId) {
    return await get(
      `SELECT e.*, d.name as department_name, d.manager_employee_id, d.assistant_employee_id
       FROM employees e LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.employee_id = ?`,
      [employeeId]
    );
  }

  async findById(id) {
    return await get(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?`,
      [id]
    );
  }

  async findByDepartment(departmentId) {
    return await all(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.department_id = ? ORDER BY e.employee_id`,
      [departmentId]
    );
  }

  async findAll() {
    return await all(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id ORDER BY e.employee_id`
    );
  }

  async findByDepartmentManager(managerEmployeeId) {
    return await get(
      `SELECT d.* FROM departments d WHERE d.manager_employee_id = ?`,
      [managerEmployeeId]
    );
  }

  async findByDepartmentAssistant(assistantEmployeeId) {
    return await get(
      `SELECT d.* FROM departments d WHERE d.assistant_employee_id = ?`,
      [assistantEmployeeId]
    );
  }
}

module.exports = new EmployeeDao();
