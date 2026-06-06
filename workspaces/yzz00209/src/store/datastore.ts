import { VotingObject, ObjectType } from '../layers/object';
import { Rule, RuleSet, RuleType, RiskLevel } from '../layers/rule';
import { StatusSnapshot, ObjectStatus, QualificationStatus } from '../layers/status';
import { AuditRecord, ReviewRecord, ActionType } from '../layers/record';

export interface DataStore {
  objects: Map<string, VotingObject>;
  ruleSets: Map<string, RuleSet>;
  rules: Map<string, Rule>;
  statusSnapshots: Map<string, StatusSnapshot>;
  auditRecords: Map<string, AuditRecord>;
  auditRecordsByBusinessId: Map<string, string[]>;
  reviewRecords: Map<string, ReviewRecord>;
  businessAuditCount: Map<string, number>;
}

let lastTimestamp = 0;

export function getNextTimestamp(): Date {
  const now = Date.now();
  lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;
  return new Date(lastTimestamp);
}

const store: DataStore = {
  objects: new Map(),
  ruleSets: new Map(),
  rules: new Map(),
  statusSnapshots: new Map(),
  auditRecords: new Map(),
  auditRecordsByBusinessId: new Map(),
  reviewRecords: new Map(),
  businessAuditCount: new Map()
};

export function getStore(): DataStore {
  return store;
}

export function resetStore(): void {
  store.objects.clear();
  store.ruleSets.clear();
  store.rules.clear();
  store.statusSnapshots.clear();
  store.auditRecords.clear();
  store.auditRecordsByBusinessId.clear();
  store.reviewRecords.clear();
  store.businessAuditCount.clear();
  lastTimestamp = 0;
}

export function generateAuditNo(businessId: string): string {
  const count = (store.businessAuditCount.get(businessId) || 0) + 1;
  store.businessAuditCount.set(businessId, count);
  const timestamp = Date.now().toString(36);
  const seq = count.toString().padStart(4, '0');
  return `AUD-${businessId}-${timestamp}-${seq}`;
}

export function getAuditRecordsByBusinessId(businessId: string): AuditRecord[] {
  const ids = store.auditRecordsByBusinessId.get(businessId) || [];
  return ids.map(id => store.auditRecords.get(id)!).filter(Boolean);
}

export function addAuditRecord(record: AuditRecord): void {
  store.auditRecords.set(record.id, record);
  const existing = store.auditRecordsByBusinessId.get(record.businessId) || [];
  existing.push(record.id);
  store.auditRecordsByBusinessId.set(record.businessId, existing);
}

export function seedDefaultRules(): RuleSet {
  const now = new Date();
  
  const rules: Rule[] = [
    {
      id: 'rule-ownership-001',
      version: '1.0.0',
      name: '业主身份验证',
      description: '验证对象是否为产权登记的业主',
      type: RuleType.OWNERSHIP,
      conditions: [
        { field: 'type', operator: 'eq', value: ObjectType.OWNER }
      ],
      riskLevel: RiskLevel.HIGH,
      riskTags: ['身份存疑', '非业主'],
      passMessage: '确认业主身份',
      failMessage: '非产权业主，不具备投票资格',
      requireReview: true,
      isActive: true,
      createdAt: now,
      effectiveDate: now,
      expiryDate: undefined
    },
    {
      id: 'rule-timewindow-001',
      version: '1.0.0',
      name: '产权取得时间窗口',
      description: '业主须在投票基准日前取得产权满6个月',
      type: RuleType.TIME_WINDOW,
      conditions: [
        { field: 'ownerSince', operator: 'lte', value: null }
      ],
      riskLevel: RiskLevel.LOW,
      riskTags: ['新业主', '时间窗口'],
      passMessage: '产权取得时间符合要求',
      failMessage: '产权取得时间不足，需人工复核',
      requireReview: true,
      isActive: true,
      createdAt: now,
      effectiveDate: now
    },
    {
      id: 'rule-material-001',
      version: '1.0.0',
      name: '材料完整性检查',
      description: '验证身份证、房产证、授权书等材料是否齐全',
      type: RuleType.MATERIAL_COMPLETENESS,
      conditions: [
        { field: 'materialChecklist.idCard', operator: 'eq', value: true },
        { field: 'materialChecklist.propertyCert', operator: 'eq', value: true }
      ],
      riskLevel: RiskLevel.HIGH,
      riskTags: ['材料缺失', '证件不齐'],
      passMessage: '材料齐全',
      failMessage: '材料缺失，进入复核流程',
      requireReview: true,
      isActive: true,
      createdAt: now,
      effectiveDate: now
    },
    {
      id: 'rule-identity-001',
      version: '1.0.0',
      name: '身份实名认证',
      description: '验证是否已完成实名认证',
      type: RuleType.IDENTITY_VERIFICATION,
      conditions: [
        { field: 'statuses', operator: 'in', value: ObjectStatus.VERIFIED }
      ],
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['未实名', '身份待验'],
      passMessage: '已完成实名认证',
      failMessage: '未完成实名认证，需补充验证',
      requireReview: false,
      isActive: true,
      createdAt: now,
      effectiveDate: now
    },
    {
      id: 'rule-arrears-001',
      version: '1.0.0',
      name: '物业费拖欠检查',
      description: '检查是否存在物业费拖欠',
      type: RuleType.ARREARS,
      conditions: [
        { field: 'statuses', operator: 'not_in', value: ObjectStatus.ARREARS }
      ],
      riskLevel: RiskLevel.MEDIUM,
      riskTags: ['物业费拖欠', '欠费'],
      passMessage: '无物业费拖欠记录',
      failMessage: '存在物业费拖欠，需核实',
      requireReview: true,
      isActive: true,
      createdAt: now,
      effectiveDate: now
    },
    {
      id: 'rule-area-001',
      version: '1.0.0',
      name: '专有面积达标',
      description: '专有部分面积需达到投票门槛',
      type: RuleType.PROPERTY_AREA,
      conditions: [
        { field: 'propertyArea', operator: 'gt', value: 0 }
      ],
      riskLevel: RiskLevel.LOW,
      riskTags: ['面积异常'],
      passMessage: '专有面积信息完整',
      failMessage: '专有面积信息缺失',
      requireReview: false,
      isActive: true,
      createdAt: now,
      effectiveDate: now
    }
  ];

  rules.forEach(r => store.rules.set(r.id, r));

  const ruleSet: RuleSet = {
    id: 'ruleset-default',
    version: '1.0.0',
    name: '默认投票资格规则集',
    description: '业委会投票资格判定默认规则集，包含身份、材料、时间窗口等规则',
    rules: rules,
    isActive: true,
    createdAt: now
  };

  store.ruleSets.set(ruleSet.id, ruleSet);
  return ruleSet;
}
