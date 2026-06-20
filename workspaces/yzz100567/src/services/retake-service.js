const employeeDao = require('../dao/employee-dao');
const courseDao = require('../dao/course-dao');
const originalScoreDao = require('../dao/original-score-dao');
const retakeBatchDao = require('../dao/retake-batch-dao');
const registrationDao = require('../dao/retake-registration-dao');
const { run } = require('../config/database');

class RetakeService {
  async submitRegistration(payload) {
    const { employee_id, course_code, retake_batch_code, original_score_id } = payload;

    const employee = await employeeDao.findByEmployeeId(employee_id);
    if (!employee) {
      return { success: false, error: '员工不存在', code: 'EMPLOYEE_NOT_FOUND' };
    }

    const course = await courseDao.findByCode(course_code);
    if (!course) {
      return { success: false, error: '课程不存在', code: 'COURSE_NOT_FOUND' };
    }

    const batch = await retakeBatchDao.findByCode(retake_batch_code);
    if (!batch) {
      return { success: false, error: '补考批次不存在', code: 'BATCH_NOT_FOUND' };
    }
    if (batch.course_id !== course.id) {
      return { success: false, error: '补考批次与课程不匹配', code: 'BATCH_COURSE_MISMATCH' };
    }
    if (batch.status !== 'open') {
      return { success: false, error: '该补考批次已关闭', code: 'BATCH_CLOSED' };
    }

    const hasPassed = await originalScoreDao.hasPassed(employee.id, course.id);
    if (hasPassed) {
      return {
        success: false,
        error: '该员工已通过此课程，无需补考',
        code: 'ALREADY_PASSED',
        warning: true
      };
    }

    let originalScore;
    if (original_score_id) {
      originalScore = await originalScoreDao.findById(original_score_id);
      if (!originalScore) {
        return { success: false, error: '原始成绩不存在', code: 'SCORE_NOT_FOUND' };
      }
      if (originalScore.employee_id !== employee.id || originalScore.course_id !== course.id) {
        return { success: false, error: '原始成绩与员工或课程不匹配', code: 'SCORE_MISMATCH' };
      }
    } else {
      originalScore = await originalScoreDao.findLatestByEmployeeAndCourse(employee.id, course.id);
      if (!originalScore) {
        return { success: false, error: '未找到该员工的考试成绩', code: 'NO_SCORE_RECORD' };
      }
      if (originalScore.is_passed) {
        return {
          success: false,
          error: '最近一次成绩已通过，无需补考',
          code: 'LATEST_PASSED'
        };
      }
    }

    if (originalScore.is_passed) {
      return {
        success: false,
        error: '指定的原始成绩已通过',
        code: 'SCORE_ALREADY_PASSED'
      };
    }

    const currentAttempts = await registrationDao.countRetakeAttempts(employee.id, course.id);
    if (currentAttempts >= course.max_retake_count) {
      return {
        success: false,
        error: `已超过补考次数上限（最多 ${course.max_retake_count} 次）`,
        code: 'EXCEED_MAX_RETAKE',
        data: {
          current_attempts: currentAttempts,
          max_retake_count: course.max_retake_count
        }
      };
    }

    const existing = await registrationDao.findByEmployeeCourseBatch(
      employee.id, course.id, batch.id
    );
    if (existing) {
      if (existing.registration_status === 'rejected' || existing.registration_status === 'cancelled') {
        return {
          success: false,
          error: '该员工在此批次的报名已被拒绝或取消，请联系HR',
          code: 'REGISTRATION_REJECTED',
          data: { registration: existing }
        };
      }

      if (existing.original_score_id !== originalScore.id) {
        await run(
          `UPDATE retake_registrations
           SET original_score_id = ?, original_score = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [originalScore.id, originalScore.score, existing.id]
        );
      }
      return {
        success: true,
        merged: true,
        message: '重复报名已合并，使用原有报名记录',
        data: {
          id: existing.id,
          registration_no: existing.registration_no,
          retake_attempt_no: existing.retake_attempt_no,
          status: existing.registration_status
        }
      };
    }

    const result = await registrationDao.create({
      employee_id: employee.id,
      course_id: course.id,
      original_score_id: originalScore.id,
      retake_batch_id: batch.id,
      original_score: originalScore.score
    });

    return {
      success: true,
      merged: false,
      message: '补考报名成功，等待HR审核',
      data: {
        id: result.id,
        registration_no: result.registration_no,
        retake_attempt_no: result.retake_attempt_no,
        status: 'pending',
        employee: { id: employee.id, name: employee.name, employee_id: employee.employee_id },
        course: { code: course.course_code, name: course.course_name },
        batch: { code: batch.batch_code, name: batch.batch_name },
        original_score: originalScore.score
      }
    };
  }

  async getRegistrationDetail(id) {
    const reg = await registrationDao.findById(id);
    if (!reg) {
      return { success: false, error: '报名记录不存在', code: 'NOT_FOUND' };
    }
    return { success: true, data: reg };
  }

  async getHRReviewList(filters = {}) {
    const list = await registrationDao.findPendingList(filters);
    const stats = {
      total: list.length,
      pending: list.filter(r => r.registration_status === 'pending').length,
      approved: list.filter(r => r.registration_status === 'approved').length,
      rejected: list.filter(r => r.registration_status === 'rejected').length
    };
    return { success: true, data: { list, stats } };
  }

  async reviewRegistration(id, action, operator, extra = {}) {
    const reg = await registrationDao.findById(id);
    if (!reg) {
      return { success: false, error: '报名记录不存在', code: 'NOT_FOUND' };
    }
    if (!['pending', 'approved', 'rejected'].includes(reg.registration_status)) {
      return { success: false, error: '当前状态不可审核', code: 'INVALID_STATUS' };
    }

    const validActions = ['approve', 'reject', 'pending'];
    if (!validActions.includes(action)) {
      return { success: false, error: '无效的审核操作', code: 'INVALID_ACTION' };
    }

    const statusMap = { approve: 'approved', reject: 'rejected', pending: 'pending' };
    const newStatus = statusMap[action];

    await registrationDao.updateStatus(id, newStatus, operator, extra);
    const updated = await registrationDao.findById(id);

    return {
      success: true,
      message: `审核状态已更新为"${newStatus}"`,
      data: updated
    };
  }

  async updateFinalScore(id, finalScore, courseCode = null) {
    const reg = await registrationDao.findById(id);
    if (!reg) {
      return { success: false, error: '报名记录不存在', code: 'NOT_FOUND' };
    }

    const course = courseCode
      ? await courseDao.findByCode(courseCode)
      : await courseDao.findById(reg.course_id);
    if (!course) {
      return { success: false, error: '课程信息异常', code: 'COURSE_ERROR' };
    }

    const isPassed = finalScore >= course.pass_score;
    await registrationDao.updateFinalScore(id, finalScore, isPassed);

    if (isPassed) {
      try {
        await run(
          `INSERT OR IGNORE INTO original_scores
            (employee_id, course_id, score, is_passed, exam_date, exam_batch, remark)
          VALUES (?, ?, ?, 1, DATE('now'), ?, ?)`,
          [
            reg.employee_id, reg.course_id, finalScore,
            reg.batch_code || 'retake',
            `补考通过（第${reg.retake_attempt_no}次补考）`
          ]
        );
      } catch (e) {
      }
    }

    const updated = await registrationDao.findById(id);
    return {
      success: true,
      message: isPassed ? '成绩回写成功，已通过' : '成绩回写成功，未通过',
      data: {
        ...updated,
        pass_score: course.pass_score,
        is_passed: isPassed
      }
    };
  }

  async getDepartmentRisk(departmentIdOrManagerEmpId) {
    const deptByNum = Number(departmentIdOrManagerEmpId);
    let dept = null;

    if (!isNaN(deptByNum) && deptByNum > 0) {
      const { get } = require('../config/database');
      dept = await get('SELECT * FROM departments WHERE id = ?', [deptByNum]);
    }

    if (!dept) {
      dept = await employeeDao.findByDepartmentManager(departmentIdOrManagerEmpId);
    }

    if (!dept) {
      return { success: false, error: '部门不存在或您无权限查看', code: 'DEPT_NOT_FOUND' };
    }

    const report = await registrationDao.getDepartmentRiskReport(dept.id);
    const unpassedScores = await originalScoreDao.findUnpassedByDepartment(dept.id);

    return {
      success: true,
      data: {
        department: dept,
        summary: report.summary || {},
        by_course: report.byCourse || [],
        high_risk_employees: report.highRiskEmployees || [],
        unpassed_scores: unpassedScores
      }
    };
  }

  async getAssistantUnnotifiedList(assistantEmpId) {
    const dept = await employeeDao.findByDepartmentAssistant(assistantEmpId);
    if (!dept) {
      return { success: false, error: '部门不存在或您无权限查看', code: 'DEPT_NOT_FOUND' };
    }

    const list = await registrationDao.findUnnotifiedByDepartment(dept.id);
    const allUnpassed = await originalScoreDao.findUnpassedByDepartment(dept.id);

    const registrationIds = list.map(r => r.id);

    return {
      success: true,
      data: {
        department: dept,
        new_items: list,
        all_unpassed: allUnpassed,
        total_new: list.length,
        total_unpassed: allUnpassed.length,
        pending_notification_ids: registrationIds
      }
    };
  }

  async markNotified(ids) {
    if (!ids || ids.length === 0) {
      return { success: false, error: '未指定要标记的记录', code: 'NO_IDS' };
    }
    await registrationDao.markNotified(ids);
    return {
      success: true,
      message: `已标记 ${ids.length} 条记录为已通知，将不再重复提醒`
    };
  }

  async monthlyExport(year, month) {
    if (!year || !month || month < 1 || month > 12) {
      return { success: false, error: '年月参数无效', code: 'INVALID_PARAMS' };
    }

    const data = await registrationDao.getMonthlyExport(year, month);

    const stats = {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      not_passed_count: data.notPassed.length,
      retaken_count: data.retaken.length,
      retaken_passed: data.retaken.filter(r => r.final_is_passed === 1).length,
      retaken_failed: data.retaken.filter(r => r.final_is_passed === 0).length,
      need_offline_count: data.needOffline.length
    };

    return {
      success: true,
      data: {
        stats,
        not_passed_list: data.notPassed,
        retaken_list: data.retaken,
        need_offline_list: data.needOffline
      }
    };
  }

  async getOpenBatches(courseCode = null) {
    const courseId = courseCode ? (await courseDao.findByCode(courseCode) || {}).id : null;
    const batches = await retakeBatchDao.findOpenBatches(courseId);
    return { success: true, data: batches };
  }

  async getCourses() {
    return { success: true, data: await courseDao.findAll() };
  }

  async getEmployeeRecords(employeeId, courseCode = null) {
    const employee = await employeeDao.findByEmployeeId(employeeId);
    if (!employee) {
      return { success: false, error: '员工不存在', code: 'EMPLOYEE_NOT_FOUND' };
    }

    const allCourses = await courseDao.findAll();
    const courseId = courseCode ? (await courseDao.findByCode(courseCode) || {}).id : null;

    let registrations = [];
    if (courseId) {
      registrations = await registrationDao.findByEmployeeAndCourse(employee.id, courseId);
    } else {
      for (const c of allCourses) {
        const regs = await registrationDao.findByEmployeeAndCourse(employee.id, c.id);
        registrations.push(...regs);
      }
      registrations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    let scores = [];
    if (courseId) {
      scores = await originalScoreDao.findByEmployeeAndCourse(employee.id, courseId);
    } else {
      for (const c of allCourses) {
        const s = await originalScoreDao.findByEmployeeAndCourse(employee.id, c.id);
        scores.push(...s);
      }
      scores.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    }

    return {
      success: true,
      data: {
        employee,
        registrations,
        original_scores: scores
      }
    };
  }
}

module.exports = new RetakeService();
