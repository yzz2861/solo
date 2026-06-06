export interface RiskTag {
  code: string;
  name: string;
  level: 'high' | 'medium' | 'low';
  category: string;
  description: string;
}

export const RISK_TAG_DEFINITIONS: RiskTag[] = [
  {
    code: 'HIGH_RISK_DRUG',
    name: '高风险药品',
    level: 'high',
    category: 'drug_risk',
    description: '包含高风险麻醉药品，需重点关注',
  },
  {
    code: 'CONTROLLED_LEVEL_3',
    name: '三级管制',
    level: 'high',
    category: 'drug_risk',
    description: '包含三级及以上管制药品',
  },
  {
    code: 'MATERIAL_MISSING',
    name: '材料缺失',
    level: 'medium',
    category: 'material',
    description: '缺少必需的佐证材料',
  },
  {
    code: 'QUANTITY_EXCEEDED',
    name: '超量',
    level: 'high',
    category: 'threshold',
    description: '交接数量或金额超过阈值',
  },
  {
    code: 'HISTORY_RISK',
    name: '历史风险',
    level: 'medium',
    category: 'history',
    description: '存在历史高风险或多次被驳回记录',
  },
  {
    code: 'DEVIATION_HIGH',
    name: '偏离度高',
    level: 'low',
    category: 'quantity',
    description: '药品剩余量偏离正常范围',
  },
  {
    code: 'MULTIPLE_REVIEWS',
    name: '多次复核',
    level: 'medium',
    category: 'history',
    description: '已多次进入复核流程',
  },
];

export function getRiskTagInfo(code: string): RiskTag | undefined {
  return RISK_TAG_DEFINITIONS.find((tag) => tag.name === code || tag.code === code);
}

export function getRiskLevel(tags: string[]): 'high' | 'medium' | 'low' {
  let highest: 'low' | 'medium' | 'high' = 'low';
  for (const tag of tags) {
    const info = getRiskTagInfo(tag);
    if (info) {
      if (info.level === 'high') return 'high';
      if (info.level === 'medium') highest = 'medium';
    }
  }
  return highest;
}
