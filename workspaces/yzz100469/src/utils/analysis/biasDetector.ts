import type { Annotation } from '@/types';
import { generateId, isProtectedContent, getParagraphOffsets } from './textProcessor';

const BIAS_PATTERNS = [
  {
    regex: /女孩子|女生|女性做(?:开发|技术|编程|后端|前端|算法|架构)/,
    type: '性别偏见',
    reason: '对女性技术能力的刻板假设',
    suggestion: '建议删除性别相关评价，聚焦候选人的实际能力和项目经验',
  },
  {
    regex: /男生更适合|男性更|男人适合|男孩子适合/,
    type: '性别偏见',
    reason: '基于性别的岗位偏好判断',
    suggestion: '建议基于岗位要求评估，不做性别差异化假设',
  },
  {
    regex: /(?:年纪|年龄)(?:大|小|太大|太小|有点大|不小)/,
    type: '年龄偏见',
    reason: '基于年龄的能力判断',
    suggestion: '建议删除年龄相关评价，评估候选人的经验和能力本身',
  },
  {
    regex: /(?:90后|00后|80后)(?:不稳定|吃不了苦|抗压差|太浮躁|太跳)/,
    type: '代际刻板印象',
    reason: '对特定年代人群的偏见假设',
    suggestion: '建议基于候选人个人经历评估稳定性，不做代际标签化判断',
  },
  {
    regex: /形象(?:一般|不错|挺好|不太好|好|差)|长相|外貌|颜值|穿着(?:得体|太随意|太正式|不合适)/,
    type: '外貌偏见',
    reason: '以外貌/穿着作为能力判断依据',
    suggestion: '除非岗位有明确形象要求（如前台、模特），否则建议删除外貌相关评价',
  },
  {
    regex: /[\u4e00-\u9fa5]{2,4}(?:人|出来的|那边的|本地人|外地人)/,
    type: '地域偏见',
    reason: '基于地域的性格/能力假设',
    suggestion: '建议删除地域相关评价，聚焦候选人个人表现',
  },
  {
    regex: /(?:学校|学历|出身)(?:不行|不好|一般|太差|低|普通)|(?:不是|非)(?:985|211|双一流|名校|重点)/,
    type: '学历/学校偏见',
    reason: '以学校背景代替能力评估',
    suggestion: '建议基于候选人实际技术能力和项目经验评估，学历仅作参考',
  },
  {
    regex: /我(?:不)?喜欢(?:这种|这样|他的|她的)/,
    type: '个人好恶',
    reason: '将个人喜好作为录用判断依据',
    suggestion: '建议将"喜欢/不喜欢"替换为具体的能力维度评价，保持专业性',
  },
  {
    regex: /气场(?:不合|不和|不太合|不对)|性格(?:太|不)(?:内向|外向|张扬|沉闷|孤僻)/,
    type: '性格偏见',
    reason: '主观性格判断，缺少行为证据',
    suggestion: '建议用具体场景描述性格表现，如"在讨论中较少主动发言"而非"太内向"',
  },
  {
    regex: /(?:应该|可能|估计|大概)(?:扛不住|吃不消|做不好|胜任不了|跟不上)/,
    type: '预判性偏见',
    reason: '未经求证的负面预判',
    suggestion: '建议通过追问验证，而非直接下预判性结论',
  },
];

export function detectBias(content: string, paragraphs: string[]): Annotation[] {
  const annotations: Annotation[] = [];
  const paraOffsets = getParagraphOffsets(content, paragraphs);

  paragraphs.forEach((para, paraIdx) => {
    if (paraOffsets[paraIdx]) {
      const paraOffset = paraOffsets[paraIdx].start;

      BIAS_PATTERNS.forEach(({ regex, type, reason, suggestion }) => {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(para)) !== null) {
          const matchedText = match[0];
          if (!isProtectedContent(matchedText, para)) {
            const contextStart = Math.max(0, match.index - 5);
            const contextEnd = Math.min(para.length, match.index + matchedText.length + 5);
            const contextText = para.slice(contextStart, contextEnd).trim();

            annotations.push({
              id: generateId('ann'),
              type: 'bias',
              text: contextText,
              start: paraOffset + contextStart,
              end: paraOffset + contextEnd,
              paragraphIndex: paraIdx,
              reason: `检测到${type}：${reason}`,
              suggestion,
              isManual: false,
              createdAt: Date.now(),
            });
          }
        }
      });
    }
  });

  return deduplicateAnnotations(annotations);
}

function deduplicateAnnotations(annotations: Annotation[]): Annotation[] {
  const seen = new Set<string>();
  return annotations.filter(ann => {
    const key = `${ann.paragraphIndex}-${ann.start}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getBiasTypes(annotations: Annotation[]): string[] {
  const types = new Set<string>();
  BIAS_PATTERNS.forEach(p => {
    annotations.forEach(ann => {
      if (ann.type === 'bias' && ann.reason?.includes(p.type)) {
        types.add(p.type);
      }
    });
  });
  return Array.from(types);
}
