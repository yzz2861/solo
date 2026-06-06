const RuleEngine = require('../../src/rules/ruleEngine');
const { SubmissionRecord } = require('../../src/models');
const { RESULT_CODES, RULE_HIT_TYPES } = require('../../src/constants');
const {
  createPassRecord,
  createBlockRecord,
  createPendingReviewRecord,
  createNoEvidenceRecord
} = require('../helpers/testData');

describe('RuleEngine 规则引擎', () => {
  let ruleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    });
  });

  describe('单条检测', () => {
    test('体细胞数正常且材料齐全 → 通过 (PASS)', () => {
      const record = new SubmissionRecord(createPassRecord());
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.PASS);
      expect(result.needReview).toBe(false);
      expect(result.reason).toContain('检测通过');
      expect(result.ruleHits.length).toBe(0);
    });

    test('体细胞数超标且历史多次超标 → 拦截 (BLOCK)', () => {
      const record = new SubmissionRecord(createBlockRecord());
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.BLOCK);
      expect(result.needReview).toBe(false);
      expect(result.reason).toContain('拦截');

      const sccHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.SCC_EXCEED);
      const historyHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.HISTORY_REPEAT_EXCEED);
      expect(sccHit).toBeDefined();
      expect(historyHit).toBeDefined();
    });

    test('体细胞数超标但历史正常 → 待复核 (PENDING_REVIEW)', () => {
      const data = createPendingReviewRecord();
      data.historyList = [
        { sampleDate: '2026-05-20', sccValue: 200000, result: 'PASS' },
        { sampleDate: '2026-05-10', sccValue: 180000, result: 'PASS' }
      ];
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.PENDING_REVIEW);
      expect(result.needReview).toBe(true);
      expect(result.reviewStatus).toBe('PENDING');
      expect(result.reason).toContain('需人工复核');
    });

    test('体细胞数超标且佐证材料不全 → 待复核 (PENDING_REVIEW)', () => {
      const data = createPendingReviewRecord();
      data.evidenceList = [];
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.PENDING_REVIEW);
      expect(result.needReview).toBe(true);

      const evidenceHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.EVIDENCE_INCOMPLETE);
      expect(evidenceHit).toBeDefined();
    });

    test('体细胞数接近阈值（警戒值）→ 通过但带警示', () => {
      const data = createPassRecord();
      data.applicationData.sccValue = 350000;
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.PASS);
      expect(result.needReview).toBe(false);

      const warningHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.SCC_WARNING);
      expect(warningHit).toBeDefined();
      expect(warningHit.severity).toBe('medium');
    });

    test('佐证材料不全但体细胞正常 → 通过（需补充材料）', () => {
      const data = createNoEvidenceRecord();
      data.applicationData.sccValue = 200000;
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      expect(result.resultCode).toBe(RESULT_CODES.PASS);
      expect(result.needReview).toBe(false);

      const evidenceHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.EVIDENCE_INCOMPLETE);
      expect(evidenceHit).toBeDefined();
    });

    test('重复提交检测', () => {
      const record = new SubmissionRecord(createPassRecord());
      const processedKeys = new Set([record.getBusinessKey()]);

      const result = ruleEngine.evaluate(record, processedKeys);

      expect(result.resultCode).toBe(RESULT_CODES.DUPLICATE);
      expect(result.needReview).toBe(false);

      const dupHit = result.ruleHits.find(r => r.type === RULE_HIT_TYPES.DUPLICATE_SUBMISSION);
      expect(dupHit).toBeDefined();
    });
  });

  describe('规则命中分类', () => {
    test('命中规则包含 type、label、detail、severity 四个字段', () => {
      const data = createBlockRecord();
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      result.ruleHits.forEach(hit => {
        expect(hit).toHaveProperty('type');
        expect(hit).toHaveProperty('label');
        expect(hit).toHaveProperty('detail');
        expect(hit).toHaveProperty('severity');
      });
    });

    test('严重性等级分为 high、medium、info 三档', () => {
      const data = createBlockRecord();
      data.evidenceList = [];
      const record = new SubmissionRecord(data);
      const result = ruleEngine.evaluate(record);

      const severities = result.ruleHits.map(r => r.severity);
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
    });
  });
});
