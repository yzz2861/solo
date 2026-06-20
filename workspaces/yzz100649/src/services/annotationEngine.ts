import type {
  Annotation,
  ExpressionType,
  RiskCategory,
  RiskLevel,
} from '@/types';
import { genId } from '@/utils/id';

interface MatchCandidate {
  start: number;
  end: number;
  text: string;
  category: RiskCategory;
  expressionType: ExpressionType;
  riskLevel: RiskLevel;
  suggestion: string;
}

const CATEGORY_RULES: Array<{
  category: RiskCategory;
  patterns: RegExp[];
  riskLevel: RiskLevel;
  suggestion: (m: string) => string;
}> = [
  {
    category: 'treatment_effect',
    patterns: [
      /(?:治愈|根治|永不复发|药到病除|立竿见影|彻底治愈|完全康复|绝对有效|包治|除根)/g,
      /(?:100%|百分之百)\s*(?:有效|治愈|见效|成功)/g,
      /(?:无任何副作用|完全无副作用|绝无副作用)/g,
      /(?:特效|神效|奇效|神奇疗效)/g,
    ],
    riskLevel: 'high',
    suggestion: () =>
      '疗效表述过于绝对，医学上鲜有100%确定的疗效，请参考临床指南并加入限定条件，或改为"临床研究显示部分患者..."',
  },
  {
    category: 'dosage',
    patterns: [
      /\d+(?:\.\d+)?\s*(?:mg|g|ml|ug|μg|毫克|克|毫升|微克)/g,
      /(?:每日|每天|每次|一日|一次|早晚)\s*\d+\s*(?:次|片|粒|袋|包|毫升|滴)/g,
      /\d+\s*(?:片|粒|袋|包|滴|丸|支)\s*(?:每|\/)\s*(?:日|天|次|小时|h)/g,
      /(?:饭前|饭后|空腹|睡前)\s*(?:半?\s*[小时]?|约?\s*\d+\s*分钟)/g,
    ],
    riskLevel: 'high',
    suggestion: () =>
      '涉及具体用药剂量，请医生确认剂量范围是否准确，并补充"请遵医嘱，勿自行调整剂量"',
  },
  {
    category: 'population',
    patterns: [
      /(?:孕妇|哺乳期|产妇|妊娠|备孕期)/g,
      /(?:儿童|婴幼儿|婴儿|幼儿|新生儿|未成年人|青少年)/g,
      /(?:老年人|高龄|老年患者|老人)/g,
      /(?:肝肾功能不全|肝损伤|肾损伤|肾功能衰竭|肝功能异常)/g,
      /(?:高血压患者|糖尿病患者|心脏病患者|哮喘患者|过敏体质)/g,
      /(?:免疫力低下|免疫缺陷|长期服药)/g,
    ],
    riskLevel: 'medium',
    suggestion: () =>
      '涉及特殊人群，请医生确认该人群适用性、注意事项及禁忌症是否完整',
  },
  {
    category: 'contraindication',
    patterns: [
      /(?:禁用|忌用|严禁|禁止使用|绝对不能|切勿|不得使用|不可以使用)/g,
      /(?:危险|严重后果|危及生命|会导致|必定引发)/g,
      /(?:切勿|千万不要|一定不要|绝对不要)\s*(?:服用|使用|食用|尝试)/g,
    ],
    riskLevel: 'high',
    suggestion: () =>
      '禁忌类表述请核对权威说明书或指南，必要时改为"在医生指导下慎用"，避免绝对化',
  },
  {
    category: 'data_source',
    patterns: [
      /(?:研究表明|据统计|数据显示|临床研究|调查显示|报道称)/g,
      /(?:约?|接近)?\d+(?:\.\d+)?%/g,
      /(?:《[^》]*指南》|中国[^指南]*指南|专家共识|诊疗规范)/g,
      /(?:Cochrane|柳叶刀|NEJM|JAMA|BMJ|Nature Medicine|中华医学)/g,
      /(?:WHO|世界卫生组织|国家卫健委|FDA|EMA)\s*(?:推荐|指出|发布)?/g,
    ],
    riskLevel: 'medium',
    suggestion: () =>
      '涉及数据或引用来源，请补充具体出处（文献标题、年份、期刊），确保读者可追溯',
  },
];

const EXPRESSION_RULES: Array<{
  expressionType: ExpressionType;
  patterns: RegExp[];
  fallbackCategory: RiskCategory;
  fallbackRisk: RiskLevel;
  suggestion: () => string;
}> = [
  {
    expressionType: 'advertising',
    patterns: [
      /(?:赶紧用|马上去|必买|必入|强烈推荐|错过后悔|再不买就|手慢无|囤起来)/g,
      /(?:最有效|最好|第一选择|首选|唯一|绝无仅有|史上最|全网最)/g,
      /(?:神药|神奇|魔法|奇迹|黑科技|神器|秒变|速愈)/g,
      /(?:点击购买|下单|优惠|促销|限时|折扣|买赠|领券)/g,
    ],
    fallbackCategory: 'treatment_effect',
    fallbackRisk: 'high',
    suggestion: () =>
      '存在广告化或营销式表达，科普内容应保持客观中立，避免引导性购物或夸大',
  },
  {
    expressionType: 'vague_suggestion',
    patterns: [
      /(?:可能有效|也许|说不定|感觉|个人认为|大概|差不多|或许|貌似|应该)/g,
      /(?:试试看|不妨试试|可以试试|不试白不试|试试也无妨)/g,
      /(?:一般来说|通常情况下|大部分人|有的人|有些人|不少人)/g,
    ],
    fallbackCategory: 'treatment_effect',
    fallbackRisk: 'low',
    suggestion: () =>
      '建议表述较为模糊，请明确证据等级（A级推荐/专家意见/个案）或删除不确定表达',
  },
  {
    expressionType: 'guideline',
    patterns: [
      /(?:根据|依据|按照)\s*《[^》]+》/g,
      /(?:WHO|世界卫生组织|国家卫健委|中华医学会|中国医师协会)\s*(?:发布|推荐|建议|指出)/g,
      /(?:Cochrane|循证医学|系统综述|Meta分析|随机对照试验|RCT)/g,
    ],
    fallbackCategory: 'data_source',
    fallbackRisk: 'medium',
    suggestion: () =>
      '引用指南/权威组织，请核对最新版本号及具体章节，必要时给出引用链接',
  },
  {
    expressionType: 'patient_story',
    patterns: [
      /(?:我身边的|我朋友|我家人|我亲戚|我妈|我爸|我爷爷|我奶奶|某患者|有一位)/g,
      /(?:张阿姨|李叔叔|王姐|刘哥|赵大爷|孙阿姨|老陈|老李|小吴|小王|大张)/g,
      /(?:亲测|亲身经历|我自己|亲身体验|我试过|我用过|我服用)/g,
      /(?:吃了|用了|服用|坚持了)\s*(?:\d+\s*(?:天|周|月|个疗程))?.{0,20}(?:就好了|见效了|痊愈了|康复了|没事了)/g,
    ],
    fallbackCategory: 'treatment_effect',
    fallbackRisk: 'low',
    suggestion: () =>
      '患者个案不代表普遍疗效，请注明"个案仅供参考，疗效因人而异"并建议咨询医生',
  },
];

function runMatchers(
  paragraph: string,
  paragraphIndex: number
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  for (const rule of CATEGORY_RULES) {
    for (const re of rule.patterns) {
      const matches = paragraph.matchAll(new RegExp(re.source, 'g'));
      for (const m of matches) {
        if (typeof m.index !== 'number') continue;
        candidates.push({
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          category: rule.category,
          expressionType: 'guideline',
          riskLevel: rule.riskLevel,
          suggestion: rule.suggestion(m[0]),
        });
      }
    }
  }

  for (const rule of EXPRESSION_RULES) {
    for (const re of rule.patterns) {
      const matches = paragraph.matchAll(new RegExp(re.source, 'g'));
      for (const m of matches) {
        if (typeof m.index !== 'number') continue;
        candidates.push({
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          category: rule.fallbackCategory,
          expressionType: rule.expressionType,
          riskLevel: rule.fallbackRisk,
          suggestion: rule.suggestion(),
        });
      }
    }
  }

  const expressionFromContext = (text: string): ExpressionType => {
    for (const rule of EXPRESSION_RULES) {
      if (rule.patterns.some((re) => re.test(text))) return rule.expressionType;
    }
    return 'vague_suggestion';
  };

  for (const c of candidates) {
    if (CATEGORY_RULES.some((r) => r.category === c.category)) {
      c.expressionType = expressionFromContext(c.text);
    }
  }

  return dedupe(candidates, paragraphIndex);
}

function dedupe(
  candidates: MatchCandidate[],
  _paragraphIndex: number
): MatchCandidate[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });
  const result: MatchCandidate[] = [];
  for (const c of sorted) {
    const overlaps = result.some(
      (r) => c.start < r.end && c.end > r.start && r.text === c.text
    );
    if (overlaps) continue;
    result.push(c);
  }
  return result;
}

function expandToSentence(
  text: string,
  start: number,
  end: number
): { start: number; end: number; sentence: string } {
  const delimiters = '。！？!?.\n';
  let s = start;
  while (s > 0 && !delimiters.includes(text[s - 1])) s--;
  let e = end;
  while (e < text.length && !delimiters.includes(text[e])) e++;
  if (e < text.length) e += 1;
  const sentence = text.slice(s, e).trim();
  return { start: s, end: e, sentence: sentence || text.slice(start, end) };
}

export function annotateArticle(paragraphs: string[]): Annotation[] {
  const annotations: Annotation[] = [];
  let lineCounter = 0;

  paragraphs.forEach((paragraph, pIdx) => {
    if (!paragraph.trim()) {
      lineCounter += 1;
      return;
    }
    const lineStart = lineCounter + 1;
    const candidates = runMatchers(paragraph, pIdx);
    const usedRanges: Array<[number, number]> = [];

    for (const c of candidates) {
      const already = usedRanges.some(
        ([s, e]) => c.start < e && c.end > s
      );
      if (already) continue;

      const { start, end, sentence } = expandToSentence(
        paragraph,
        c.start,
        c.end
      );
      usedRanges.push([start, end]);

      const offsetInPara = paragraph.slice(0, c.start).split('\n').length - 1;
      const line = lineStart + offsetInPara;

      annotations.push({
        id: genId('ann'),
        originalText: sentence,
        paragraphIndex: pIdx,
        startChar: start,
        endChar: end,
        lineNumber: line,
        category: c.category,
        expressionType: c.expressionType,
        riskLevel: c.riskLevel,
        suggestion: c.suggestion,
        editorStatus: 'pending',
        doctorDecision: 'pending',
      });
    }

    lineCounter += paragraph.split('\n').length;
  });

  return annotations;
}
