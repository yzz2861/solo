const { PROCESS_ACTIONS, SOURCE_CHANNELS, BRADEN_SUBSCALES } = require('../models/assessment');
const { isEmpty } = require('../utils/helpers');

function validateAssessmentRequest(req, res, next) {
  const body = req.body;
  const errors = [];

  if (isEmpty(body.batchNo)) {
    errors.push({ field: 'batchNo', message: '批次号不能为空', code: 'BATCH_NO_REQUIRED' });
  } else if (typeof body.batchNo !== 'string' || body.batchNo.length < 3) {
    errors.push({ field: 'batchNo', message: '批次号格式不正确', code: 'BATCH_NO_INVALID' });
  }

  if (isEmpty(body.sourceChannel)) {
    errors.push({ field: 'sourceChannel', message: '来源渠道不能为空', code: 'SOURCE_REQUIRED' });
  } else if (!Object.values(SOURCE_CHANNELS).includes(body.sourceChannel)) {
    errors.push({ field: 'sourceChannel', message: `来源渠道不合法，有效值：${Object.values(SOURCE_CHANNELS).join('、')}`, code: 'SOURCE_INVALID' });
  }

  if (isEmpty(body.processAction)) {
    errors.push({ field: 'processAction', message: '处理动作不能为空', code: 'ACTION_REQUIRED' });
  } else if (!Object.values(PROCESS_ACTIONS).includes(body.processAction)) {
    errors.push({ field: 'processAction', message: `处理动作不合法，有效值：${Object.values(PROCESS_ACTIONS).join('、')}`, code: 'ACTION_INVALID' });
  }

  if (!body.details || !Array.isArray(body.details) || body.details.length === 0) {
    errors.push({ field: 'details', message: '明细项不能为空且必须为数组', code: 'DETAILS_REQUIRED' });
  } else {
    body.details.forEach((item, index) => {
      const detailErrors = validateDetailItem(item, index);
      errors.push(...detailErrors);
    });
  }

  if (body.processAction === PROCESS_ACTIONS.REVIEW && isEmpty(body.reviewOpinion)) {
    errors.push({ field: 'reviewOpinion', message: '复核动作必须提供复核意见', code: 'REVIEW_OPINION_REQUIRED' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '参数校验失败',
      errorCode: 'VALIDATION_ERROR',
      validationErrors: errors,
      data: null
    });
  }

  next();
}

function validateDetailItem(item, index) {
  const errors = [];
  const prefix = `details[${index}]`;

  if (isEmpty(item.patientId)) {
    errors.push({ field: `${prefix}.patientId`, message: '患者ID不能为空', code: 'PATIENT_ID_REQUIRED' });
  }

  if (isEmpty(item.patientName)) {
    errors.push({ field: `${prefix}.patientName`, message: '患者姓名不能为空', code: 'PATIENT_NAME_REQUIRED' });
  }

  if (item.age === undefined || item.age === null) {
    errors.push({ field: `${prefix}.age`, message: '年龄不能为空', code: 'AGE_REQUIRED' });
  } else if (typeof item.age !== 'number' || item.age < 0 || item.age > 150) {
    errors.push({ field: `${prefix}.age`, message: '年龄不合法', code: 'AGE_INVALID' });
  }

  if (!item.braden) {
    errors.push({ field: `${prefix}.braden`, message: 'Braden评估数据不能为空', code: 'BRADEN_REQUIRED' });
  } else {
    for (const scale of BRADEN_SUBSCALES) {
      const val = item.braden[scale];
      if (val === undefined || val === null) {
        errors.push({ field: `${prefix}.braden.${scale}`, message: `Braden分量表 ${scale} 缺失`, code: 'BRADEN_SUBSCALE_MISSING' });
      } else if (typeof val !== 'number' || val < 1 || val > 4) {
        if (scale === 'frictionShear') {
          if (val < 1 || val > 3) {
            errors.push({ field: `${prefix}.braden.${scale}`, message: `Braden分量表 ${scale} 取值应在1-3之间`, code: 'BRADEN_SUBSCALE_INVALID' });
          }
        } else {
          errors.push({ field: `${prefix}.braden.${scale}`, message: `Braden分量表 ${scale} 取值应在1-4之间`, code: 'BRADEN_SUBSCALE_INVALID' });
        }
      }
    }
  }

  if (item.medicalHistory && !Array.isArray(item.medicalHistory)) {
    errors.push({ field: `${prefix}.medicalHistory`, message: '病史信息格式不正确', code: 'MEDICAL_HISTORY_INVALID' });
  }

  return errors;
}

function detectMaterialMissing(details) {
  const missingItems = [];

  details.forEach((item, index) => {
    const missingFields = [];

    if (!item.gender) {
      missingFields.push('性别');
    }
    if (!item.department) {
      missingFields.push('科室');
    }
    if (!item.bedNo) {
      missingFields.push('床号');
    }
    if (!item.admissionDate) {
      missingFields.push('入院日期');
    }
    if (!item.assessor) {
      missingFields.push('评估人');
    }
    if (!item.assessmentTime) {
      missingFields.push('评估时间');
    }

    if (missingFields.length > 0) {
      missingItems.push({
        index,
        patientId: item.patientId || '未知',
        patientName: item.patientName || '未知',
        missingFields,
        reason: `缺少必填材料：${missingFields.join('、')}`
      });
    }
  });

  return {
    hasMissing: missingItems.length > 0,
    missingItems
  };
}

module.exports = {
  validateAssessmentRequest,
  validateDetailItem,
  detectMaterialMissing
};
