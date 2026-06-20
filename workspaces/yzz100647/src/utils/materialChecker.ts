import {
  MaterialType,
  MaterialGap,
  GapStatus,
  Complaint,
} from '@/types';

interface MaterialRule {
  scenario: string;
  scenarioKey: string;
  materials: Array<{
    name: string;
    type: MaterialType | null;
    required: boolean;
    desc: string;
  }>;
}

export const REQUIRED_MATERIALS_RULES: MaterialRule[] = [
  {
    scenario: '质量问题投诉',
    scenarioKey: 'quality',
    materials: [
      { name: '商品问题照片', type: MaterialType.PRODUCT_PHOTO, required: true, desc: '清晰显示问题部位，多角度拍摄更佳' },
      { name: '购买凭证', type: MaterialType.PURCHASE_PROOF, required: true, desc: '订单截图或支付成功记录，需含订单号、商品、金额' },
      { name: '聊天沟通记录', type: MaterialType.CHAT_SCREENSHOT, required: false, desc: '与商家/客服的完整对话截图，时间线清晰' },
      { name: '检测报告', type: MaterialType.INSPECTION_REPORT, required: false, desc: '第三方或官方质检报告，需有盖章/签发日期' },
    ],
  },
  {
    scenario: '退换货投诉',
    scenarioKey: 'return',
    materials: [
      { name: '退换货申请单', type: MaterialType.RETURN_FORM, required: true, desc: '平台售后申请截图，含申请编号与原因' },
      { name: '快递面单照片', type: MaterialType.EXPRESS_PHOTO, required: true, desc: '寄出/收到快递的面单号清晰可见' },
      { name: '商品状态照片', type: MaterialType.PRODUCT_PHOTO, required: true, desc: '退货前商品完好/问题状态照片' },
      { name: '购买凭证', type: MaterialType.PURCHASE_PROOF, required: true, desc: '订单详情，含商品信息与交易时间' },
      { name: '聊天记录', type: MaterialType.CHAT_SCREENSHOT, required: false, desc: '与商家协商退换货的对话' },
    ],
  },
  {
    scenario: '物流投诉',
    scenarioKey: 'logistics',
    materials: [
      { name: '快递面单/外包装照片', type: MaterialType.EXPRESS_PHOTO, required: true, desc: '单号、破损情况、签收状态清晰' },
      { name: '购买凭证', type: MaterialType.PURCHASE_PROOF, required: true, desc: '订单信息、收件人信息、商品金额' },
      { name: '商品开箱照片', type: MaterialType.PRODUCT_PHOTO, required: false, desc: '如涉及破损，需开箱过程实拍' },
      { name: '物流沟通记录', type: MaterialType.CHAT_SCREENSHOT, required: false, desc: '与快递/商家的沟通截图' },
    ],
  },
  {
    scenario: '通用投诉',
    scenarioKey: 'general',
    materials: [
      { name: '购买凭证', type: MaterialType.PURCHASE_PROOF, required: true, desc: '投诉基础必备材料' },
      { name: '聊天记录', type: MaterialType.CHAT_SCREENSHOT, required: false, desc: '建议提供沟通记录以辅助判断' },
      { name: '相关照片/截图', type: null, required: false, desc: '其他支持投诉主张的材料' },
    ],
  },
];

export function detectScenario(
  recognitions: Record<string, { materialType: MaterialType }>,
): { scenarioKey: string; scenario: string; score: number }[] {
  const typeCounts: Record<string, number> = {};
  Object.values(recognitions).forEach((r) => {
    typeCounts[r.materialType] = (typeCounts[r.materialType] || 0) + 1;
  });

  return REQUIRED_MATERIALS_RULES.map((rule) => {
    let score = 0;
    rule.materials.forEach((m) => {
      if (m.type && typeCounts[m.type]) {
        score += m.required ? 2 : 1;
      }
    });
    if (rule.scenarioKey === 'general') score += 0.5;
    return { scenarioKey: rule.scenarioKey, scenario: rule.scenario, score };
  }).sort((a, b) => b.score - a.score);
}

export function checkMaterialGaps(
  complaint: Complaint,
  scenarioKey: string,
): MaterialGap[] {
  const rule = REQUIRED_MATERIALS_RULES.find((r) => r.scenarioKey === scenarioKey)
    || REQUIRED_MATERIALS_RULES[REQUIRED_MATERIALS_RULES.length - 1];

  const presentTypes = new Set(
    complaint.attachments.map((att) => complaint.recognitions[att.id]?.materialType),
  );

  const existingGapMap: Record<string, MaterialGap> = {};
  complaint.materialGaps.forEach((g) => { existingGapMap[g.materialName] = g; });

  return rule.materials.map((m) => {
    const existing = existingGapMap[m.name];
    const isPresent = m.type ? presentTypes.has(m.type) : complaint.attachments.length >= rule.materials.length;

    let status: GapStatus = GapStatus.MISSING;
    if (isPresent) status = GapStatus.MARKED_PROVIDED;
    if (existing?.status === GapStatus.WAIVED) status = GapStatus.WAIVED;
    if (existing?.status === GapStatus.MARKED_PROVIDED && !isPresent) status = GapStatus.MARKED_PROVIDED;

    return {
      id: existing?.id || `gap_${crypto.randomUUID()}`,
      complaintId: complaint.id,
      materialName: m.name,
      materialType: m.type,
      isRequired: m.required,
      description: m.desc,
      status,
      scenario: rule.scenario,
    };
  });
}
