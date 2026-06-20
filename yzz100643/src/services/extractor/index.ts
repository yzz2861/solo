import type { ExtractedField, FieldType, ArchiveRecord } from '@/types';
import { generateId } from '@/utils/common';
import { toSimplified, chineseToArabic, normalizeDateString, isValidChineseName, normalizeName } from '@/utils/chinese';

interface ExtractionResult {
  fields: ExtractedField[];
  overallConfidence: number;
}

interface ExtractionRule {
  type: FieldType;
  patterns: RegExp[];
  normalize: (match: string) => string | null;
  validate: (value: string) => boolean;
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => number;
}

const createNameRule = (): ExtractionRule => ({
  type: 'name',
  patterns: [
    /(?:姓名|姓 名|Name)[：:]\s*([\u4e00-\u9fa5]{2,4})(?:\s|$|，|。)/,
    /(?:申请人|填报人|当事人|负责人|经手人|签名)[：:]\s*([\u4e00-\u9fa5]{2,4})/,
    /^[\u4e00-\u9fa5]{2,4}$/,
    /[\u4e00-\u9fa5]{2,4}(?:同志|先生|女士)/,
    /(?:兹有|现有)[\u4e00-\u9fa5]{2,4}/
  ],
  normalize: (match: string) => {
    let value = toSimplified(match.trim());
    value = value.replace(/同志|先生|女士|兹有|现有/, '');
    value = value.replace(/[：:，。\s]/g, '');
    return value;
  },
  validate: (value: string) => isValidChineseName(value),
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => {
    let confidence = 0.5;
    
    if (isValidChineseName(value)) confidence += 0.2;
    if (/^[\u4e00-\u9fa5]{2,3}$/.test(value)) confidence += 0.1;
    if (match[0].includes('姓名') || match[0].includes('姓 名')) confidence += 0.2;
    if (match[0].includes('申请人') || match[0].includes('当事人')) confidence += 0.15;
    
    if (value.length === 4) {
      const twoCharName = value.substring(0, 2);
      if (isValidChineseName(twoCharName)) confidence -= 0.1;
    }
    
    if (/[0-9a-zA-Z]/.test(value)) confidence -= 0.3;
    
    if (hasSealText(context, value)) confidence += 0.1;
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
});

const createDateRule = (): ExtractionRule => ({
  type: 'date',
  patterns: [
    /(?:日期|时间|年月日|签发日期|有效日期)[：:]\s*([^，。\n]+)/,
    /民國\s*(\d+|[一二三四五六七八九十百千]+)\s*年\s*(\d+|[一二三四五六七八九十]+)\s*月\s*(\d+|[一二三四五六七八九十]+)\s*[日號]/,
    /(\d{4})[-\/年.](\d{1,2})[-\/月.](\d{1,2})\s*[日號]?/,
    /(\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})/,
    /([一二三四五六七八九十]+)\s*年\s*([一二三四五六七八九十]+)\s*月\s*([一二三四五六七八九十]+)\s*[日號]/,
    /公元\s*(\d{4})\s*年/
  ],
  normalize: (match: string) => {
    const normalized = normalizeDateString(match);
    return normalized;
  },
  validate: (value: string) => {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear() + 1;
  },
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => {
    let confidence = 0.5;
    
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      confidence += 0.2;
      
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year >= 1949 && year <= currentYear) {
        confidence += 0.15;
      } else if (year < 1949) {
        confidence -= 0.1;
      }
    }
    
    if (match[0].includes('日期') || match[0].includes('年月日')) confidence += 0.15;
    
    const matchText = match[0];
    if (matchText.includes('民國') || matchText.includes('民国')) {
      confidence += 0.1;
    }
    
    if (/[-\/年.]/.test(matchText)) {
      const parts = matchText.split(/[-\/年.]/);
      if (parts.length >= 3) confidence += 0.05;
    }
    
    if (context.includes('印章') || hasSealText(context, '')) {
      confidence -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
});

const createDocumentNumberRule = (): ExtractionRule => ({
  type: 'documentNumber',
  patterns: [
    /(?:编号|文号|字第|案号|档号)[：:]\s*([^\s，。\n]+)/,
    /[（(][字第]\s*([A-Za-z0-9\-]+)\s*[）)]号/,
    /\b([A-Z]{1,3}[-—]?\d{3,10}[-—]?\d{0,4})\b/,
    /[编号]{2,}([0-9]{4,}[-—]?[0-9]{0,4})/,
    /\b\d{8,}\b/
  ],
  normalize: (match: string) => {
    let value = match.trim();
    value = value.replace(/[（(]|[）)号]/g, '');
    value = value.replace(/[—–]/g, '-');
    value = value.replace(/\s+/g, '');
    return value;
  },
  validate: (value: string) => {
    if (!value || value.length < 3) return false;
    return /[A-Za-z0-9\-]/.test(value);
  },
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => {
    let confidence = 0.4;
    
    if (value.length >= 5 && value.length <= 20) confidence += 0.15;
    if (/[A-Za-z].*\d|\d.*[A-Za-z]/.test(value)) confidence += 0.15;
    if (value.includes('-')) confidence += 0.1;
    
    if (match[0].includes('编号') || match[0].includes('文号')) confidence += 0.2;
    if (match[0].includes('字第') || match[0].includes('档号')) confidence += 0.2;
    
    if (/^[0-9]+$/.test(value) && value.length >= 8) {
      confidence -= 0.1;
    }
    
    if (hasSealText(context, value)) confidence += 0.15;
    
    if (/[，。,.]/.test(value)) confidence -= 0.2;
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
});

const createPageNumberRule = (): ExtractionRule => ({
  type: 'pageNumber',
  patterns: [
    /第\s*(\d+|[一二三四五六七八九十]+)\s*[页頁]/,
    /共\s*(\d+|[一二三四五六七八九十]+)\s*[页頁]/,
    /[页頁]\s*(\d+|[一二三四五六七八九十]+)/,
    /[Pp][Aa][Gg][Ee]\s*[:：]?\s*(\d+)/,
    /^[-—]\s*(\d+)\s*[-—]$/,
    /^\s*(\d{1,3})\s*\/\s*\d{1,3}\s*$/
  ],
  normalize: (match: string) => {
    const numMatch = match.match(/\d+|[一二三四五六七八九十]+/);
    if (!numMatch) return null;
    const num = chineseToArabic(numMatch[0]) || parseInt(numMatch[0], 10);
    return num ? num.toString() : null;
  },
  validate: (value: string) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num < 10000;
  },
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => {
    let confidence = 0.5;
    
    if (match[0].includes('第') && match[0].includes('页')) confidence += 0.25;
    if (match[0].includes('共') && match[0].includes('页')) confidence += 0.2;
    
    const num = parseInt(value, 10);
    if (num >= 1 && num <= 500) confidence += 0.1;
    else if (num > 1000) confidence -= 0.2;
    
    const handwrittenScore = checkHandwrittenStyle(context);
    if (handwrittenScore > 0.5) confidence -= 0.15;
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
});

const materialTypes = [
  { keywords: ['简历', '履历', '个人简历', '自传'], type: '简历材料' },
  { keywords: ['申请书', '申请', '报告'], type: '申请材料' },
  { keywords: ['证明', '证明书', '说明'], type: '证明材料' },
  { keywords: ['合同', '协议', '契约'], type: '合同协议' },
  { keywords: ['判决', '裁定', '判决书', '裁定书'], type: '法律文书' },
  { keywords: ['通知', '决定', '批复', '批示'], type: '公文' },
  { keywords: ['证书', '执照', '证件'], type: '证照' },
  { keywords: ['介绍信', '信函', '书信'], type: '信函' },
  { keywords: ['档案', '案卷', '卷宗'], type: '档案' },
  { keywords: ['登记表', '申请表', '审批表', '报名表'], type: '表格' }
];

const createMaterialTypeRule = (): ExtractionRule => ({
  type: 'materialType',
  patterns: [
    /^[\u4e00-\u9fa5]{2,10}(?:材料|书|表|单|函|通知|决定|协议|合同|证明|报告|申请书)/,
    /(?:兹有|现因|特申请|特此证明)/,
    /^(关于.*[记要])/
  ],
  normalize: (match: string) => {
    const context = toSimplified(match);
    for (const mt of materialTypes) {
      for (const keyword of mt.keywords) {
        if (context.includes(keyword)) {
          return mt.type;
        }
      }
    }
    return null;
  },
  validate: (value: string) => {
    return value !== null && value.length > 0;
  },
  calculateConfidence: (value: string, match: RegExpMatchArray, context: string) => {
    let confidence = 0.4;
    
    for (const mt of materialTypes) {
      for (const keyword of mt.keywords) {
        if (context.includes(keyword)) {
          confidence += 0.3;
          if (mt.type === value) {
            confidence += 0.2;
          }
        }
      }
    }
    
    const headerMatch = match[0].match(/^[\u4e00-\u9fa5]{2,10}(?:材料|书|表|单|函|通知|决定|协议|合同|证明|报告|申请书)/);
    if (headerMatch) confidence += 0.1;
    
    return Math.min(0.9, Math.max(0.1, confidence));
  }
});

const hasSealText = (context: string, text: string): boolean => {
  const sealPatterns = [
    /[公章|专用章|财务章|合同章|人事章]/,
    /[印|印鉴|印章]/,
    /圆形|椭圆形|方形章/,
  ];
  
  for (const pattern of sealPatterns) {
    if (pattern.test(context)) return true;
  }
  
  if (text && text.length > 0) {
    const sealCharRatio = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    if (sealCharRatio > 0 && sealCharRatio / text.length > 0.5) {
      const hasReversed = text.includes('印') || text.includes('章');
      return hasReversed;
    }
  }
  
  return false;
};

const checkHandwrittenStyle = (text: string): number => {
  let score = 0;
  const handwrittenPatterns = [
    /[一二三四五六七八九十壹贰叁肆伍陆柒捌玖拾]/,
    /[〇零]/,
    /[，。、；：「」『』（）【】]/,
  ];
  
  for (const pattern of handwrittenPatterns) {
    if (pattern.test(text)) score += 0.2;
  }
  
  const digitCount = text.match(/[0-9]/g)?.length || 0;
  const charCount = text.length;
  if (charCount > 0 && digitCount / charCount < 0.3) {
    score += 0.2;
  }
  
  return Math.min(1, score);
};

const rules: ExtractionRule[] = [
  createNameRule(),
  createDateRule(),
  createDocumentNumberRule(),
  createPageNumberRule(),
  createMaterialTypeRule()
];

export const extractFields = (ocrText: string, recordId: string): ExtractionResult => {
  const fields: ExtractedField[] = [];
  const simplifiedText = toSimplified(ocrText);
  
  for (const rule of rules) {
    let bestMatch: { value: string; confidence: number; match: RegExpMatchArray } | null = null;
    
    for (const pattern of rule.patterns) {
      const matches = simplifiedText.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'));
      
      for (const match of matches) {
        const rawValue = match[1] || match[0];
        const normalizedValue = rule.normalize(rawValue);
        
        if (!normalizedValue) continue;
        if (!rule.validate(normalizedValue)) continue;
        
        const confidence = rule.calculateConfidence(normalizedValue, match, simplifiedText);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { value: normalizedValue, confidence, match };
        }
      }
    }
    
    if (bestMatch) {
      const ambiguousMatches = findAmbiguousMatches(rule.type, bestMatch.value, simplifiedText);
      
      fields.push({
        id: generateId(),
        recordId,
        fieldName: rule.type,
        ocrValue: bestMatch.value,
        confidence: bestMatch.confidence,
        isLowConfidence: bestMatch.confidence < 0.6,
        source: 'ocr',
        isAmbiguous: ambiguousMatches.length > 0,
        ambiguousMatches
      });
    } else {
      fields.push({
        id: generateId(),
        recordId,
        fieldName: rule.type,
        ocrValue: '',
        confidence: 0,
        isLowConfidence: true,
        source: 'ocr',
        notes: '未识别到有效信息'
      });
    }
  }
  
  const overallConfidence = fields.length > 0
    ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
    : 0;
  
  return { fields, overallConfidence };
};

const findAmbiguousMatches = (fieldType: FieldType, value: string, context: string): string[] => {
  const ambiguous: string[] = [];
  
  if (fieldType === 'name') {
    const nameRegex = /[\u4e00-\u9fa5]{2,4}/g;
    const names = context.match(nameRegex) || [];
    for (const name of names) {
      const normalized = normalizeName(name);
      if (normalized !== value && isValidChineseName(normalized)) {
        if (!ambiguous.includes(normalized)) {
          ambiguous.push(normalized);
        }
      }
    }
  }
  
  if (fieldType === 'date') {
    const dateRegex = /\d{4}[-\/年.]\d{1,2}[-\/月.]\d{1,2}/g;
    const dates = context.match(dateRegex) || [];
    for (const date of dates) {
      const normalized = normalizeDateString(date);
      if (normalized && normalized !== value && !ambiguous.includes(normalized)) {
        ambiguous.push(normalized);
      }
    }
  }
  
  if (fieldType === 'documentNumber') {
    const numRegex = /[A-Za-z0-9\-]{5,}/g;
    const nums = context.match(numRegex) || [];
    for (const num of nums) {
      const normalized = num.replace(/[—–]/g, '-');
      if (normalized !== value && /[A-Za-z].*\d|\d.*[A-Za-z]/.test(normalized)) {
        if (!ambiguous.includes(normalized)) {
          ambiguous.push(normalized);
        }
      }
    }
  }
  
  return ambiguous.slice(0, 3);
};

export const extractPageNumberFromFilename = (filename: string): number | null => {
  const match = filename.match(/(\d{1,4})/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0 && num < 10000) {
      return num;
    }
  }
  return null;
};

export const detectMissingPages = (records: ArchiveRecord[]): { recordId: string; gap: number; reason: string }[] => {
  const missingPages: { recordId: string; gap: number; reason: string }[] = [];
  
  const pageNumbers = records
    .map(r => r.pageNumber)
    .filter((p): p is number => p !== undefined && p !== null);
  
  if (pageNumbers.length < 2) return missingPages;
  
  const sortedPages = [...new Set(pageNumbers)].sort((a, b) => a - b);
  
  for (let i = 1; i < sortedPages.length; i++) {
    const expected = sortedPages[i - 1] + 1;
    const actual = sortedPages[i];
    if (actual > expected) {
      const gap = actual - expected;
      const record = records.find(r => r.pageNumber === actual);
      if (record) {
        missingPages.push({
          recordId: record.id,
          gap,
          reason: `页码不连续，缺失 ${expected} 到 ${actual - 1}`
        });
      }
    }
  }
  
  return missingPages;
};

export const detectSameNames = (records: ArchiveRecord[]): { name: string; recordIds: string[] }[] => {
  const nameMap = new Map<string, string[]>();
  
  for (const record of records) {
    const nameField = record.fields.find(f => f.fieldName === 'name');
    if (nameField && nameField.ocrValue) {
      const normalized = normalizeName(nameField.ocrValue);
      if (!nameMap.has(normalized)) {
        nameMap.set(normalized, []);
      }
      nameMap.get(normalized)!.push(record.id);
    }
  }
  
  const sameNames: { name: string; recordIds: string[] }[] = [];
  for (const [name, recordIds] of nameMap) {
    if (recordIds.length > 1) {
      sameNames.push({ name, recordIds });
    }
  }
  
  return sameNames;
};

export default {
  extractFields,
  extractPageNumberFromFilename,
  detectMissingPages,
  detectSameNames
};
