import { v4 as uuidv4 } from 'uuid';
import { VotingObject, ObjectType } from '../layers/object';
import { RiskLevel, RuleSet } from '../layers/rule';
import { StatusSnapshot, ObjectStatus, QualificationStatus } from '../layers/status';
import {
  AuditRecord,
  ActionType,
  RuleHitDetail,
  ReviewRecord
} from '../layers/record';
import {
  getStore,
  generateAuditNo,
  getAuditRecordsByBusinessId,
  addAuditRecord,
  seedDefaultRules,
  getNextTimestamp
} from '../store/datastore';
import {
  evaluateRule,
  evaluateTimeWindowRule,
  aggregateResults,
  generateNextAction,
  generateConclusion,
  RuleEvaluationContext
} from '../engine/ruleEngine';

export interface QualificationInput {
  businessId: string;
  objectStatus: ObjectStatus[];
  timeWindow: { start: string; end: string };
  ruleVersion: string;
  operatorId: string;
  operatorName: string;
  objectInfo: {
    type: ObjectType;
    name: string;
    idNumber: string;
    propertyAddress?: string;
    propertyArea?: number;
    ownerSince?: string;
    isVerified?: boolean;
  };
  materialChecklist: { [key: string]: boolean };
}

export interface QualificationOutput {
  businessId: string;
  auditNo: string;
  conclusion: string;
  riskLevel: RiskLevel;
  riskTags: string[];
  nextAction: string;
  qualificationStatus: QualificationStatus;
  passCount: number;
  totalCount: number;
  failureReasons: string[];
  requiresReview: boolean;
  ruleHitDetails: RuleHitDetail[];
  previousAuditNo?: string;
  isDuplicate: boolean;
  duplicateAuditNo?: string;
  timestamp: string;
}

export interface ReviewInput {
  auditNo: string;
  operatorId: string;
  operatorName: string;
  reviewResult: 'approve' | 'reject' | 'return';
  reviewComment: string;
}

export interface ReviewOutput {
  auditNo: string;
  reviewResult: string;
  reviewComment: string;
  reviewedBy: string;
  reviewedAt: string;
  newQualificationStatus?: QualificationStatus;
  newConclusion?: string;
  newNextAction?: string;
}

export function initializeService(): RuleSet {
  const store = getStore();
  if (store.ruleSets.size === 0) {
    return seedDefaultRules();
  }
  return store.ruleSets.get('ruleset-default')!;
}

export function checkDuplicate(
  businessId: string,
  ruleVersion: string,
  timeWindow: { start: string; end: string }
): AuditRecord | null {
  const records = getAuditRecordsByBusinessId(businessId);
  const recentRecords = records
    .filter(r => r.ruleVersion === ruleVersion)
    .filter(r => {
      const twStart = new Date(r.timeWindow.start).toISOString().split('T')[0];
      const twEnd = new Date(r.timeWindow.end).toISOString().split('T')[0];
      return twStart === timeWindow.start && twEnd === timeWindow.end;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return recentRecords.length > 0 ? recentRecords[0] : null;
}

export function createStatusSnapshot(
  input: QualificationInput,
  object: VotingObject
): StatusSnapshot {
  const store = getStore();
  const snapshot: StatusSnapshot = {
    id: uuidv4(),
    objectId: object.id,
    businessId: input.businessId,
    statuses: input.objectStatus,
    materialChecklist: { ...input.materialChecklist },
    riskScore: calculateRiskScore(input.objectStatus, input.materialChecklist),
    riskLevel: RiskLevel.LOW,
    timeWindow: {
      start: new Date(input.timeWindow.start),
      end: new Date(input.timeWindow.end)
    },
    properties: {
      type: input.objectInfo.type,
      isVerified: input.objectInfo.isVerified !== false,
      propertyArea: input.objectInfo.propertyArea,
      ownerSince: input.objectInfo.ownerSince
    },
    createdAt: getNextTimestamp()
  };
  store.statusSnapshots.set(snapshot.id, snapshot);
  return snapshot;
}

function calculateRiskScore(
  statuses: ObjectStatus[],
  materialChecklist: { [key: string]: boolean }
): number {
  let score = 0;
  if (statuses.includes(ObjectStatus.ARREARS)) score += 30;
  if (statuses.includes(ObjectStatus.PENDING_VERIFICATION)) score += 20;
  if (statuses.includes(ObjectStatus.MATERIAL_INCOMPLETE)) score += 25;
  if (statuses.includes(ObjectStatus.SUSPENDED)) score += 40;
  
  const missingMaterials = Object.values(materialChecklist).filter(v => !v).length;
  score += missingMaterials * 15;
  
  return Math.min(100, score);
}

export function getOrCreateObject(input: QualificationInput): VotingObject {
  const store = getStore();
  const existing = Array.from(store.objects.values()).find(
    o => o.idNumber === input.objectInfo.idNumber && o.businessId === input.businessId
  );
  
  if (existing) {
    existing.updatedAt = new Date();
    return existing;
  }
  
  const obj: VotingObject = {
    id: uuidv4(),
    businessId: input.businessId,
    type: input.objectInfo.type,
    name: input.objectInfo.name,
    idNumber: input.objectInfo.idNumber,
    propertyAddress: input.objectInfo.propertyAddress,
    propertyArea: input.objectInfo.propertyArea,
    ownerSince: input.objectInfo.ownerSince ? new Date(input.objectInfo.ownerSince) : undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  store.objects.set(obj.id, obj);
  return obj;
}

export function processQualification(input: QualificationInput): QualificationOutput {
  initializeService();

  const existingRecord = checkDuplicate(
    input.businessId,
    input.ruleVersion,
    input.timeWindow
  );

  const votingObject = getOrCreateObject(input);
  const statusSnapshot = createStatusSnapshot(input, votingObject);

  const store = getStore();
  const ruleSet = Array.from(store.ruleSets.values()).find(
    rs => rs.version === input.ruleVersion && rs.isActive
  ) || store.ruleSets.get('ruleset-default')!;

  const context: RuleEvaluationContext = {
    statusSnapshot,
    timeWindow: {
      start: new Date(input.timeWindow.start),
      end: new Date(input.timeWindow.end)
    },
    objectProperties: {
      type: input.objectInfo.type,
      isVerified: input.objectInfo.isVerified !== false,
      propertyArea: input.objectInfo.propertyArea,
      ownerSince: input.objectInfo.ownerSince
    }
  };

  const ruleHitDetails: RuleHitDetail[] = ruleSet.rules.map(rule => {
    let result;
    if (rule.type === 'time_window') {
      result = evaluateTimeWindowRule(rule, context);
    } else {
      result = evaluateRule(rule, context);
    }
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      isHit: result.isHit,
      riskLevel: result.riskLevel,
      riskTags: result.riskTags,
      requireReview: result.requireReview,
      message: result.message
    };
  });

  const aggregation = aggregateResults(ruleHitDetails);
  const conclusion = generateConclusion(
    aggregation.qualificationStatus,
    aggregation.passCount,
    aggregation.totalCount
  );
  const nextAction = generateNextAction(
    aggregation.qualificationStatus,
    aggregation.overallRiskLevel
  );

  const auditNo = generateAuditNo(input.businessId);
  const auditRecord: AuditRecord = {
    id: uuidv4(),
    auditNo,
    businessId: input.businessId,
    objectId: votingObject.id,
    ruleVersion: input.ruleVersion,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    actionType: existingRecord ? ActionType.RECHECK : ActionType.SUBMIT,
    qualificationStatus: aggregation.qualificationStatus,
    riskLevel: aggregation.overallRiskLevel,
    riskTags: aggregation.allRiskTags,
    conclusion,
    nextAction,
    failureReasons: aggregation.failureReasons,
    previousAuditNo: existingRecord?.auditNo,
    timeWindow: {
      start: new Date(input.timeWindow.start),
      end: new Date(input.timeWindow.end)
    },
    statusSnapshotId: statusSnapshot.id,
    ruleHitDetails,
    createdAt: getNextTimestamp(),
    updatedAt: getNextTimestamp()
  };

  addAuditRecord(auditRecord);

  return {
    businessId: input.businessId,
    auditNo,
    conclusion,
    riskLevel: aggregation.overallRiskLevel,
    riskTags: aggregation.allRiskTags,
    nextAction,
    qualificationStatus: aggregation.qualificationStatus,
    passCount: aggregation.passCount,
    totalCount: aggregation.totalCount,
    failureReasons: aggregation.failureReasons,
    requiresReview: aggregation.requiresReview,
    ruleHitDetails,
    previousAuditNo: existingRecord?.auditNo,
    isDuplicate: !!existingRecord,
    duplicateAuditNo: existingRecord?.auditNo,
    timestamp: new Date().toISOString()
  };
}

export function processReview(input: ReviewInput): ReviewOutput {
  const store = getStore();
  const auditRecord = Array.from(store.auditRecords.values()).find(
    r => r.auditNo === input.auditNo
  );

  if (!auditRecord) {
    throw new Error(`审核记录不存在: ${input.auditNo}`);
  }

  if (auditRecord.qualificationStatus !== QualificationStatus.PENDING_REVIEW) {
    throw new Error(`该记录状态为 ${auditRecord.qualificationStatus}，无需复核`);
  }

  let newStatus: QualificationStatus;
  let newConclusion: string;
  let newNextAction: string;

  switch (input.reviewResult) {
    case 'approve':
      newStatus = QualificationStatus.QUALIFIED;
      newConclusion = `复核通过：${input.reviewComment}`;
      newNextAction = '复核通过，可参与投票';
      break;
    case 'reject':
      newStatus = QualificationStatus.NOT_QUALIFIED;
      newConclusion = `复核驳回：${input.reviewComment}`;
      newNextAction = '复核驳回，不具备投票资格';
      break;
    case 'return':
      newStatus = QualificationStatus.PENDING_REVIEW;
      newConclusion = `复核退回补充材料：${input.reviewComment}`;
      newNextAction = '请补充材料后重新提交复核';
      break;
    default:
      throw new Error(`无效的复核结果: ${input.reviewResult}`);
  }

  auditRecord.qualificationStatus = newStatus;
  auditRecord.reviewComment = input.reviewComment;
  auditRecord.reviewOperatorId = input.operatorId;
  auditRecord.reviewTime = new Date();
  auditRecord.updatedAt = new Date();
  auditRecord.conclusion = newConclusion;
  auditRecord.nextAction = newNextAction;

  const reviewRecord: ReviewRecord = {
    id: uuidv4(),
    auditNo: input.auditNo,
    businessId: auditRecord.businessId,
    objectId: auditRecord.objectId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    reviewResult: input.reviewResult,
    reviewComment: input.reviewComment,
    reviewedAt: new Date()
  };

  store.reviewRecords.set(reviewRecord.id, reviewRecord);

  return {
    auditNo: input.auditNo,
    reviewResult: input.reviewResult,
    reviewComment: input.reviewComment,
    reviewedBy: input.operatorName,
    reviewedAt: new Date().toISOString(),
    newQualificationStatus: newStatus,
    newConclusion,
    newNextAction
  };
}

export function getAuditRecord(auditNo: string): AuditRecord | null {
  const store = getStore();
  return Array.from(store.auditRecords.values()).find(r => r.auditNo === auditNo) || null;
}

export function getAuditTrail(businessId: string): AuditRecord[] {
  return getAuditRecordsByBusinessId(businessId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getPendingReviews(): AuditRecord[] {
  const store = getStore();
  return Array.from(store.auditRecords.values())
    .filter(r => r.qualificationStatus === QualificationStatus.PENDING_REVIEW)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function validateInput(input: QualificationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.businessId || input.businessId.trim() === '') {
    errors.push('业务编号不能为空');
  }
  if (!input.ruleVersion || input.ruleVersion.trim() === '') {
    errors.push('规则版本不能为空');
  }
  if (!input.operatorId || input.operatorId.trim() === '') {
    errors.push('操作人ID不能为空');
  }
  if (!input.operatorName || input.operatorName.trim() === '') {
    errors.push('操作人姓名不能为空');
  }
  if (!input.timeWindow || !input.timeWindow.start || !input.timeWindow.end) {
    errors.push('时间窗口参数不完整');
  } else {
    const start = new Date(input.timeWindow.start);
    const end = new Date(input.timeWindow.end);
    if (isNaN(start.getTime())) {
      errors.push('时间窗口开始日期格式无效');
    }
    if (isNaN(end.getTime())) {
      errors.push('时间窗口结束日期格式无效');
    }
    if (start > end) {
      errors.push('时间窗口开始日期不能晚于结束日期');
    }
  }
  if (!input.objectStatus || !Array.isArray(input.objectStatus)) {
    errors.push('对象状态参数无效');
  }
  if (!input.objectInfo || !input.objectInfo.name) {
    errors.push('对象信息不完整：缺少姓名');
  }
  if (!input.objectInfo || !input.objectInfo.idNumber) {
    errors.push('对象信息不完整：缺少证件号');
  }

  return { valid: errors.length === 0, errors };
}
