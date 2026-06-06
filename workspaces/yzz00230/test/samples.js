const { SOURCE_CHANNELS, PROCESS_ACTIONS } = require('../src/constants');

const SAMPLES = {
  compliant: {
    name: '合规样例 - 正常异地登录',
    description: '用户在合理范围内异地登录，未触发任何风险规则',
    payload: {
      batchNo: 'BATCH-COMPLIANT-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-COMPLIANT-001',
          userId: 'U10001',
          userName: '张三',
          department: '研发部',
          loginTime: '2026-06-06T10:30:00+08:00',
          ipAddress: '218.106.123.45',
          location: '上海',
          commonLocation: '上海',
          distanceKm: 0,
          deviceFingerprint: 'DEV-SH-001',
          deviceMismatch: false,
          dailyLoginCount: 3,
          multiLocationLogin: false,
          accountSharedSuspected: false
        }
      ]
    },
    expected: {
      conclusion: 'compliant',
      riskLevel: 'none',
      nextAction: 'pass_and_archive',
      riskTags: []
    }
  },

  thresholdExceeded: {
    name: '超阈值样例 - 高风险登录',
    description: '触发多条高风险规则，风险评分超过高风险阈值',
    payload: {
      batchNo: 'BATCH-HIGHRISK-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-HIGHRISK-001',
          userId: 'U20002',
          userName: '李四',
          department: '财务部',
          loginTime: '2026-06-06T02:15:00+08:00',
          ipAddress: '192.168.200.1',
          location: '境外-未知',
          commonLocation: '北京',
          distanceKm: 8000,
          deviceFingerprint: 'DEV-UNKNOWN-999',
          deviceMismatch: true,
          dailyLoginCount: 25,
          multiLocationLogin: true,
          accountSharedSuspected: false
        }
      ]
    },
    expected: {
      conclusion: 'risk_high',
      riskLevel: 'high',
      nextAction: 'block_account'
    }
  },

  mediumRisk: {
    name: '中风险样例 - 需安全团队介入',
    description: '风险评分达到中风险阈值，需安全团队介入处理',
    payload: {
      batchNo: 'BATCH-MEDIUM-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-MEDIUM-001',
          userId: 'U30003',
          userName: '王五',
          department: '市场部',
          loginTime: '2026-06-06T09:00:00+08:00',
          ipAddress: '114.234.56.78',
          location: '广州',
          commonLocation: '北京',
          distanceKm: 1800,
          deviceFingerprint: 'DEV-GZ-001',
          deviceMismatch: true,
          dailyLoginCount: 5,
          multiLocationLogin: false,
          accountSharedSuspected: false
        }
      ]
    },
    expected: {
      conclusion: 'risk_medium',
      riskLevel: 'medium',
      nextAction: 'escalate_to_security'
    }
  },

  materialMissing: {
    name: '材料缺失样例 - 字段不完整',
    description: '登录明细缺少必要字段，无法进行完整风险评估',
    payload: {
      batchNo: 'BATCH-MISSING-20260606-001',
      sourceChannel: SOURCE_CHANNELS.MANUAL_REPORT,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-MISSING-001',
          userName: '赵六',
          department: '人事部',
          location: '深圳'
        }
      ]
    },
    expected: {
      conclusion: 'material_missing',
      nextAction: 'supplement_material',
      failReasonContains: '材料缺失'
    }
  },

  historyReplay: {
    name: '历史回放样例 - 历史数据回溯分析',
    description: '通过历史回放渠道重新分析历史登录数据',
    payload: {
      batchNo: 'BATCH-REPLAY-20260606-001',
      sourceChannel: SOURCE_CHANNELS.HISTORY_REPLAY,
      action: PROCESS_ACTIONS.RECHECK,
      reviewOpinion: '安全审计回溯',
      items: [
        {
          itemId: 'ITEM-REPLAY-001',
          userId: 'U40004',
          userName: '钱七',
          department: '运维部',
          loginTime: '2026-06-01T23:45:00+08:00',
          ipAddress: '172.16.50.100',
          location: '成都',
          commonLocation: '上海',
          distanceKm: 1500,
          deviceFingerprint: 'DEV-CD-001',
          deviceMismatch: false,
          dailyLoginCount: 8,
          multiLocationLogin: false,
          accountSharedSuspected: true
        }
      ]
    },
    expected: {
      isRecheck: true
    }
  },

  duplicateSubmission: {
    name: '重复提交样例 - 同一批次重复提交',
    description: '同一批次下相同明细项重复提交，应明确返回重复标识',
    payload: {
      batchNo: 'BATCH-DUPLICATE-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-DUPLICATE-001',
          userId: 'U50005',
          userName: '孙八',
          loginTime: '2026-06-06T14:00:00+08:00',
          ipAddress: '202.123.45.67',
          location: '杭州',
          commonLocation: '杭州',
          distanceKm: 0
        }
      ]
    },
    expected: {
      secondSubmission: {
        conclusion: 'duplicate_submission',
        isDuplicate: true,
        nextAction: 'no_action'
      }
    }
  },

  manualReviewApprove: {
    name: '人工复核通过样例',
    description: '对低风险待复核记录执行复核通过操作',
    setupPayload: {
      batchNo: 'BATCH-REVIEW-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-REVIEW-001',
          userId: 'U60006',
          userName: '周九',
          loginTime: '2026-06-06T23:30:00+08:00',
          ipAddress: '202.123.45.68',
          location: '南京',
          commonLocation: '南京',
          distanceKm: 0,
          dailyLoginCount: 2
        }
      ]
    },
    reviewPayload: {
      batchNo: 'BATCH-REVIEW-20260606-001',
      sourceChannel: SOURCE_CHANNELS.MANUAL_REPORT,
      action: PROCESS_ACTIONS.REVIEW_APPROVE,
      reviewOpinion: '经核实为本人加班登录，予以通过',
      reviewer: '安全运营-吴十',
      items: [
        {
          itemId: 'ITEM-REVIEW-001',
          userId: 'U60006'
        }
      ]
    },
    expected: {
      reviewResult: 'approved',
      conclusion: 'closed',
      nextAction: 'pass_and_archive'
    }
  },

  manualReviewReject: {
    name: '人工复核驳回样例',
    description: '对风险记录执行复核驳回，升级为高风险',
    reviewPayload: {
      batchNo: 'BATCH-REVIEW-20260606-001',
      sourceChannel: SOURCE_CHANNELS.MANUAL_REPORT,
      action: PROCESS_ACTIONS.REVIEW_REJECT,
      reviewOpinion: '确认非本人操作，账号存在被盗风险',
      reviewer: '安全运营-吴十',
      items: [
        {
          itemId: 'ITEM-REVIEW-002',
          userId: 'U70007'
        }
      ]
    },
    expected: {
      reviewResult: 'rejected',
      conclusion: 'risk_high',
      nextAction: 'block_account'
    }
  },

  boundaryEmptyBatch: {
    name: '边界条件 - 空批次号',
    description: '批次号为空时应返回明确的校验错误',
    payload: {
      batchNo: '',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-BOUNDARY-001',
          userId: 'U80008',
          loginTime: '2026-06-06T10:00:00+08:00',
          ipAddress: '1.2.3.4'
        }
      ]
    },
    expected: {
      code: 'INVALID_INPUT',
      httpStatus: 400
    }
  },

  boundaryEmptyItems: {
    name: '边界条件 - 空明细列表',
    description: '明细项为空数组时应返回校验错误',
    payload: {
      batchNo: 'BATCH-BOUNDARY-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: []
    },
    expected: {
      code: 'INVALID_INPUT',
      httpStatus: 400
    }
  },

  boundaryInvalidAction: {
    name: '边界条件 - 无效处理动作',
    description: '传入未定义的处理动作时应明确报错',
    payload: {
      batchNo: 'BATCH-BOUNDARY-002',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: 'invalid_action',
      items: [
        {
          itemId: 'ITEM-BOUNDARY-002',
          userId: 'U90009',
          loginTime: '2026-06-06T10:00:00+08:00',
          ipAddress: '1.2.3.4'
        }
      ]
    },
    expected: {
      code: 'INVALID_INPUT',
      httpStatus: 400
    }
  },

  closeRecord: {
    name: '关闭记录样例',
    description: '手动关闭一条处理中的记录',
    payload: {
      batchNo: 'BATCH-CLOSE-20260606-001',
      sourceChannel: SOURCE_CHANNELS.MANUAL_REPORT,
      action: PROCESS_ACTIONS.CLOSE,
      reviewOpinion: '用户已确认本人操作，关闭工单',
      reviewer: '运营专员',
      items: [
        {
          itemId: 'ITEM-CLOSE-001',
          userId: 'U11011',
          loginTime: '2026-06-06T10:00:00+08:00',
          ipAddress: '1.2.3.4'
        }
      ]
    },
    expected: {
      conclusion: 'closed',
      status: 'closed',
      nextAction: 'no_action'
    }
  },

  thirdPartySource: {
    name: '第三方渠道样例',
    description: '来自第三方安全厂商的数据接入',
    payload: {
      batchNo: 'BATCH-3RD-20260606-001',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-3RD-001',
          userId: 'U12012',
          userName: '郑十一',
          loginTime: '2026-06-06T16:00:00+08:00',
          ipAddress: '10.0.99.99',
          location: '武汉',
          commonLocation: '武汉',
          distanceKm: 0,
          dailyLoginCount: 1
        }
      ]
    },
    expected: {
      riskTagsIncludes: 'suspicious_ip'
    }
  },

  batchMultipleItems: {
    name: '多明细批次样例',
    description: '一个批次包含多条不同风险等级的明细',
    payload: {
      batchNo: 'BATCH-MULTI-20260606-001',
      sourceChannel: SOURCE_CHANNELS.AUTO_MONITOR,
      action: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM-MULTI-001',
          userId: 'UM001',
          loginTime: '2026-06-06T10:00:00+08:00',
          ipAddress: '218.106.123.45',
          location: '上海',
          commonLocation: '上海',
          distanceKm: 0
        },
        {
          itemId: 'ITEM-MULTI-002',
          userId: 'UM002',
          loginTime: '2026-06-06T02:00:00+08:00',
          ipAddress: '192.168.200.1',
          location: '境外',
          commonLocation: '北京',
          distanceKm: 10000,
          deviceMismatch: true,
          multiLocationLogin: true,
          dailyLoginCount: 30
        },
        {
          itemId: 'ITEM-MULTI-003',
          userName: '不完整记录'
        }
      ]
    },
    expected: {
      totalCount: 3,
      successCount: 2,
      failCount: 1
    }
  }
};

module.exports = SAMPLES;
