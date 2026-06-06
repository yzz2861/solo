const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor() {
    this.batches = new Map();
    this.auditLogs = new Map();
    this.assessments = new Map();
  }

  saveBatch(batchNo, data) {
    const record = {
      batchNo,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.batches.set(batchNo, record);
    return record;
  }

  getBatch(batchNo) {
    return this.batches.get(batchNo) || null;
  }

  hasBatch(batchNo) {
    return this.batches.has(batchNo);
  }

  updateBatch(batchNo, updates) {
    const existing = this.batches.get(batchNo);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.batches.set(batchNo, updated);
    return updated;
  }

  saveAssessment(assessmentId, data) {
    const record = {
      assessmentId,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.assessments.set(assessmentId, record);
    return record;
  }

  getAssessment(assessmentId) {
    return this.assessments.get(assessmentId) || null;
  }

  findAssessmentsByPatient(patientId) {
    const results = [];
    for (const [, record] of this.assessments) {
      if (record.patientId === patientId) {
        results.push(record);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  addAuditLog(batchNo, logEntry) {
    const auditId = `AUD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const entry = {
      auditId,
      batchNo,
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    if (!this.auditLogs.has(batchNo)) {
      this.auditLogs.set(batchNo, []);
    }
    this.auditLogs.get(batchNo).push(entry);
    return entry;
  }

  getAuditLogs(batchNo) {
    return this.auditLogs.get(batchNo) || [];
  }

  getAllBatches() {
    return Array.from(this.batches.values());
  }

  getBatchCount() {
    return this.batches.size;
  }

  getStats() {
    const totalBatches = this.batches.size;
    const totalAssessments = this.assessments.size;
    const totalAuditLogs = Array.from(this.auditLogs.values())
      .reduce((sum, logs) => sum + logs.length, 0);

    let compliant = 0;
    let overThreshold = 0;
    let missing = 0;
    let duplicate = 0;
    let review = 0;

    for (const [, batch] of this.batches) {
      const conclusion = batch.conclusion;
      switch (conclusion) {
        case '合规通过':
        case '复核通过':
          compliant++;
          break;
        case '超阈值预警':
          overThreshold++;
          break;
        case '材料缺失':
          missing++;
          break;
        case '重复提交':
          duplicate++;
          break;
        case '待人工复核':
          review++;
          break;
        default:
          break;
      }
    }

    return {
      totalBatches,
      totalAssessments,
      totalAuditLogs,
      byConclusion: {
        compliant,
        overThreshold,
        missing,
        duplicate,
        review
      }
    };
  }

  clear() {
    this.batches.clear();
    this.auditLogs.clear();
    this.assessments.clear();
  }
}

const store = new MemoryStore();

module.exports = store;
