import {
  MaterialType,
  LowConfidenceReason,
  Attachment,
  RecognitionResult,
} from '@/types';

interface KeywordRule {
  type: MaterialType;
  keywords: string[];
  highConfidenceKeywords?: string[];
  weight: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    type: MaterialType.CHAT_SCREENSHOT,
    weight: 1,
    highConfidenceKeywords: ['微信', '旺旺', '千牛', '聊天记录', '聊天截图', '对话记录'],
    keywords: [
      '客服', '亲', '您好', '你好', '在吗', '请问', '抱歉', '亲的',
      '已读', '发送', '消息', '回复', '聊天', '会话', '对话',
      '买家', '卖家', '商家', '旺旺', '叮咚',
    ],
  },
  {
    type: MaterialType.INSPECTION_REPORT,
    weight: 1.3,
    highConfidenceKeywords: ['质检报告', '检测报告', '鉴定报告', '检测单', '质量检测', 'CNAS', 'CMA'],
    keywords: [
      '检测', '质检', '鉴定', '报告', '检验', '合格', '不合格',
      '质量', '检测结果', '实测值', '标准值', '送检', '样品',
      '检测机构', '检验员', '签发', '盖章',
    ],
  },
  {
    type: MaterialType.EXPRESS_PHOTO,
    weight: 1.2,
    highConfidenceKeywords: ['快递面单', '运单号', '物流单号', '中通快递', '顺丰速运', '圆通速递', '韵达快递'],
    keywords: [
      '快递', '物流', '面单', '运单', '单号', '包裹', '发货',
      '收件人', '寄件人', '收货人', '地址', '电话',
      '中通', '圆通', '申通', '韵达', '顺丰', '极兔', '京东物流',
      '外包装', '包装', '破损', '开箱', '封条',
    ],
  },
  {
    type: MaterialType.PURCHASE_PROOF,
    weight: 1.3,
    highConfidenceKeywords: ['订单详情', '支付成功', '支付宝', '微信支付', '交易快照', '订单编号'],
    keywords: [
      '订单', '购买', '下单', '支付', '付款', '金额', '实付',
      '商品', '价格', '￥', '¥', '合计', '总计', '交易',
      '店铺', '卖家', '购买日期', '下单时间', '发货时间',
      '支付宝', '微信支付', '银行卡', '付款成功', '支付成功',
      '确认收货', '申请退款', '售后',
    ],
  },
  {
    type: MaterialType.PRODUCT_PHOTO,
    weight: 0.9,
    highConfidenceKeywords: ['瑕疵', '破损', '划痕', '色差', '变形', '质量问题', '实拍图'],
    keywords: [
      '商品', '产品', '实物', '实拍', '照片', '图片',
      '破损', '划痕', '瑕疵', '裂缝', '掉色', '色差', '变形',
      '做工', '线头', '开胶', '漏液', '损坏', '质量',
    ],
  },
  {
    type: MaterialType.RETURN_FORM,
    weight: 1.1,
    highConfidenceKeywords: ['退换货申请', '退款申请', '售后申请', '退货单号'],
    keywords: [
      '退货', '换货', '退款', '售后', '申请', '原因',
      '退款金额', '退货地址', '拒绝', '同意', '处理中',
      '七天无理由', '退运费', '退换货',
    ],
  },
];

export interface TypeScore {
  type: MaterialType;
  score: number;
  matchedKeywords: string[];
}

export function scoreMaterialTypes(text: string): TypeScore[] {
  const normalized = text.toLowerCase();
  const scores: TypeScore[] = KEYWORD_RULES.map((rule) => {
    let score = 0;
    const matched: string[] = [];

    rule.highConfidenceKeywords?.forEach((kw) => {
      if (normalized.includes(kw.toLowerCase())) {
        score += 3;
        matched.push(kw);
      }
    });

    rule.keywords.forEach((kw) => {
      if (normalized.includes(kw.toLowerCase())) {
        score += 1;
        matched.push(kw);
      }
    });

    return {
      type: rule.type,
      score: score * rule.weight,
      matchedKeywords: Array.from(new Set(matched)),
    };
  });

  return scores.sort((a, b) => b.score - a.score);
}

export function recognizeMaterial(
  attachment: Attachment,
  allAttachments: Attachment[],
): RecognitionResult {
  const combinedText = `${attachment.ocrText || ''}\n${attachment.description || ''}\n${attachment.originalName || ''}`;
  const textLength = combinedText.replace(/\s/g, '').length;
  const scores = scoreMaterialTypes(combinedText);

  const topScore = scores[0]?.score ?? 0;
  const secondScore = scores[1]?.score ?? 0;
  const lowConfidenceReasons: LowConfidenceReason[] = [];

  let materialType = MaterialType.UNKNOWN;
  let materialConfidence = 0;

  if (textLength < 15) {
    lowConfidenceReasons.push(LowConfidenceReason.LOW_TEXT_VOLUME);
  }

  if (topScore > 0) {
    materialType = scores[0].type;
    const scoreDiff = topScore - secondScore;
    if (scoreDiff < 1.5) {
      materialConfidence = Math.min(0.55, topScore / 10);
      lowConfidenceReasons.push(LowConfidenceReason.TYPE_UNCERTAIN);
    } else if (scoreDiff < 3) {
      materialConfidence = Math.min(0.75, 0.55 + topScore / 20);
    } else {
      materialConfidence = Math.min(0.97, 0.75 + topScore / 30);
    }
  } else {
    materialConfidence = 0.05;
    lowConfidenceReasons.push(LowConfidenceReason.TYPE_UNCERTAIN);
  }

  const extractedInfo = extractOrderClues(combinedText);
  let orderNoConfidence = extractedInfo.confidence;

  if (extractedInfo.isPartial) {
    lowConfidenceReasons.push(LowConfidenceReason.ORDER_NO_UNCLEAR);
    orderNoConfidence = Math.max(0.15, orderNoConfidence - 0.35);
  }
  if (!extractedInfo.orderNo) {
    orderNoConfidence = 0;
  }

  if (attachment.ocrText) {
    const croppedIndicators = [
      '...', '……', '（未完）', '(未完)', '接上图', '接下图',
      '部分截图', '截了部分', '截不全',
    ];
    if (croppedIndicators.some((ind) => combinedText.includes(ind)) || textLength < 8) {
      if (!lowConfidenceReasons.includes(LowConfidenceReason.CROPPED) && textLength < 30) {
        lowConfidenceReasons.push(LowConfidenceReason.CROPPED);
      }
    }
  }

  let groupId: number | null = null;
  const sameTypeSiblings = allAttachments.filter(
    (a) =>
      a.id !== attachment.id &&
      (scoreMaterialTypes(`${a.ocrText || ''}${a.description || ''}`)[0]?.type === materialType ||
        materialType !== MaterialType.UNKNOWN),
  );
  if (materialType !== MaterialType.UNKNOWN && sameTypeSiblings.length >= 1) {
    lowConfidenceReasons.push(LowConfidenceReason.MULTIPLE_PAGES);
  }

  const sortOrder = getSortOrderForType(materialType);

  return {
    attachmentId: attachment.id,
    materialType,
    materialConfidence: Math.round(materialConfidence * 100) / 100,
    extractedOrderNo: extractedInfo.orderNo || '',
    orderNoConfidence: Math.round(orderNoConfidence * 100) / 100,
    lowConfidenceReasons: Array.from(new Set(lowConfidenceReasons)),
    groupId,
    sortOrder,
  };
}

function getSortOrderForType(type: MaterialType): number {
  const orderMap: Record<MaterialType, number> = {
    [MaterialType.PURCHASE_PROOF]: 1,
    [MaterialType.CHAT_SCREENSHOT]: 2,
    [MaterialType.PRODUCT_PHOTO]: 3,
    [MaterialType.INSPECTION_REPORT]: 4,
    [MaterialType.EXPRESS_PHOTO]: 5,
    [MaterialType.RETURN_FORM]: 6,
    [MaterialType.OTHER]: 98,
    [MaterialType.UNKNOWN]: 99,
  };
  return orderMap[type];
}

export interface ExtractedClues {
  orderNo: string | null;
  orderNoSource: 'platform' | 'numeric' | 'mixed' | null;
  phone: string | null;
  dates: string[];
  amount: string | null;
  confidence: number;
  isPartial: boolean;
}

const ORDER_NO_PATTERNS = [
  { regex: /(?:京东|JD|jd)\s*[:：]?\s*([0-9]{10,20})/gi, source: 'platform' as const, prefix: 'JD', confidence: 0.95 },
  { regex: /(?:淘宝|天猫|TB|tb|TMALL|tmall)\s*[:：]?\s*([0-9A-Z]{10,25})/gi, source: 'platform' as const, prefix: 'TB', confidence: 0.92 },
  { regex: /(?:拼多多|PDD|pdd)\s*[:：]?\s*([0-9]{10,20})/gi, source: 'platform' as const, prefix: 'PDD', confidence: 0.92 },
  { regex: /(?:订单号|订单编号|交易号|交易编号|单号)\s*[:：]?\s*([0-9A-Z\-_]{8,30})/gi, source: 'platform' as const, confidence: 0.88 },
  { regex: /\b([0-9]{13,20})\b/g, source: 'numeric' as const, confidence: 0.6 },
  { regex: /\b([0-9A-Z]{2}[-_]?[0-9]{8,16}[-_]?[0-9A-Z]{0,4})\b/g, source: 'mixed' as const, confidence: 0.4 },
];

const PHONE_PATTERN = /\b(1[3-9][0-9]\s?[0-9]{4}\s?[0-9]{4})\b/g;
const DATE_PATTERNS = [
  /(20\d{2})[-\/年.](0?[1-9]|1[0-2])[-\/月.](0?[1-9]|[12][0-9]|3[01])/g,
  /(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])/g,
];
const AMOUNT_PATTERN = /(?:￥|¥|RMB|人民币|实付|合计|总计|金额)\s*[:：]?\s*([0-9]+(?:\.[0-9]{1,2})?)/gi;

export function extractOrderClues(text: string): ExtractedClues {
  const normalized = text.replace(/\u3000/g, ' ');
  let orderNo: string | null = null;
  let orderNoSource: ExtractedClues['orderNoSource'] = null;
  let bestConfidence = 0;
  let isPartial = false;

  for (const pat of ORDER_NO_PATTERNS) {
    const matches = [...normalized.matchAll(pat.regex)];
    if (matches.length > 0) {
      const match = matches[0];
      const raw = (match[1] || '').trim();
      if (raw.length >= 8) {
        if (pat.confidence > bestConfidence) {
          bestConfidence = pat.confidence;
          orderNo = (pat.prefix ? `${pat.prefix}${raw.replace(/[^0-9A-Z]/gi, '')}` : raw).toUpperCase();
          orderNoSource = pat.source;

          const before = normalized.substring(Math.max(0, match.index! - 6), match.index!);
          const after = normalized.substring(match.index! + match[0].length, match.index! + match[0].length + 6);
          if (/[*xX？?…]/.test(before + after + raw)) {
            isPartial = true;
          }
        }
      }
    }
  }

  const phoneMatches = normalized.match(PHONE_PATTERN);
  const phone = phoneMatches ? phoneMatches[0].replace(/\s/g, '') : null;

  const dates: string[] = [];
  DATE_PATTERNS.forEach((pat) => {
    const m = normalized.matchAll(pat);
    for (const match of m) {
      const y = match[1];
      const mo = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      dates.push(`${y}-${mo}-${d}`);
    }
  });

  const amountMatches = [...normalized.matchAll(AMOUNT_PATTERN)];
  const amount = amountMatches.length > 0 ? amountMatches[0][1] : null;

  return {
    orderNo,
    orderNoSource,
    phone,
    dates: Array.from(new Set(dates)).slice(0, 3),
    amount,
    confidence: bestConfidence,
    isPartial,
  };
}

export function findGlobalOrderNo(
  recognitions: Record<string, RecognitionResult>,
): { orderNo: string; confidence: number; count: number } | null {
  const orderCounter: Record<string, { count: number; totalConfidence: number }> = {};

  Object.values(recognitions).forEach((r) => {
    if (r.extractedOrderNo) {
      const key = r.extractedOrderNo;
      if (!orderCounter[key]) {
        orderCounter[key] = { count: 0, totalConfidence: 0 };
      }
      orderCounter[key].count += 1;
      orderCounter[key].totalConfidence += r.orderNoConfidence;
    }
  });

  const entries = Object.entries(orderCounter).sort((a, b) => {
    const scoreA = a[1].count * 2 + a[1].totalConfidence;
    const scoreB = b[1].count * 2 + b[1].totalConfidence;
    return scoreB - scoreA;
  });

  if (entries.length === 0) return null;
  const [orderNo, data] = entries[0];
  return {
    orderNo,
    confidence: Math.min(1, data.totalConfidence / Math.max(1, data.count)),
    count: data.count,
  };
}
