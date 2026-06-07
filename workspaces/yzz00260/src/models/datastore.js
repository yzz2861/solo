const { v4: uuidv4 } = require('uuid');

class DataStore {
  constructor() {
    this.rules = new Map();
    this.rateLimitRecords = new Map();
    this.auditLogs = [];
    this.businessRecords = new Map();
    this._initDefaultRules();
  }

  _initDefaultRules() {
    const defaultRules = [
      {
        ruleId: 'RULE-GRAY-001',
        version: 'v1.0',
        name: '灰度发布基础限流规则',
        description: '灰度期间单业务编号每小时调用次数限制',
        timeWindow: {
          unit: 'hour',
          value: 1
        },
        threshold: 100,
        objectStatusRequired: ['active', 'pending_review'],
        requiresManualReview: false,
        isActive: true,
        createdAt: new Date('2026-01-01').toISOString(),
        createdBy: 'system'
      },
      {
        ruleId: 'RULE-GRAY-002',
        version: 'v2.0',
        name: '灰度发布严格限流规则',
        description: '灰度后期单业务编号每小时调用次数限制，需材料审核',
        timeWindow: {
          unit: 'hour',
          value: 1
        },
        threshold: 50,
        objectStatusRequired: ['active'],
        requiresManualReview: true,
        reviewRequiredFields: ['businessLicense', 'idCard', 'contract'],
        isActive: true,
        createdAt: new Date('2026-03-01').toISOString(),
        createdBy: 'admin'
      },
      {
        ruleId: 'RULE-GRAY-003',
        version: 'v1.5',
        name: '历史回放限流规则',
        description: '历史数据回放专用限流规则',
        timeWindow: {
          unit: 'minute',
          value: 5
        },
        threshold: 200,
        objectStatusRequired: ['active', 'frozen'],
        requiresManualReview: false,
        isActive: true,
        createdAt: new Date('2026-02-15').toISOString(),
        createdBy: 'admin'
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.ruleId + '_' + rule.version, rule);
    });
  }

  getRule(ruleId, version) {
    return this.rules.get(ruleId + '_' + version) || null;
  }

  getActiveRules() {
    return Array.from(this.rules.values()).filter(r => r.isActive);
  }

  getRateLimitRecord(businessNo, ruleId, version, windowStart) {
    const key = `${businessNo}_${ruleId}_${version}_${windowStart}`;
    if (!this.rateLimitRecords.has(key)) {
      this.rateLimitRecords.set(key, {
        businessNo,
        ruleId,
        version,
        windowStart,
        count: 0,
        firstRequestTime: null,
        lastRequestTime: null
      });
    }
    return this.rateLimitRecords.get(key);
  }

  incrementRateLimit(businessNo, ruleId, version, windowStart, requestTime) {
    const record = this.getRateLimitRecord(businessNo, ruleId, version, windowStart);
    record.count += 1;
    if (!record.firstRequestTime) {
      record.firstRequestTime = requestTime;
    }
    record.lastRequestTime = requestTime;
    return record;
  }

  getBusinessRecord(businessNo) {
    return this.businessRecords.get(businessNo) || null;
  }

  upsertBusinessRecord(businessNo, data) {
    const existing = this.businessRecords.get(businessNo) || {
      businessNo,
      status: 'active',
      materials: {},
      isLocked: false,
      lockReason: null,
      lockTime: null,
      lockedBy: null,
      pendingReview: false,
      reviewAssignee: null,
      createdAt: new Date().toISOString()
    };
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.businessRecords.set(businessNo, updated);
    return updated;
  }

  addAuditLog(log) {
    const auditLog = {
      logId: uuidv4(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.auditLogs.push(auditLog);
    return auditLog;
  }

  getAuditLogs(businessNo) {
    if (businessNo) {
      return this.auditLogs.filter(log => log.businessNo === businessNo);
    }
    return this.auditLogs;
  }

  getTraceRecord(traceId) {
    return this.auditLogs.find(log => log.traceId === traceId) || null;
  }

  isDuplicateSubmission(businessNo, idempotencyKey) {
    if (!idempotencyKey) return false;
    return this.auditLogs.some(
      log => log.businessNo === businessNo && log.idempotencyKey === idempotencyKey
    );
  }
}

module.exports = new DataStore();
