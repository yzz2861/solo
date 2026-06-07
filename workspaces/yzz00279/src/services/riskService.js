const {
  RISK_TAGS,
  RISK_LEVELS,
  RECTIFICATION_CATEGORIES
} = require('../utils/constants');

const categoryRiskMapping = {
  [RECTIFICATION_CATEGORIES.STRUCTURE]: {
    riskLevel: RISK_LEVELS.HIGH,
    tags: [RISK_TAGS.STRUCTURAL_SAFETY, RISK_TAGS.HIGH_COST]
  },
  [RECTIFICATION_CATEGORIES.WATERPROOF]: {
    riskLevel: RISK_LEVELS.HIGH,
    tags: [RISK_TAGS.WATER_LEAKAGE, RISK_TAGS.STRUCTURAL_SAFETY]
  },
  [RECTIFICATION_CATEGORIES.ELECTRICAL]: {
    riskLevel: RISK_LEVELS.HIGH,
    tags: [RISK_TAGS.ELECTRICAL_HAZARD, RISK_TAGS.FIRE_SAFETY]
  },
  [RECTIFICATION_CATEGORIES.FIRE]: {
    riskLevel: RISK_LEVELS.HIGH,
    tags: [RISK_TAGS.FIRE_SAFETY, RISK_TAGS.PROCESS_VIOLATION]
  },
  [RECTIFICATION_CATEGORIES.DOORS_WINDOWS]: {
    riskLevel: RISK_LEVELS.MEDIUM,
    tags: [RISK_TAGS.DOOR_WINDOW_DEFECT, RISK_TAGS.WATER_LEAKAGE]
  },
  [RECTIFICATION_CATEGORIES.FLOORING]: {
    riskLevel: RISK_LEVELS.LOW,
    tags: [RISK_TAGS.FLOOR_WALL_DEFECT]
  },
  [RECTIFICATION_CATEGORIES.WALLS]: {
    riskLevel: RISK_LEVELS.LOW,
    tags: [RISK_TAGS.FLOOR_WALL_DEFECT]
  },
  [RECTIFICATION_CATEGORIES.FACILITIES]: {
    riskLevel: RISK_LEVELS.MEDIUM,
    tags: [RISK_TAGS.FACILITY_DAMAGE]
  },
  [RECTIFICATION_CATEGORIES.DOCUMENTS]: {
    riskLevel: RISK_LEVELS.MEDIUM,
    tags: [RISK_TAGS.DOCUMENT_INCOMPLETE, RISK_TAGS.PROCESS_VIOLATION]
  }
};

const severityMultiplier = {
  CRITICAL: 2.0,
  MAJOR: 1.5,
  MINOR: 1.0,
  SUGGESTION: 0.5
};

function calculateItemRisk(item) {
  const categoryInfo = categoryRiskMapping[item.category] || {
    riskLevel: RISK_LEVELS.LOW,
    tags: []
  };

  const severity = item.severity || 'MINOR';
  const multiplier = severityMultiplier[severity] || 1.0;

  let baseScore = 0;
  switch (categoryInfo.riskLevel) {
    case RISK_LEVELS.HIGH:
      baseScore = 80;
      break;
    case RISK_LEVELS.MEDIUM:
      baseScore = 50;
      break;
    case RISK_LEVELS.LOW:
      baseScore = 20;
      break;
    default:
      baseScore = 10;
  }

  const riskScore = Math.min(100, Math.round(baseScore * multiplier));

  let finalLevel;
  if (riskScore >= 80) {
    finalLevel = RISK_LEVELS.HIGH;
  } else if (riskScore >= 50) {
    finalLevel = RISK_LEVELS.MEDIUM;
  } else if (riskScore >= 20) {
    finalLevel = RISK_LEVELS.LOW;
  } else {
    finalLevel = RISK_LEVELS.NONE;
  }

  return {
    riskScore,
    riskLevel: finalLevel,
    riskTags: [...categoryInfo.tags],
    itemId: item.itemId
  };
}

function calculateBatchRisk(items) {
  if (!items || items.length === 0) {
    return {
      overallRiskLevel: RISK_LEVELS.NONE,
      overallRiskScore: 0,
      itemRisks: [],
      allRiskTags: []
    };
  }

  const itemRisks = items.map(item => calculateItemRisk(item));
  const allTags = new Set();
  let totalScore = 0;
  let maxScore = 0;

  itemRisks.forEach(ir => {
    totalScore += ir.riskScore;
    maxScore = Math.max(maxScore, ir.riskScore);
    ir.riskTags.forEach(tag => allTags.add(tag));
  });

  const avgScore = Math.round(totalScore / itemRisks.length);

  let overallLevel;
  const hasHighRisk = itemRisks.some(ir => ir.riskLevel === RISK_LEVELS.HIGH);
  const highRiskCount = itemRisks.filter(ir => ir.riskLevel === RISK_LEVELS.HIGH).length;
  const highRiskRatio = highRiskCount / itemRisks.length;

  if (hasHighRisk && highRiskRatio > 0.3) {
    overallLevel = RISK_LEVELS.HIGH;
  } else if (hasHighRisk || avgScore >= 50) {
    overallLevel = RISK_LEVELS.MEDIUM;
  } else if (avgScore >= 20) {
    overallLevel = RISK_LEVELS.LOW;
  } else {
    overallLevel = RISK_LEVELS.NONE;
  }

  return {
    overallRiskLevel: overallLevel,
    overallRiskScore: maxScore,
    averageRiskScore: avgScore,
    highRiskItemCount: highRiskCount,
    itemRisks,
    allRiskTags: Array.from(allTags)
  };
}

function addDuplicateRisk(riskResult) {
  riskResult.allRiskTags = [...new Set([...riskResult.allRiskTags, RISK_TAGS.DUPLICATE])];
  return riskResult;
}

function addTimeoutRisk(riskResult) {
  riskResult.allRiskTags = [...new Set([...riskResult.allRiskTags, RISK_TAGS.TIMEOUT])];
  if (riskResult.overallRiskLevel === RISK_LEVELS.LOW || riskResult.overallRiskLevel === RISK_LEVELS.NONE) {
    riskResult.overallRiskLevel = RISK_LEVELS.MEDIUM;
  }
  return riskResult;
}

module.exports = {
  categoryRiskMapping,
  severityMultiplier,
  calculateItemRisk,
  calculateBatchRisk,
  addDuplicateRisk,
  addTimeoutRisk
};
