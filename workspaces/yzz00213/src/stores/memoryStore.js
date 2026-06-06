class MemoryStore {
  constructor() {
    this.records = new Map();
    this.histories = new Map();
    this.auditIndex = new Map();
  }

  saveRecord(record) {
    this.records.set(record.recordId, record);
    if (record.auditNo) {
      this.auditIndex.set(record.auditNo, record.recordId);
    }
    return record;
  }

  getRecord(recordId) {
    return this.records.get(recordId) || null;
  }

  getRecordByAuditNo(auditNo) {
    const recordId = this.auditIndex.get(auditNo);
    return recordId ? this.records.get(recordId) : null;
  }

  findDuplicate(vehicleId, reportDate, batchNo) {
    for (const record of this.records.values()) {
      if (record.masterData && record.masterData.vehicleId === vehicleId &&
          record.application && record.application.reportDate === reportDate &&
          record.processStatus !== 'REJECTED' &&
          record.batchNo !== batchNo) {
        return record;
      }
    }
    return null;
  }

  saveHistory(recordId, historyEntry) {
    if (!this.histories.has(recordId)) {
      this.histories.set(recordId, []);
    }
    this.histories.get(recordId).push(historyEntry);
  }

  getHistories(recordId) {
    return this.histories.get(recordId) || [];
  }

  listRecords(filters = {}) {
    let results = Array.from(this.records.values());
    if (filters.batchNo) {
      results = results.filter(r => r.batchNo === filters.batchNo);
    }
    if (filters.processStatus) {
      results = results.filter(r => r.processStatus === filters.processStatus);
    }
    if (filters.vehicleId) {
      results = results.filter(r => r.masterData && r.masterData.vehicleId === filters.vehicleId);
    }
    return results;
  }
}

module.exports = new MemoryStore();
