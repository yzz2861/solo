const BaseDao = require('./base-dao');

class EmployeeDao extends BaseDao {
  findByEmployeeId(employeeId) {
    return this.get(
      `SELECT e.*, d.name as department_name, d.manager_employee_id, d.assistant_employee_id
       FROM employees e LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.employee_id = ?`,
      [employeeId]
    );
  }

  findById(id) {
    return this.get(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?`,
      [id]
    );
  }

  findByDepartment(departmentId) {
    return this.all(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.department_id = ? ORDER BY e.employee_id`,
      [departmentId]
    );
  }

  findAll() {
    return this.all(
      `SELECT e.*, d.name as department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id ORDER BY e.employee_id`
    );
  }

  findByDepartmentManager(managerEmployeeId) {
    return this.get(
      `SELECT d.* FROM departments d WHERE d.manager_employee_id = ?`,
      [managerEmployeeId]
    );
  }

  findByDepartmentAssistant(assistantEmployeeId) {
    return this.get(
      `SELECT d.* FROM departments d WHERE d.assistant_employee_id = ?`,
      [assistantEmployeeId]
    );
  }
}

module.exports = new EmployeeDao();
