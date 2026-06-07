const {
  RULE_VERSION,
  SOURCE_CHANNELS,
  BRIDGE_STATUSES,
  RISK_LEVELS,
  NEXT_ACTIONS
} = require('./constants');

const DEFAULT_CONFIG = {
  ruleVersion: RULE_VERSION,
  enabled: true,
  timeWindow: {
    minMinutesBeforeDocking: -30,
    maxMinutesAfterDocking: 120
  },
  batchNoPattern: '^BATCH-\\d{8}-\\d{4}$',
  detailIdPattern: '^DET-\\d{8}-\\d{6}$',
  bridgeCodePattern: '^T\\d{1,2}-B\\d{1,2}$',
  validSourceChannels: SOURCE_CHANNELS,
  validBridgeStatuses: BRIDGE_STATUSES,
  riskRules: [
    {
      id: 'R001',
      name: '廊桥状态异常',
      condition: (detail) => !BRIDGE_STATUSES.includes(detail.bridgeStatus),
      riskLevel: RISK_LEVELS.HIGH,
      nextAction: NEXT_ACTIONS.HALT,
      description: '廊桥状态不在合法范围内'
    },
    {
      id: 'R002',
      name: '靠接时间越界',
      condition: (detail) => detail._timeOutOfBounds === true,
      riskLevel: RISK_LEVELS.HIGH,
      nextAction: NEXT_ACTIONS.MANUAL_CHECK,
      description: '靠接时间超出正常作业窗口'
    },
    {
      id: 'R003',
      name: '风速超限',
      condition: (detail) => detail.windSpeed !== undefined && detail.windSpeed > 15,
      riskLevel: RISK_LEVELS.MEDIUM,
      nextAction: NEXT_ACTIONS.HALT,
      description: '风速超过15m/s，影响靠接安全'
    },
    {
      id: 'R004',
      name: '能见度不足',
      condition: (detail) => detail.visibility !== undefined && detail.visibility < 500,
      riskLevel: RISK_LEVELS.MEDIUM,
      nextAction: NEXT_ACTIONS.MANUAL_CHECK,
      description: '能见度低于500米，需人工确认'
    },
    {
      id: 'R005',
      name: '航班信息缺失',
      condition: (detail) => !detail.flightNo,
      riskLevel: RISK_LEVELS.LOW,
      nextAction: NEXT_ACTIONS.ESCALATE,
      description: '缺少航班号信息'
    },
    {
      id: 'R006',
      name: '设备告警',
      condition: (detail) => detail.hasAlarm === true,
      riskLevel: RISK_LEVELS.HIGH,
      nextAction: NEXT_ACTIONS.MAINTENANCE,
      description: '廊桥设备存在告警信息'
    },
    {
      id: 'R007',
      name: '靠接位置偏差',
      condition: (detail) => detail.positionDeviation !== undefined && Math.abs(detail.positionDeviation) > 5,
      riskLevel: RISK_LEVELS.MEDIUM,
      nextAction: NEXT_ACTIONS.MANUAL_CHECK,
      description: '靠接位置偏差超过5厘米'
    },
    {
      id: 'R008',
      name: '操作人员无证',
      condition: (detail) => detail.operatorCertified === false,
      riskLevel: RISK_LEVELS.HIGH,
      nextAction: NEXT_ACTIONS.ESCALATE,
      description: '操作人员无有效资质证书'
    }
  ],
  escalationRules: {
    highRiskCountThreshold: 2,
    mediumRiskCountThreshold: 3
  }
};

let runtimeConfig = null;

function deepCloneConfig(source) {
  const cloned = {};
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (Array.isArray(val)) {
      cloned[key] = val.map(item => {
        if (item && typeof item === 'object') {
          return { ...item };
        }
        return item;
      });
    } else if (val && typeof val === 'object' && val.constructor === Object) {
      cloned[key] = deepCloneConfig(val);
    } else {
      cloned[key] = val;
    }
  }
  return cloned;
}

function loadConfig() {
  if (!runtimeConfig) {
    runtimeConfig = deepCloneConfig(DEFAULT_CONFIG);
  }
  return runtimeConfig;
}

function resetConfig() {
  runtimeConfig = deepCloneConfig(DEFAULT_CONFIG);
  return runtimeConfig;
}

function updateConfig(updates) {
  const config = loadConfig();
  Object.assign(config, updates);
  return config;
}

function getRiskRuleById(ruleId) {
  const config = loadConfig();
  return config.riskRules.find(r => r.id === ruleId);
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  resetConfig,
  updateConfig,
  getRiskRuleById
};
