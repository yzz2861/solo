import type { SmsRecord, AnalysisResult, CategoryType, SeverityLevel } from '../types';
import { privacyService } from './privacyService';

interface ClassificationRule {
  category: CategoryType;
  keywords: string[];
  severityMap: { [key: string]: SeverityLevel };
  defaultSeverity: SeverityLevel;
}

const classificationRules: ClassificationRule[] = [
  {
    category: 'adverse_reaction',
    keywords: ['皮疹', '痒', '过敏', '呼吸困难', '胸闷', '水肿', '恶心', '呕吐', '头晕', '头痛', '心慌', '心悸', '干咳', '副作用'],
    severityMap: {
      '呼吸困难': 'critical',
      '胸闷': 'high',
      '水肿': 'high',
      '皮疹': 'medium',
      '痒': 'medium',
      '头晕': 'medium',
      '头痛': 'medium',
      '心慌': 'high',
      '心悸': 'high',
      '干咳': 'low',
    },
    defaultSeverity: 'medium',
  },
  {
    category: 'medication_issue',
    keywords: ['饭前', '饭后', '怎么吃', '吃法', '剂量', '用量', '加量', '减量', '停药', '续药', '开药', '没药了', '吃完了', '快没了'],
    severityMap: {
      '停药': 'high',
      '加量': 'medium',
      '减量': 'medium',
    },
    defaultSeverity: 'low',
  },
  {
    category: 'need_visit',
    keywords: ['复查', '回诊', '再来看看', '预约', '挂号', '住院', '检查', '体检', '胸闷', '胸痛', '摔了', '摔跤'],
    severityMap: {
      '胸痛': 'critical',
      '摔了': 'high',
      '摔跤': 'high',
      '胸闷': 'high',
      '复查': 'medium',
      '回诊': 'medium',
    },
    defaultSeverity: 'medium',
  },
  {
    category: 'symptom_change',
    keywords: ['好多了', '好多啦', '好转', '改善', '加重', '严重了', '厉害', '频繁', '减轻', '缓解', '控制', '稳定', '血压', '心跳', '心率'],
    severityMap: {
      '加重': 'high',
      '严重了': 'high',
      '厉害': 'high',
      '频繁': 'high',
      '血压180': 'critical',
      '血压高': 'high',
      '心跳快': 'high',
    },
    defaultSeverity: 'medium',
  },
  {
    category: 'observation_only',
    keywords: ['还好', '还行', '可以', '不错', '正常', '稳定', '按医嘱', '继续吃药', '观察', '休息', '有点累', '没精神', '睡不着', '失眠'],
    severityMap: {
      '没精神': 'low',
      '睡不着': 'low',
      '失眠': 'low',
      '有点累': 'low',
    },
    defaultSeverity: 'low',
  },
];

const severeKeywords = ['危急', '严重', '剧烈', '持续', '半天', '两天', '三天', '180', '200', '140', '不能', '无法', '不敢'];

const ambiguousIndicators = ['不舒服', '说不上来', '不知道', '好像', '感觉', '有点', '不对劲'];

const familyIndicators = ['我是他', '我是她', '我爸', '我妈', '我爷爷', '我奶奶', '我外公', '我外婆', '家属', '代发', '代替'];

export const classificationService = {
  async classify(sms: SmsRecord): Promise<AnalysisResult> {
    const rawContent = sms.content + (sms.nurseNote ? ' ' + sms.nurseNote : '');
    const expandedContent = this.expandAbbreviations(rawContent);
    const lowerContent = expandedContent.toLowerCase();

    const categoryScores: { [key in CategoryType]?: number } = {};
    const matchedKeywords: string[] = [];
    let matchedEvidence: string[] = [];

    for (const rule of classificationRules) {
      let score = 0;
      const ruleMatchedKeywords: string[] = [];
      const ruleMatchedEvidence: string[] = [];

      for (const keyword of rule.keywords) {
        if (lowerContent.includes(keyword)) {
          score++;
          ruleMatchedKeywords.push(keyword);

          const sentences = rawContent.split(/[。！？.!?\n]/);
          for (const sentence of sentences) {
            const expandedSentence = this.expandAbbreviations(sentence);
            if (expandedSentence.includes(keyword) && sentence.trim().length > 0) {
              ruleMatchedEvidence.push(sentence.trim());
            }
          }
        }
      }

      if (score > 0) {
        categoryScores[rule.category] = score;
        matchedKeywords.push(...ruleMatchedKeywords);
        matchedEvidence.push(...ruleMatchedEvidence);
      }
    }

    let category: CategoryType = 'observation_only';
    let maxScore = 0;
    for (const [cat, score] of Object.entries(categoryScores)) {
      if ((score as number) > maxScore) {
        maxScore = score as number;
        category = cat as CategoryType;
      }
    }

    if (maxScore === 0) {
      category = 'observation_only';
    }

    if (category === 'observation_only' && lowerContent.includes('图片')) {
      category = 'medication_issue';
    }

    const severity = this.calculateSeverity(category, expandedContent, matchedKeywords);
    const confidence = this.calculateConfidence(maxScore, expandedContent, matchedKeywords.length);
    const isAmbiguous = this.checkAmbiguity(expandedContent, matchedKeywords, category);
    const summary = this.generateSummary(category, expandedContent, matchedKeywords);

    matchedEvidence = [...new Set(matchedEvidence)].slice(0, 3);
    const uniqueKeywords = [...new Set(matchedKeywords)].slice(0, 5);

    return {
      id: `a_${sms.id}`,
      smsId: sms.id,
      category,
      severity,
      confidence,
      summary,
      evidence: matchedEvidence,
      keywords: uniqueKeywords,
      isAmbiguous,
      ambiguousReason: isAmbiguous ? this.getAmbiguousReason(expandedContent, matchedKeywords) : undefined,
      reviewStatus: 'pending',
    };
  },

  async batchClassify(smsList: SmsRecord[]): Promise<AnalysisResult[]> {
    const results = await Promise.all(smsList.map((sms) => this.classify(sms)));
    return results;
  },

  calculateSeverity(category: CategoryType, content: string, keywords: string[]): SeverityLevel {
    const lowerContent = content.toLowerCase();
    const rule = classificationRules.find((r) => r.category === category);
    
    let severity: SeverityLevel = rule?.defaultSeverity || 'low';

    for (const keyword of keywords) {
      if (rule?.severityMap[keyword]) {
        severity = rule.severityMap[keyword];
      }
    }

    if (category === 'adverse_reaction') {
      for (const severeKw of severeKeywords) {
        if (lowerContent.includes(severeKw)) {
          severity = 'high';
          if (severeKw === '180' || severeKw === '200') {
            severity = 'critical';
          }
          break;
        }
      }
    }

    if (lowerContent.includes('血压') && (lowerContent.includes('180') || lowerContent.includes('190') || lowerContent.includes('200'))) {
      severity = 'critical';
    }

    if (lowerContent.includes('胸痛') || lowerContent.includes('硝酸甘油')) {
      severity = 'critical';
    }

    if (lowerContent.includes('摔了') || lowerContent.includes('摔跤') || lowerContent.includes('摔倒')) {
      severity = 'high';
    }

    const hasSevereIndicator = severeKeywords.some((kw) => lowerContent.includes(kw));
    if (hasSevereIndicator && severity === 'low') {
      severity = 'medium';
    }

    return severity;
  },

  calculateConfidence(score: number, content: string, keywordCount: number): number {
    if (score === 0) return 0.3;
    
    const baseConfidence = Math.min(0.5 + score * 0.15, 0.9);
    const lengthFactor = content.length > 100 ? 0.05 : content.length > 50 ? 0 : -0.05;
    const keywordFactor = keywordCount > 3 ? 0.05 : keywordCount > 1 ? 0 : -0.05;
    
    return Math.max(0.1, Math.min(0.95, baseConfidence + lengthFactor + keywordFactor));
  },

  checkAmbiguity(content: string, keywords: string[], category: CategoryType): boolean {
    const lowerContent = content.toLowerCase();
    
    if (keywords.length === 0) return true;
    
    const hasAmbiguousIndicator = ambiguousIndicators.some((indicator) => 
      lowerContent.includes(indicator)
    );
    
    if (hasAmbiguousIndicator && category === 'observation_only') {
      return true;
    }
    
    if (lowerContent.includes('图片') && keywords.length < 2) {
      return true;
    }
    
    return false;
  },

  getAmbiguousReason(content: string, keywords: string[]): string {
    const lowerContent = content.toLowerCase();
    
    if (keywords.length === 0) {
      return '未识别到明确关键词，需要人工确认';
    }
    
    if (lowerContent.includes('不舒服') || lowerContent.includes('说不上来')) {
      return '患者描述模糊，症状不明确，需要人工判断';
    }
    
    if (lowerContent.includes('图片') && keywords.length < 2) {
      return '包含图片内容，需要结合图片人工确认';
    }
    
    return '信息不够明确，建议人工核实';
  },

  generateSummary(category: CategoryType, content: string, keywords: string[]): string {
    const categoryLabels: { [key in CategoryType]: string } = {
      symptom_change: '症状变化',
      medication_issue: '用药问题',
      adverse_reaction: '不良反应',
      need_visit: '需回诊',
      observation_only: '只需观察',
    };

    if (keywords.length === 0) {
      return `${categoryLabels[category]}：内容待确认`;
    }

    const keywordStr = keywords.slice(0, 3).join('、');
    
    if (category === 'symptom_change') {
      if (content.includes('好多了') || content.includes('好转') || content.includes('改善') || content.includes('减轻') || content.includes('缓解')) {
        return `症状好转：${keywordStr}`;
      }
      if (content.includes('加重') || content.includes('严重') || content.includes('厉害') || content.includes('频繁')) {
        return `症状加重：${keywordStr}`;
      }
      return `症状变化：${keywordStr}`;
    }
    
    if (category === 'adverse_reaction') {
      return `疑似不良反应：${keywordStr}`;
    }
    
    if (category === 'medication_issue') {
      return `用药咨询：${keywordStr}`;
    }
    
    if (category === 'need_visit') {
      return `请求回诊：${keywordStr}`;
    }
    
    return `${categoryLabels[category]}：${keywordStr}`;
  },

  detectFamilySender(content: string): { isFamily: boolean; relation?: string } {
    const lowerContent = content.toLowerCase();
    
    for (const indicator of familyIndicators) {
      if (lowerContent.includes(indicator)) {
        let relation = '';
        if (lowerContent.includes('女儿')) relation = '女儿';
        else if (lowerContent.includes('儿子')) relation = '儿子';
        else if (lowerContent.includes('我爸')) relation = '女儿/儿子';
        else if (lowerContent.includes('我妈')) relation = '女儿/儿子';
        else if (lowerContent.includes('爷爷') || lowerContent.includes('奶奶')) relation = '孙辈';
        else if (lowerContent.includes('家属')) relation = '家属';
        
        return { isFamily: true, relation: relation || '家属' };
      }
    }
    
    return { isFamily: false };
  },

  expandAbbreviations(content: string): string {
    const abbreviations: { pattern: RegExp; replacement: string }[] = [
      { pattern: /(?<!头|眩)晕/g, replacement: '头晕' },
      { pattern: /(?<!水|浮)肿/g, replacement: '水肿' },
      { pattern: /(?<!干)咳/g, replacement: '咳嗽' },
      { pattern: /(?<!气)喘/g, replacement: '喘息' },
      { pattern: /(?<!心)慌/g, replacement: '心慌' },
      { pattern: /(?<!胸)闷/g, replacement: '胸闷' },
      { pattern: /加量/g, replacement: '增加剂量' },
      { pattern: /减量/g, replacement: '减少剂量' },
      { pattern: /没药/g, replacement: '没有药物' },
      { pattern: /续药/g, replacement: '续配药物' },
    ];

    let expanded = content;
    for (const { pattern, replacement } of abbreviations) {
      expanded = expanded.replace(pattern, replacement);
    }

    return expanded;
  },

  maskContent(content: string, knownNames?: string[]): string {
    return privacyService.maskAll(content, knownNames);
  },
};
