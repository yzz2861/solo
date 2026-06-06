function createPassRecord(overrides = {}) {
  return {
    masterData: {
      cowId: 'COW001',
      cowName: '一号牛',
      barnId: 'BARN-A',
      batchNo: 'BATCH-2026-001',
      sampleDate: '2026-06-01',
      sampleTime: '08:00:00',
      farmId: 'FARM-001',
      milker: '张三'
    },
    applicationData: {
      sccValue: 200000,
      fatRate: 3.8,
      proteinRate: 3.2,
      lactoseRate: 4.8,
      totalBacteria: 50000,
      applicationNo: 'APP-2026-0001',
      applicant: '李四',
      applyDate: '2026-06-02'
    },
    evidenceList: [
      {
        type: 'TEST_REPORT',
        name: '检测报告.pdf',
        url: '/files/report-001.pdf',
        uploadTime: '2026-06-02 10:00:00'
      }
    ],
    historyList: [
      { sampleDate: '2026-05-20', sccValue: 180000, result: 'PASS' },
      { sampleDate: '2026-05-10', sccValue: 220000, result: 'PASS' },
      { sampleDate: '2026-04-30', sccValue: 190000, result: 'PASS' }
    ],
    threshold: {
      sccPass: 400000,
      sccWarning: 300000,
      historyExceedCount: 3,
      requireEvidence: true
    },
    ...overrides
  };
}

function createBlockRecord(overrides = {}) {
  const record = createPassRecord({
    ...overrides,
    masterData: {
      cowId: 'COW002',
      cowName: '二号牛',
      barnId: 'BARN-A',
      batchNo: 'BATCH-2026-002',
      sampleDate: '2026-06-01',
      sampleTime: '08:30:00',
      farmId: 'FARM-001',
      milker: '张三'
    },
    applicationData: {
      sccValue: 550000,
      fatRate: 3.5,
      proteinRate: 3.0,
      lactoseRate: 4.5,
      totalBacteria: 80000,
      applicationNo: 'APP-2026-0002',
      applicant: '李四',
      applyDate: '2026-06-02'
    },
    historyList: [
      { sampleDate: '2026-05-20', sccValue: 450000, result: 'BLOCK' },
      { sampleDate: '2026-05-10', sccValue: 480000, result: 'BLOCK' },
      { sampleDate: '2026-04-30', sccValue: 520000, result: 'BLOCK' }
    ],
    ...overrides
  });
  return record;
}

function createPendingReviewRecord(overrides = {}) {
  const record = createPassRecord({
    ...overrides,
    masterData: {
      cowId: 'COW003',
      cowName: '三号牛',
      barnId: 'BARN-B',
      batchNo: 'BATCH-2026-003',
      sampleDate: '2026-06-01',
      sampleTime: '09:00:00',
      farmId: 'FARM-001',
      milker: '王五'
    },
    applicationData: {
      sccValue: 450000,
      fatRate: 3.6,
      proteinRate: 3.1,
      lactoseRate: 4.7,
      totalBacteria: 60000,
      applicationNo: 'APP-2026-0003',
      applicant: '赵六',
      applyDate: '2026-06-02'
    },
    evidenceList: [
      {
        type: 'TEST_REPORT',
        name: '检测报告.pdf',
        url: '/files/report-003.pdf',
        uploadTime: '2026-06-02 11:00:00'
      }
    ],
    historyList: [
      { sampleDate: '2026-05-20', sccValue: 380000, result: 'PENDING_REVIEW' },
      { sampleDate: '2026-05-10', sccValue: 250000, result: 'PASS' },
      { sampleDate: '2026-04-30', sccValue: 300000, result: 'PASS' }
    ],
    ...overrides
  });
  return record;
}

function createNoEvidenceRecord(overrides = {}) {
  const record = createPassRecord({
    ...overrides,
    masterData: {
      cowId: 'COW004',
      cowName: '四号牛',
      barnId: 'BARN-B',
      batchNo: 'BATCH-2026-004',
      sampleDate: '2026-06-01',
      sampleTime: '09:30:00',
      farmId: 'FARM-001',
      milker: '王五'
    },
    applicationData: {
      sccValue: 350000,
      fatRate: 3.7,
      proteinRate: 3.2,
      lactoseRate: 4.8,
      totalBacteria: 55000,
      applicationNo: 'APP-2026-0004',
      applicant: '赵六',
      applyDate: '2026-06-02'
    },
    evidenceList: [],
    ...overrides
  });
  return record;
}

function createInvalidRecord() {
  return {
    masterData: null,
    applicationData: {
      sccValue: 'invalid-number'
    }
  };
}

module.exports = {
  createPassRecord,
  createBlockRecord,
  createPendingReviewRecord,
  createNoEvidenceRecord,
  createInvalidRecord
};
