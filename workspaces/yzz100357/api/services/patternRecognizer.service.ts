import type { Evidence, EvidenceType, RiskLevel } from '../../shared/types.js';

interface PatternMatch {
  type: EvidenceType;
  content: string;
  sourceText: string;
  sourceLocation: string;
  timestamp?: string;
  riskLevel?: RiskLevel;
  confidence: number;
  warning?: string;
}

interface RecognitionContext {
  customerName?: string;
  orderTime?: string;
}

const DATE_PATTERNS = [
  /(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})[日号]?/,
  /(\d{1,2})[-\/月](\d{1,2})[日号]?/,
  /(今天|昨天|前天|明天|后天)/,
  /(上午|下午|晚上|早上)?\s*(\d{1,2})[:点](\d{1,2})[分]?/,
];

const SHIPPING_PATTERNS = [
  { regex: /(已发货|发货时间|发货日期|发出时间|寄出时间|揽收时间)[：: ]*([^\n，。！？]+)/i, weight: 0.9 },
  { regex: /(快递单号|物流单号|运单号)[：: ]*([A-Za-z0-9]+)/i, weight: 0.85 },
  { regex: /([圆通|中通|申通|顺丰|韵达|极兔|邮政|京东][快递]?)[：: ]*([^\n，。！？]*)/i, weight: 0.8 },
  { regex: /(寄出|发出|揽收|签收)[：: ]*([^\n，。！？]*)/i, weight: 0.75 },
];

const PROMISE_PATTERNS = [
  { regex: /(承诺|保证|答应|说好|可以|没问题)[：: ]*([^\n，。！？]+)/i, weight: 0.85 },
  { regex: /(我们会|我们将|一定|肯定|确保)[：: ]*([^\n，。！？]+)/i, weight: 0.75 },
  { regex: /(给你|帮你|为你)[：: ]*([^\n，。！？]*(补发|退款|补偿|优惠|换货))/i, weight: 0.8 },
  { regex: /(今天|明天|后天|(\d+)天内|(\d+)小时内)[：: ]*([^\n，。！？]*(到|发|处理|解决))/i, weight: 0.7 },
];

const REFUND_PATTERNS = [
  { regex: /(申请退款|退款申请|仅退款|退货退款|退款成功|退款时间)[：: ]*([^\n，。！？]*)/i, weight: 0.9 },
  { regex: /(退款金额|退款金额)[：: ]*([￥¥]?\d+\.?\d*)/i, weight: 0.85 },
  { regex: /(售后|退款|退货)[：: ]*([^\n，。！？]*(同意|拒绝|处理|完成))/i, weight: 0.8 },
  { regex: /(退款到账|到账时间|入账)[：: ]*([^\n，。！？]*)/i, weight: 0.85 },
  { regex: /(售后单号|售后编号)[：: ]*([A-Za-z0-9]+)/i, weight: 0.8 },
];

const VIOLATION_PATTERNS = [
  { regex: /(差评|给差评|恶意差评|职业差评)/i, weight: 0.9, risk: 'high' as RiskLevel },
  { regex: /(敲诈|勒索|要钱|要好处|不给就|不然就)/i, weight: 0.9, risk: 'high' as RiskLevel },
  { regex: /(威胁|恐吓|你等着|你看着办|小心点)/i, weight: 0.85, risk: 'high' as RiskLevel },
  { regex: /(刷差评|组团差评|恶意评价|故意找事)/i, weight: 0.9, risk: 'high' as RiskLevel },
  { regex: /(假货|骗子|垃圾|垃圾店|黑心)[^\n，。！？]{0,20}/i, weight: 0.6, risk: 'medium' as RiskLevel },
  { regex: /(不退不换|不能退|不给退|拒绝退款)[^\n，。！？]{0,30}/i, weight: 0.5, risk: 'low' as RiskLevel },
  { regex: /(投诉|举报|曝光|告你|维权)[^\n，。！？]{0,20}/i, weight: 0.5, risk: 'medium' as RiskLevel },
];

const LOW_CONFIDENCE_WARNINGS = [
  { pattern: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, message: '包含表情符号，可能影响语义理解' },
  { pattern: /(撤回了一条消息|撤回了消息|已撤回)/i, message: '包含撤回提示，上下文可能不完整' },
  { pattern: /(订单|单号)[^\n]{0,30}(另外|另一个|还有|其他)/i, message: '可能涉及多个订单，请注意区分' },
  { pattern: /(物流|快递|发货)[^\n]{0,30}(延误|延迟|超时|慢)/i, message: '提及物流延误，请结合实际物流轨迹判断' },
  { pattern: /(可能|也许|大概|应该|说不定)/i, message: '包含不确定表述，请谨慎判断' },
];

const AMBIGUOUS_PHRASES = [
  '可能', '也许', '大概', '应该', '好像', '似乎', '说不定', '差不多',
  '尽量', '尽力', '争取', '尝试', '看看', '考虑', '研究'
];

export function analyzeText(
  text: string,
  sourceMaterialId: string,
  context?: RecognitionContext
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) return;
    
    const sourceLocation = `第 ${lineIndex + 1} 行`;
    const lineWarnings = checkLowConfidenceIndicators(line);
    
    matches.push(...matchShippingPatterns(line, sourceMaterialId, sourceLocation, lineWarnings));
    matches.push(...matchPromisePatterns(line, sourceMaterialId, sourceLocation, lineWarnings));
    matches.push(...matchRefundPatterns(line, sourceMaterialId, sourceLocation, lineWarnings));
    matches.push(...matchViolationPatterns(line, sourceMaterialId, sourceLocation, lineWarnings));
  });
  
  return deduplicateMatches(matches);
}

function matchShippingPatterns(
  line: string,
  sourceMaterialId: string,
  sourceLocation: string,
  warnings: string[]
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (const pattern of SHIPPING_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const timestamp = extractTimestamp(line);
      const content = match[2] ? match[2].trim() : match[1].trim();
      const baseConfidence = pattern.weight;
      const confidence = adjustConfidence(baseConfidence, line, warnings);
      
      matches.push({
        type: 'shipping_time',
        content: `${match[1].trim()}：${content}`,
        sourceText: line.trim(),
        sourceLocation,
        timestamp,
        confidence,
        warning: warnings.length > 0 ? warnings.join('；') : undefined
      });
    }
  }
  
  return matches;
}

function matchPromisePatterns(
  line: string,
  sourceMaterialId: string,
  sourceLocation: string,
  warnings: string[]
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (const pattern of PROMISE_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const timestamp = extractTimestamp(line);
      const content = match[2] ? match[2].trim() : match[1].trim();
      const baseConfidence = pattern.weight;
      const confidence = adjustConfidence(baseConfidence, line, warnings);
      
      matches.push({
        type: 'customer_promise',
        content: `${match[1].trim()}：${content}`,
        sourceText: line.trim(),
        sourceLocation,
        timestamp,
        confidence,
        warning: warnings.length > 0 ? warnings.join('；') : undefined
      });
    }
  }
  
  return matches;
}

function matchRefundPatterns(
  line: string,
  sourceMaterialId: string,
  sourceLocation: string,
  warnings: string[]
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (const pattern of REFUND_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const timestamp = extractTimestamp(line);
      const content = match[2] ? match[2].trim() : match[1].trim();
      const baseConfidence = pattern.weight;
      const confidence = adjustConfidence(baseConfidence, line, warnings);
      
      matches.push({
        type: 'refund_node',
        content: `${match[1].trim()}：${content}`,
        sourceText: line.trim(),
        sourceLocation,
        timestamp,
        confidence,
        warning: warnings.length > 0 ? warnings.join('；') : undefined
      });
    }
  }
  
  return matches;
}

function matchViolationPatterns(
  line: string,
  sourceMaterialId: string,
  sourceLocation: string,
  warnings: string[]
): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (const pattern of VIOLATION_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const timestamp = extractTimestamp(line);
      const baseConfidence = pattern.weight;
      const confidence = adjustConfidence(baseConfidence, line, warnings);
      
      matches.push({
        type: 'violation_speech',
        content: line.trim(),
        sourceText: line.trim(),
        sourceLocation,
        timestamp,
        riskLevel: pattern.risk,
        confidence,
        warning: warnings.length > 0 ? warnings.join('；') : undefined
      });
    }
  }
  
  return matches;
}

function extractTimestamp(line: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return undefined;
}

function checkLowConfidenceIndicators(line: string): string[] {
  const warnings: string[] = [];
  
  for (const warning of LOW_CONFIDENCE_WARNINGS) {
    if (warning.pattern.test(line)) {
      warnings.push(warning.message);
    }
  }
  
  return warnings;
}

function adjustConfidence(baseConfidence: number, line: string, warnings: string[]): number {
  let confidence = baseConfidence;
  
  for (const phrase of AMBIGUOUS_PHRASES) {
    if (line.includes(phrase)) {
      confidence -= 0.15;
    }
  }
  
  confidence -= warnings.length * 0.1;
  
  if (line.length < 5) {
    confidence -= 0.1;
  }
  
  if (line.length > 200) {
    confidence -= 0.05;
  }
  
  return Math.max(0.1, Math.min(0.99, confidence));
}

function deduplicateMatches(matches: PatternMatch[]): PatternMatch[] {
  const seen = new Set<string>();
  return matches.filter(match => {
    const key = `${match.type}-${match.content.substring(0, 50)}-${match.sourceLocation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function convertToEvidence(
  match: PatternMatch,
  projectId: string,
  sourceMaterialId: string
): Omit<Evidence, 'id'> {
  return {
    projectId,
    type: match.type,
    content: match.content + (match.warning ? ` ⚠️ ${match.warning}` : ''),
    sourceText: match.sourceText,
    sourceMaterialId,
    sourceLocation: match.sourceLocation,
    confidence: match.confidence,
    confirmed: match.confidence >= 0.8,
    timestamp: match.timestamp,
    riskLevel: match.riskLevel,
    notes: match.warning
  };
}
