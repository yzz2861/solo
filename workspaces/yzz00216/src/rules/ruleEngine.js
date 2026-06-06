const {
  RESULT_CODES,
  RESULT_LABELS,
  RULE_HIT_TYPES,
  RULE_HIT_LABELS,
  REVIEW_STATUS
} = require('../constants');
const { SubmissionRecord, DetectionResult } = require('../models');

class RuleEngine {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  evaluate(record, processedKeys = new Set()) {
    if (!(record instanceof SubmissionRecord)) {
      record = new SubmissionRecord(record);
    }

    const ruleHits = [];
    const sccValue = record.getSccValue();
    const threshold = record.threshold;
    const businessKey = record.getBusinessKey();

    this.logger.info(`[规则引擎] 开始检测 - 业务键: ${businessKey}, 体细胞数: ${sccValue}`);

    const duplicateResult = this.checkDuplicate(businessKey, processedKeys);
    if (duplicateResult) {
      ruleHits.push(duplicateResult);
      const result = new DetectionResult(record, {
        resultCode: RESULT_CODES.DUPLICATE,
        reason: `检测到重复提交：${businessKey}`,
        ruleHits,
        needReview: false
      });
      this.logger.warn(`[规则引擎] 重复提交 - ${businessKey}`);
      return result;
    }

    const sccResult = this.checkScc(sccValue, threshold);
    if (sccResult) ruleHits.push(sccResult);

    const historyResult = this.checkHistory(record);
    if (historyResult) ruleHits.push(historyResult);

    const evidenceResult = this.checkEvidence(record);
    if (evidenceResult) ruleHits.push(evidenceResult);

    const finalResult = this.determineFinalResult(record, ruleHits);

    this.logger.info(`[规则引擎] 检测完成 - 结果: ${finalResult.resultCode}, 命中规则: ${ruleHits.map(r => r.type).join(', ') || '无'}`);

    return finalResult;
  }

  checkScc(sccValue, threshold) {
    if (sccValue > threshold.sccPass) {
      return {
        type: RULE_HIT_TYPES.SCC_EXCEED,
        label: RULE_HIT_LABELS.SCC_EXCEED,
        detail: `体细胞数 ${sccValue} 超过阈值 ${threshold.sccPass}`,
        severity: 'high'
      };
    }
    if (sccValue > threshold.sccWarning) {
      return {
        type: RULE_HIT_TYPES.SCC_WARNING,
        label: RULE_HIT_LABELS.SCC_WARNING,
        detail: `体细胞数 ${sccValue} 接近阈值 ${threshold.sccPass}（警戒值 ${threshold.sccWarning}）`,
        severity: 'medium'
      };
    }
    return null;
  }

  checkHistory(record) {
    const exceedCount = record.getHistoryExceedCount();
    const threshold = record.threshold.historyExceedCount;
    if (exceedCount >= threshold) {
      return {
        type: RULE_HIT_TYPES.HISTORY_REPEAT_EXCEED,
        label: RULE_HIT_LABELS.HISTORY_REPEAT_EXCEED,
        detail: `历史 ${exceedCount} 次超标，超过阈值 ${threshold} 次`,
        severity: 'high'
      };
    }
    return null;
  }

  checkEvidence(record) {
    if (!record.isEvidenceComplete()) {
      return {
        type: RULE_HIT_TYPES.EVIDENCE_INCOMPLETE,
        label: RULE_HIT_LABELS.EVIDENCE_INCOMPLETE,
        detail: '佐证材料缺失或不完整',
        severity: 'medium'
      };
    }
    return null;
  }

  checkDuplicate(businessKey, processedKeys) {
    if (processedKeys && processedKeys.has(businessKey)) {
      return {
        type: RULE_HIT_TYPES.DUPLICATE_SUBMISSION,
        label: RULE_HIT_LABELS.DUPLICATE_SUBMISSION,
        detail: `业务键 ${businessKey} 已在本批次中处理过`,
        severity: 'info'
      };
    }
    return null;
  }

  determineFinalResult(record, ruleHits) {
    const hasHighSeverity = ruleHits.some(r => r.severity === 'high');
    const hasMediumSeverity = ruleHits.some(r => r.severity === 'medium');
    const hasSccExceed = ruleHits.some(r => r.type === RULE_HIT_TYPES.SCC_EXCEED);
    const hasHistoryRepeat = ruleHits.some(r => r.type === RULE_HIT_TYPES.HISTORY_REPEAT_EXCEED);
    const hasEvidenceIssue = ruleHits.some(r => r.type === RULE_HIT_TYPES.EVIDENCE_INCOMPLETE);
    const hasSccWarning = ruleHits.some(r => r.type === RULE_HIT_TYPES.SCC_WARNING);

    let resultCode;
    let needReview = false;
    let reason = '';

    if (hasSccExceed && hasHistoryRepeat) {
      resultCode = RESULT_CODES.BLOCK;
      reason = '体细胞数超标且历史多次超标，予以拦截';
    } else if (hasSccExceed && hasEvidenceIssue) {
      resultCode = RESULT_CODES.PENDING_REVIEW;
      needReview = true;
      reason = '体细胞数超标且佐证材料不完整，需人工复核';
    } else if (hasSccExceed) {
      resultCode = RESULT_CODES.PENDING_REVIEW;
      needReview = true;
      reason = '体细胞数超标，需人工复核确认';
    } else if (hasHistoryRepeat && hasMediumSeverity) {
      resultCode = RESULT_CODES.PENDING_REVIEW;
      needReview = true;
      reason = '历史多次超标且存在中风险项，需人工复核';
    } else if (hasEvidenceIssue && hasSccWarning) {
      resultCode = RESULT_CODES.PENDING_REVIEW;
      needReview = true;
      reason = '体细胞数接近阈值且佐证材料不完整，需人工复核';
    } else if (hasSccWarning || hasEvidenceIssue) {
      resultCode = RESULT_CODES.PASS;
      reason = hasSccWarning
        ? '体细胞数接近阈值，予以通过（需关注）'
        : '佐证材料不完整但体细胞数正常，予以通过（需补充材料）';
    } else {
      resultCode = RESULT_CODES.PASS;
      reason = '检测通过，各项指标正常';
    }

    const result = new DetectionResult(record, {
      resultCode,
      reason,
      ruleHits,
      needReview,
      reviewStatus: needReview ? REVIEW_STATUS.PENDING : null
    });

    return result;
  }

  evaluateBatch(records) {
    const { BatchResult } = require('../models');
    const batchResult = new BatchResult(null, records.length);
    const processedKeys = new Set();

    records.forEach((recordData, index) => {
      try {
        const record = new SubmissionRecord(recordData);
        const businessKey = record.getBusinessKey();

        if (processedKeys.has(businessKey)) {
          const dupResult = this.evaluate(record, processedKeys);
          batchResult.addResult(dupResult);
          return;
        }

        const result = this.evaluate(record, processedKeys);
        batchResult.addResult(result);
        processedKeys.add(businessKey);
      } catch (error) {
        this.logger.error(`[规则引擎] 第 ${index + 1} 行处理失败: ${error.message}`);
        batchResult.addBadRow(index, recordData, error);
      }
    });

    this.logger.info(`[规则引擎] 批量处理完成 - 总数: ${batchResult.total}, 通过: ${batchResult.passCount}, 拦截: ${batchResult.blockCount}, 待复核: ${batchResult.pendingReviewCount}, 重复: ${batchResult.duplicateCount}, 坏行: ${batchResult.badRows.length}`);

    return batchResult;
  }
}

module.exports = RuleEngine;
