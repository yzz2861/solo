const { loadConfig } = require('../config/config');
const { PROCESS_ACTIONS } = require('../config/constants');

function validateRequest(reqBody) {
  const errors = [];
  const warnings = [];
  const config = loadConfig();

  if (!reqBody || typeof reqBody !== 'object') {
    errors.push('请求体不能为空');
    return { valid: false, errors, warnings, data: null };
  }

  const { batchNo, details, sourceChannel, action, reviewComment, operator } = reqBody;

  if (!batchNo) {
    errors.push('批次号(batchNo)不能为空');
  } else if (typeof batchNo !== 'string') {
    errors.push('批次号(batchNo)必须为字符串');
  } else if (config.batchNoPattern) {
    const regex = new RegExp(config.batchNoPattern);
    if (!regex.test(batchNo)) {
      errors.push(`批次号格式错误，需符合规则: ${config.batchNoPattern}`);
    }
  }

  if (!sourceChannel) {
    errors.push('来源渠道(sourceChannel)不能为空');
  } else if (config.validSourceChannels && !config.validSourceChannels.includes(sourceChannel)) {
    errors.push(`来源渠道不合法，有效值: ${config.validSourceChannels.join(', ')}`);
  }

  if (!action) {
    errors.push('处理动作(action)不能为空');
  } else if (!PROCESS_ACTIONS.includes(action)) {
    errors.push(`处理动作不合法，有效值: ${PROCESS_ACTIONS.join(', ')}`);
  }

  if (!operator) {
    warnings.push('操作人(operator)未提供，将使用默认值');
  }

  if (!Array.isArray(details)) {
    errors.push('明细项(details)必须为数组');
  } else if (details.length === 0) {
    errors.push('明细项(details)不能为空数组');
  } else {
    const detailResults = details.map((detail, index) =>
      validateDetail(detail, index, config)
    );
    const detailErrors = detailResults.flatMap(r => r.errors.map(e => `明细[${r.index}]: ${e}`));
    const detailWarnings = detailResults.flatMap(r => r.warnings.map(w => `明细[${r.index}]: ${w}`));
    errors.push(...detailErrors);
    warnings.push(...detailWarnings);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: {
        batchNo,
        sourceChannel,
        action,
        reviewComment: reviewComment || '',
        operator: operator || 'SYSTEM',
        details: detailResults.map(r => r.detail)
      }
    };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: {
      batchNo,
      sourceChannel,
      action,
      reviewComment: reviewComment || '',
      operator: operator || 'SYSTEM',
      details: []
    }
  };
}

function validateDetail(detail, index, config) {
  const errors = [];
  const warnings = [];
  const validatedDetail = { ...detail, _index: index, _timeOutOfBounds: false };

  if (!detail.detailId) {
    errors.push('明细编号(detailId)不能为空');
  } else if (typeof detail.detailId !== 'string') {
    errors.push('明细编号(detailId)必须为字符串');
  } else if (config.detailIdPattern) {
    const regex = new RegExp(config.detailIdPattern);
    if (!regex.test(detail.detailId)) {
      errors.push(`明细编号格式错误，需符合规则: ${config.detailIdPattern}`);
    }
  }

  if (!detail.bridgeCode) {
    errors.push('廊桥编号(bridgeCode)不能为空');
  } else if (config.bridgeCodePattern) {
    const regex = new RegExp(config.bridgeCodePattern);
    if (!regex.test(detail.bridgeCode)) {
      errors.push(`廊桥编号格式错误，需符合规则: ${config.bridgeCodePattern}`);
    }
  }

  if (!detail.bridgeStatus) {
    errors.push('廊桥状态(bridgeStatus)不能为空');
  }

  if (detail.dockingTime) {
    const timeResult = validateDockingTime(detail.dockingTime, config);
    if (!timeResult.valid) {
      errors.push(timeResult.error);
    }
    validatedDetail._timeOutOfBounds = timeResult.outOfBounds;
    validatedDetail._parsedDockingTime = timeResult.parsedTime;
  } else {
    warnings.push('靠接时间(dockingTime)未提供');
  }

  if (detail.windSpeed !== undefined && typeof detail.windSpeed !== 'number') {
    errors.push('风速(windSpeed)必须为数字');
  }

  if (detail.visibility !== undefined && typeof detail.visibility !== 'number') {
    errors.push('能见度(visibility)必须为数字');
  }

  if (detail.positionDeviation !== undefined && typeof detail.positionDeviation !== 'number') {
    errors.push('位置偏差(positionDeviation)必须为数字');
  }

  return {
    index,
    errors,
    warnings,
    detail: validatedDetail
  };
}

function validateDockingTime(dockingTime, config) {
  const result = {
    valid: true,
    outOfBounds: false,
    parsedTime: null,
    error: null
  };

  const time = new Date(dockingTime);
  if (isNaN(time.getTime())) {
    result.valid = false;
    result.error = `靠接时间格式错误: ${dockingTime}`;
    return result;
  }

  result.parsedTime = time.toISOString();

  if (config.timeWindow) {
    const now = new Date();
    const diffMinutes = (time - now) / (1000 * 60);

    if (config.timeWindow.minMinutesBeforeDocking !== undefined &&
        diffMinutes < config.timeWindow.minMinutesBeforeDocking) {
      result.outOfBounds = true;
    }

    if (config.timeWindow.maxMinutesAfterDocking !== undefined &&
        diffMinutes > config.timeWindow.maxMinutesAfterDocking) {
      result.outOfBounds = true;
    }
  }

  return result;
}

module.exports = {
  validateRequest,
  validateDetail,
  validateDockingTime
};
