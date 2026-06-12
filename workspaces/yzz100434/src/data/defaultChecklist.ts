import type { AuditChecklistItem } from '@/types'

const licenseItems: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>[] = [
  {
    id: 'lic-001',
    category: 'license',
    name: '营业执照',
    description: '有效期内营业执照正副本',
    requiredFiles: ['营业执照'],
    starred: false,
    expiryDate: '',
  },
  {
    id: 'lic-002',
    category: 'license',
    name: '生产许可证',
    description: '生产许可证正副本及年审记录',
    requiredFiles: ['生产许可证'],
    starred: false,
  },
  {
    id: 'lic-003',
    category: 'license',
    name: '出口许可证',
    description: '出口许可证及备案记录',
    requiredFiles: ['出口许可证'],
    starred: false,
  },
  {
    id: 'lic-004',
    category: 'license',
    name: 'ISO 9001证书',
    description: 'ISO 9001质量管理体系认证证书',
    requiredFiles: ['ISO', '9001'],
    starred: false,
    expiryDate: '',
  },
  {
    id: 'lic-005',
    category: 'license',
    name: 'ISO 14001证书',
    description: 'ISO 14001环境管理体系认证证书',
    requiredFiles: ['ISO', '14001'],
    starred: false,
    expiryDate: '',
  },
  {
    id: 'lic-006',
    category: 'license',
    name: '消防安全检查合格证',
    description: '消防部门出具的消防安全检查合格证明',
    requiredFiles: ['消防', '合格证'],
    starred: true,
    expiryDate: '',
  },
]

const trainingItems: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>[] = [
  {
    id: 'trn-001',
    category: 'training',
    name: '新员工入职培训签到表',
    description: '近12个月新员工入职培训签到记录',
    requiredFiles: ['培训', '签到', '新员工'],
    starred: false,
    expectedPages: 12,
  },
  {
    id: 'trn-002',
    category: 'training',
    name: '消防安全培训签到表',
    description: '年度消防安全培训签到记录',
    requiredFiles: ['消防', '培训', '签到'],
    starred: true,
    expectedPages: 6,
  },
  {
    id: 'trn-003',
    category: 'training',
    name: '安全操作培训签到表',
    description: '岗位安全操作培训签到记录',
    requiredFiles: ['安全', '培训', '签到'],
    starred: false,
    expectedPages: 6,
  },
  {
    id: 'trn-004',
    category: 'training',
    name: '特种作业人员培训记录',
    description: '电工/焊工/叉车等特种作业培训及持证记录',
    requiredFiles: ['特种', '培训'],
    starred: true,
  },
]

const fireSafetyItems: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>[] = [
  {
    id: 'fir-001',
    category: 'fire_safety',
    name: '消防巡检记录',
    description: '月度消防设施巡检记录表',
    requiredFiles: ['消防', '巡检'],
    starred: true,
    expectedPages: 12,
  },
  {
    id: 'fir-002',
    category: 'fire_safety',
    name: '灭火器检查记录',
    description: '灭火器月度检查及维护记录',
    requiredFiles: ['灭火器', '检查'],
    starred: false,
    expectedPages: 12,
  },
  {
    id: 'fir-003',
    category: 'fire_safety',
    name: '消防演练记录',
    description: '年度消防演练方案、签到及总结报告',
    requiredFiles: ['消防', '演练'],
    starred: true,
    expectedPages: 6,
  },
  {
    id: 'fir-004',
    category: 'fire_safety',
    name: '应急疏散预案',
    description: '应急疏散预案及更新记录',
    requiredFiles: ['疏散', '预案'],
    starred: false,
  },
]

const employeeItems: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>[] = [
  {
    id: 'emp-001',
    category: 'employee',
    name: '员工花名册',
    description: '当前在册员工花名册（含入职日期、岗位）',
    requiredFiles: ['花名册'],
    starred: true,
  },
  {
    id: 'emp-002',
    category: 'employee',
    name: '劳动合同',
    description: '员工劳动合同样本及签订情况汇总',
    requiredFiles: ['劳动合同'],
    starred: false,
  },
  {
    id: 'emp-003',
    category: 'employee',
    name: '社保缴纳凭证',
    description: '近12个月社保缴纳凭证',
    requiredFiles: ['社保'],
    starred: false,
    expectedPages: 12,
  },
  {
    id: 'emp-004',
    category: 'employee',
    name: '工资发放记录',
    description: '近12个月工资发放银行流水或签收记录',
    requiredFiles: ['工资'],
    starred: false,
    expectedPages: 12,
  },
  {
    id: 'emp-005',
    category: 'employee',
    name: '未成年工/女职工特殊保护记录',
    description: '未成年工登记及女职工特殊保护措施记录',
    requiredFiles: ['未成年', '女职工'],
    starred: true,
  },
]

const rectificationItems: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>[] = [
  {
    id: 'rec-001',
    category: 'rectification',
    name: '上次验厂整改记录',
    description: '上次验厂不符合项及整改完成记录',
    requiredFiles: ['验厂', '整改'],
    starred: true,
  },
  {
    id: 'rec-002',
    category: 'rectification',
    name: '客户投诉整改记录',
    description: '客户投诉及整改措施记录',
    requiredFiles: ['投诉', '整改'],
    starred: false,
  },
  {
    id: 'rec-003',
    category: 'rectification',
    name: '不符合项整改报告',
    description: '内部审核/外部审核不符合项整改报告',
    requiredFiles: ['不符合', '整改'],
    starred: true,
  },
]

function buildChecklistItem(
  item: Omit<AuditChecklistItem, 'status' | 'matchedFiles' | 'alerts'>
): AuditChecklistItem {
  return {
    ...item,
    status: 'missing' as const,
    matchedFiles: [],
    alerts: [],
  }
}

export function getDefaultChecklist(): AuditChecklistItem[] {
  const allItems = [
    ...licenseItems,
    ...trainingItems,
    ...fireSafetyItems,
    ...employeeItems,
    ...rectificationItems,
  ]
  return allItems.map(buildChecklistItem)
}
