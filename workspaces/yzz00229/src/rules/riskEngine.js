const { RISK_LEVEL, RULE_VERSION } = require('../config/constants');

function calculateRiskLevel(item) {
  const scores = [];
  const factors = [];

  scores.push(evaluateOccupationDuration(item.occupationDuration, factors));
  scores.push(evaluateLocationType(item.locationType, factors));
  scores.push(evidenceSufficiency(item, factors));
  scores.push(evaluateHazardLevel(item.hazardLevel, factors));
  scores.push(evaluateTimeSensitive(item.occurTime, factors));

  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const maxScore = scores.length * 100;
  const riskRatio = totalScore / maxScore;

  let riskLevel;
  if (hasInsufficientEvidence(item)) {
    riskLevel = RISK_LEVEL.UNDETERMINED;
  } else if (riskRatio >= 0.75) {
    riskLevel = RISK_LEVEL.HIGH;
  } else if (riskRatio >= 0.45) {
    riskLevel = RISK_LEVEL.MEDIUM;
  } else {
    riskLevel = RISK_LEVEL.LOW;
  }

  return {
    riskLevel,
    riskScore: totalScore,
    riskFactors: factors,
    ruleVersion: RULE_VERSION
  };
}

function hasInsufficientEvidence(item) {
  const hasImage = item.evidenceImages && item.evidenceImages.length > 0;
  const hasVideo = item.evidenceVideo && item.evidenceVideo.length > 0;
  const hasWitness = item.witnessInfo && item.witnessInfo.length > 0;
  const hasDescription = item.description && item.description.length >= 10;
  const hasLocation = item.locationDetail && item.locationDetail.length > 0;

  const evidenceCount = [hasImage, hasVideo, hasWitness].filter(Boolean).length;

  if (evidenceCount === 0) return true;
  if (!hasLocation) return true;
  if (!hasDescription && evidenceCount < 2) return true;

  return false;
}

function evaluateOccupationDuration(duration, factors) {
  if (!duration) {
    factors.push('占用时长未提供');
    return 30;
  }

  const minutes = parseDuration(duration);

  if (minutes >= 120) {
    factors.push('占用时长超过2小时');
    return 100;
  } else if (minutes >= 30) {
    factors.push('占用时长30分钟至2小时');
    return 70;
  } else if (minutes >= 5) {
    factors.push('占用时长5至30分钟');
    return 40;
  } else {
    factors.push('占用时长短于5分钟');
    return 15;
  }
}

function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string') {
    const match = duration.match(/(\d+)\s*(分钟|小时|min|hour|h|m)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('小时') || unit.startsWith('h') || unit.startsWith('hour')) {
        return value * 60;
      }
      return value;
    }
  }
  return 0;
}

function evaluateLocationType(locationType, factors) {
  const highRiskLocations = [
    '消防电梯前室',
    '疏散楼梯间',
    '安全出口',
    '消防车通道',
    '避难层'
  ];
  const mediumRiskLocations = [
    '疏散走道',
    '楼梯间前室',
    '消防控制室附近'
  ];

  if (!locationType) {
    factors.push('位置类型未明确');
    return 50;
  }

  if (highRiskLocations.some(loc => locationType.includes(loc))) {
    factors.push(`关键位置：${locationType}`);
    return 100;
  } else if (mediumRiskLocations.some(loc => locationType.includes(loc))) {
    factors.push(`重要位置：${locationType}`);
    return 65;
  } else {
    factors.push(`一般位置：${locationType}`);
    return 30;
  }
}

function evidenceSufficiency(item, factors) {
  let score = 0;
  let evidenceTypes = [];

  if (item.evidenceImages && item.evidenceImages.length > 0) {
    score += 25;
    evidenceTypes.push(`${item.evidenceImages.length}张照片`);
  }
  if (item.evidenceVideo && item.evidenceVideo.length > 0) {
    score += 35;
    evidenceTypes.push(`${item.evidenceVideo.length}段视频`);
  }
  if (item.witnessInfo && item.witnessInfo.length > 0) {
    score += 20;
    evidenceTypes.push(`${item.witnessInfo.length}名证人`);
  }
  if (item.description && item.description.length >= 20) {
    score += 15;
    evidenceTypes.push('详细描述');
  }
  if (item.locationDetail) {
    score += 5;
    evidenceTypes.push('位置描述');
  }

  if (evidenceTypes.length === 0) {
    factors.push('无有效证据材料');
  } else {
    factors.push(`证据类型：${evidenceTypes.join('、')}`);
  }

  return Math.min(score, 100);
}

function evaluateHazardLevel(hazardLevel, factors) {
  if (!hazardLevel) {
    factors.push('危险程度未评估');
    return 50;
  }

  switch (hazardLevel) {
    case '严重':
    case 'high':
      factors.push('危险程度：严重');
      return 100;
    case '较重':
    case 'medium':
      factors.push('危险程度：较重');
      return 60;
    case '一般':
    case 'low':
      factors.push('危险程度：一般');
      return 25;
    default:
      factors.push(`危险程度：${hazardLevel}`);
      return 45;
  }
}

function evaluateTimeSensitive(occurTime, factors) {
  if (!occurTime) {
    factors.push('发生时间未提供');
    return 40;
  }

  const occurDate = new Date(occurTime);
  if (isNaN(occurDate.getTime())) {
    factors.push('发生时间格式无效');
    return 30;
  }

  const now = new Date();
  const hoursDiff = (now - occurDate) / (1000 * 60 * 60);

  if (hoursDiff < 1) {
    factors.push('刚刚发生（1小时内）');
    return 100;
  } else if (hoursDiff < 24) {
    factors.push('当日发生');
    return 75;
  } else if (hoursDiff < 72) {
    factors.push('3日内发生');
    return 45;
  } else {
    factors.push('发生时间超过3天');
    return 15;
  }
}

module.exports = {
  calculateRiskLevel,
  hasInsufficientEvidence
};
