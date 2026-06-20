const express = require('express');
const router = express.Router();
const retakeService = require('../services/retake-service');

router.post('/registrations', async (req, res) => {
  try {
    const { employee_id, course_code, retake_batch_code, original_score_id } = req.body;

    if (!employee_id || !course_code || !retake_batch_code) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：employee_id, course_code, retake_batch_code',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await retakeService.submitRegistration({
      employee_id, course_code, retake_batch_code, original_score_id
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error('提交报名出错:', err);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR',
      detail: err.message
    });
  }
});

router.get('/registrations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await retakeService.getRegistrationDetail(id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('查询详情出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/hr/review', async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.retake_batch_id) filters.retake_batch_id = parseInt(req.query.retake_batch_id);
    if (req.query.course_id) filters.course_id = parseInt(req.query.course_id);
    if (req.query.department_id) filters.department_id = parseInt(req.query.department_id);

    const result = await retakeService.getHRReviewList(filters);
    return res.json(result);
  } catch (err) {
    console.error('查询审核列表出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.put('/registrations/:id/review', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, operator, rejection_reason, need_offline_communication, offline_communication_note } = req.body;

    if (!action || !operator) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：action, operator',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await retakeService.reviewRegistration(id, action, operator, {
      rejection_reason, need_offline_communication, offline_communication_note
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('审核出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.put('/registrations/:id/score', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { final_score, course_code } = req.body;

    if (final_score === undefined || final_score === null) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：final_score',
        code: 'MISSING_FIELDS'
      });
    }

    const score = Number(final_score);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: '成绩必须在 0-100 之间',
        code: 'INVALID_SCORE'
      });
    }

    const result = await retakeService.updateFinalScore(id, score, course_code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('成绩回写出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/department/risk/:id', async (req, res) => {
  try {
    const result = await retakeService.getDepartmentRisk(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('查询部门风险出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/assistant/unnotified/:assistant_emp_id', async (req, res) => {
  try {
    const result = await retakeService.getAssistantUnnotifiedList(req.params.assistant_emp_id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('查询未通知列表出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.put('/assistant/mark-notified', async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await retakeService.markNotified(ids);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('标记已通知出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/export/monthly', async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const result = await retakeService.monthlyExport(year, month);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('月度导出出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/batches/open', async (req, res) => {
  try {
    const result = await retakeService.getOpenBatches(req.query.course_code);
    return res.json(result);
  } catch (err) {
    console.error('查询开放批次出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const result = await retakeService.getCourses();
    return res.json(result);
  } catch (err) {
    console.error('查询课程出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.get('/employees/:employee_id/records', async (req, res) => {
  try {
    const result = await retakeService.getEmployeeRecords(req.params.employee_id, req.query.course_code);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('查询员工记录出错:', err);
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
