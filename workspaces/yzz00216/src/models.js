const { v4: uuidv4 } = require('uuid');
const { DEFAULT_THRESHOLD, RESULT_CODES, REVIEW_STATUS } = require('./constants');

class SubmissionRecord {
  constructor(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('提交数据必须是对象');
    }
    this.id = data.id || uuidv4();
    this.masterData = data.masterData || {};
    this.applicationData = data.applicationData || {};
    this.evidenceList = data.evidenceList || [];
    this.historyList = data.historyList || [];
    this.threshold = { ...DEFAULT_THRESHOLD, ...(data.threshold || {}) };
    this.submittedAt = data.submittedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.masterData || typeof this.masterData !== 'object') {
      errors.push('缺少主数据 masterData');
    } else {
      if (!this.masterData.cowId) errors.push('主数据缺少牛只ID (cowId)');
      if (!this.masterData.batchNo) errors.push('主数据缺少批次号 (batchNo)');
      if (!this.masterData.sampleDate) errors.push('主数据缺少采样日期 (sampleDate)');
    }

    if (!this.applicationData || typeof this.applicationData !== 'object') {
      errors.push('缺少申请数据 applicationData');
    } else {
      if (this.applicationData.sccValue === undefined || this.applicationData.sccValue === null) {
        errors.push('申请数据缺少体细胞数 (sccValue)');
      } else if (isNaN(parseInt(this.applicationData.sccValue, 10))) {
        errors.push('体细胞数 sccValue 不是有效数字');
      } else if (parseInt(this.applicationData.sccValue, 10) < 0) {
        errors.push('体细胞数 sccValue 不能为负数');
      }
    }

    if (!Array.isArray(this.evidenceList)) {
      errors.push('佐证材料 evidenceList 必须是数组');
    }

    if (!Array.isArray(this.historyList)) {
      errors.push('历史记录 historyList 必须是数组');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getBusinessKey() {
    const { cowId, batchNo, sampleDate } = this.masterData;
    return `${cowId || ''}_${batchNo || ''}_${sampleDate || ''}`;
  }

  getSccValue() {
    return parseInt(this.applicationData.sccValue, 10) || 0;
  }

  getHistoryExceedCount() {
    if (!Array.isArray(this.historyList)) return 0;
    const passLine = this.threshold.sccPass || DEFAULT_THRESHOLD.sccPass;
    return this.historyList.filter(h => (h.sccValue || 0) > passLine).length;
  }

  isEvidenceComplete() {
    if (!this.threshold.requireEvidence) return true;
    if (!Array.isArray(this.evidenceList)) return false;
    return this.evidenceList.length > 0;
  }
}

class DetectionResult {
  constructor(record, options = {}) {
    this.id = options.id || uuidv4();
    this.recordId = record.id;
    this.businessKey = record.getBusinessKey();
    this.resultCode = options.resultCode || RESULT_CODES.PASS;
    this.reason = options.reason || '';
    this.ruleHits = options.ruleHits || [];
    this.needReview = options.needReview || false;
    this.reviewStatus = options.reviewStatus || null;
    this.reviewedAt = options.reviewedAt || null;
    this.reviewer = options.reviewer || null;
    this.reviewComment = options.reviewComment || null;
    this.processedAt = options.processedAt || new Date().toISOString();
    this.masterDataSnapshot = { ...record.masterData };
    this.sccValue = record.getSccValue();
  }

  toJSON() {
    return {
      id: this.id,
      recordId: this.recordId,
      businessKey: this.businessKey,
      resultCode: this.resultCode,
      resultLabel: this.getResultLabel(),
      reason: this.reason,
      ruleHits: this.ruleHits,
      needReview: this.needReview,
      reviewStatus: this.reviewStatus,
      reviewedAt: this.reviewedAt,
      reviewer: this.reviewer,
      reviewComment: this.reviewComment,
      processedAt: this.processedAt,
      masterData: this.masterDataSnapshot,
      sccValue: this.sccValue
    };
  }

  getResultLabel() {
    const { RESULT_LABELS } = require('./constants');
    return RESULT_LABELS[this.resultCode] || this.resultCode;
  }
}

class BatchResult {
  constructor(batchId, total = 0) {
    this.batchId = batchId || uuidv4();
    this.total = total;
    this.passCount = 0;
    this.blockCount = 0;
    this.pendingReviewCount = 0;
    this.duplicateCount = 0;
    this.invalidCount = 0;
    this.results = [];
    this.badRows = [];
    this.createdAt = new Date().toISOString();
  }

  addResult(result) {
    this.results.push(result);
    switch (result.resultCode) {
      case RESULT_CODES.PASS:
        this.passCount++;
        break;
      case RESULT_CODES.BLOCK:
        this.blockCount++;
        break;
      case RESULT_CODES.PENDING_REVIEW:
        this.pendingReviewCount++;
        break;
      case RESULT_CODES.DUPLICATE:
        this.duplicateCount++;
        break;
      case RESULT_CODES.INVALID:
        this.invalidCount++;
        break;
    }
  }

  addBadRow(rowIndex, rowData, error) {
    this.badRows.push({
      rowIndex,
      rowData,
      error: error.message || String(error)
    });
  }

  toJSON() {
    return {
      batchId: this.batchId,
      total: this.total,
      summary: {
        pass: this.passCount,
        block: this.blockCount,
        pendingReview: this.pendingReviewCount,
        duplicate: this.duplicateCount,
        invalid: this.invalidCount,
        badRows: this.badRows.length
      },
      results: this.results.map(r => (typeof r.toJSON === 'function' ? r.toJSON() : r)),
      badRows: this.badRows,
      createdAt: this.createdAt
    };
  }
}

module.exports = {
  SubmissionRecord,
  DetectionResult,
  BatchResult
};
