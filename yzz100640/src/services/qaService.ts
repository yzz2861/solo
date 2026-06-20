import type { MaterialItem, QARecord } from '@/types';
import { INITIAL_MATERIALS } from '@/data/mockData';
import { getStorage, setStorage, generateId } from '@/utils/storage';

interface MatchedMaterial {
  material: MaterialItem;
  score: number;
  matchedKeywords: string[];
  filterReasons: string[];
}

function tokenize(text: string): string[] {
  const cleaned = text.replace(/[，。！？、；：""''（）【】\[\].,!?;:\(\)"'\-~～\s]+/g, ' ');
  const tokens: string[] = [];
  const parts = cleaned.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    if (part.length <= 2) {
      tokens.push(part);
    } else {
      for (let i = 0; i < part.length - 1; i++) {
        tokens.push(part.slice(i, i + 2));
      }
      for (let i = 0; i < part.length; i++) {
        tokens.push(part.slice(i, i + 1));
      }
    }
  }
  return Array.from(new Set(tokens)).filter((t) => t.length >= 1);
}

function calculateMatchScore(question: string, material: MaterialItem): { score: number; matchedKeywords: string[] } {
  const tokens = tokenize(question);
  const searchFields = [
    ...material.keywords,
    material.title,
    material.content,
    ...(material.applicableVarieties || []),
    ...material.applicableCrops,
    ...material.applicableRegions,
    ...material.applicableSeasons,
  ];
  const searchText = searchFields.join(' ');
  let score = 0;
  const matchedKeywords: string[] = [];
  for (const token of tokens) {
    if (token.length === 0) continue;
    let count = 0;
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const match = searchText.match(regex);
    if (match) count = match.length;
    if (count > 0) {
      const keywordWeight = material.keywords.some((k) => k.includes(token) || token.includes(k)) ? 3 : 1;
      const titleWeight = material.title.includes(token) ? 2 : 1;
      score += count * keywordWeight * titleWeight * (token.length >= 2 ? 2 : 1);
      matchedKeywords.push(token);
    }
  }
  for (const kw of material.keywords) {
    if (question.includes(kw)) {
      score += 10;
      if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
    }
  }
  return { score, matchedKeywords: Array.from(new Set(matchedKeywords)) };
}

function extractSnippet(content: string, keywords: string[]): string {
  const effectiveKeywords = keywords.filter((k) => content.includes(k));
  if (effectiveKeywords.length === 0) {
    return content.slice(0, 80) + (content.length > 80 ? '...' : '');
  }
  const firstKeyword = effectiveKeywords[0];
  const index = content.indexOf(firstKeyword);
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + firstKeyword.length + 40);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

function applyFilters(
  material: MaterialItem,
  filters: QARecord['filters']
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (filters.crop && !material.applicableCrops.some((c) => c === filters.crop || c.includes(filters.crop!) || filters.crop!.includes(c))) {
    reasons.push(`资料适用作物为${material.applicableCrops.join('、')}，与筛选作物${filters.crop}不匹配`);
  }
  if (filters.variety) {
    const varieties = material.applicableVarieties || [];
    if (!varieties.some((v) => v === filters.variety || v.includes(filters.variety!) || filters.variety!.includes(v))) {
      reasons.push(`资料适用品种为${varieties.length > 0 ? varieties.join('、') : '未指定'}，与筛选品种${filters.variety}不匹配`);
    }
  }
  if (filters.region) {
    if (!material.applicableRegions.some((r) => r === filters.region || r.includes(filters.region!) || filters.region!.includes(r))) {
      reasons.push(`资料适用地区为${material.applicableRegions.join('、')}，与筛选地区${filters.region}不匹配`);
    }
  }
  if (filters.season) {
    if (!material.applicableSeasons.some((s) => s === filters.season || s.includes(filters.season!) || filters.season!.includes(s))) {
      reasons.push(`资料适用季节为${material.applicableSeasons.join('、')}，与筛选季节${filters.season}不匹配`);
    }
  }
  return { passed: reasons.length === 0, reasons };
}

export const QAService = {
  async query(question: string, filters: QARecord['filters']): Promise<QARecord> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userMaterials = getStorage<MaterialItem[]>('experience_materials', []);
        const approvedUserMaterials = userMaterials.filter((m) => m.status === 'approved');
        const allMaterials = [...INITIAL_MATERIALS, ...approvedUserMaterials];

        const matchedList: MatchedMaterial[] = [];
        for (const material of allMaterials) {
          const { score, matchedKeywords } = calculateMatchScore(question, material);
          if (score > 0) {
            const { passed, reasons } = applyFilters(material, filters);
            if (passed) {
              matchedList.push({ material, score, matchedKeywords, filterReasons: [] });
            } else {
              matchedList.push({ material, score: score * 0.3, matchedKeywords, filterReasons: reasons });
            }
          }
        }
        matchedList.sort((a, b) => b.score - a.score);

        if (matchedList.length === 0) {
          const record: QARecord = {
            id: generateId('QA'),
            question,
            filters,
            answer: '暂未检索到相关资料，请根据当地实际情况人工判断',
            sources: [],
            applicableConditions: [],
            needsManualJudgment: true,
            judgmentReasons: ['资料库中暂无相关内容'],
            confidence: 0,
            adopted: null,
            createdAt: new Date().toISOString(),
            askedBy: '农技员',
          };
          resolve(record);
          return;
        }

        const topMatches = matchedList.slice(0, 5);
        const passedMatches = topMatches.filter((m) => m.filterReasons.length === 0);
        const finalMatches = passedMatches.length > 0 ? passedMatches : topMatches.slice(0, 3);

        const answerParts: string[] = [];
        for (let i = 0; i < Math.min(3, finalMatches.length); i++) {
          const content = finalMatches[i].material.content;
          const partial = content.slice(0, 100);
          answerParts.push(partial + (content.length > 100 ? '...' : ''));
        }
        const answer = answerParts.join('；') + '。';

        const sources = finalMatches.map((m) => ({
          materialId: m.material.id,
          sourceType: m.material.sourceType,
          sourceName: m.material.sourceName,
          snippet: extractSnippet(m.material.content, m.matchedKeywords),
          page: m.material.sourcePage,
        }));

        const conditionsSet = new Set<string>();
        for (const m of finalMatches) {
          m.material.applicableCrops.forEach((c) => conditionsSet.add(`作物：${c}`));
          (m.material.applicableVarieties || []).forEach((v) => conditionsSet.add(`品种：${v}`));
          m.material.applicableRegions.forEach((r) => conditionsSet.add(`地区：${r}`));
          m.material.applicableSeasons.forEach((s) => conditionsSet.add(`季节：${s}`));
        }
        const applicableConditions = Array.from(conditionsSet);

        const maxScore = matchedList[0].score;
        const confidence = Math.min(100, Math.max(0, Math.round((maxScore / (maxScore + 20)) * 100)));

        const judgmentReasons: string[] = [];
        for (const m of finalMatches) {
          if (m.filterReasons.length > 0) {
            judgmentReasons.push(`${m.material.title}：${m.filterReasons.join('；')}`);
          }
        }
        if (filters.variety && !finalMatches.some((m) => (m.material.applicableVarieties || []).some((v) => v === filters.variety || v.includes(filters.variety!) || filters.variety!.includes(v)))) {
          judgmentReasons.push(`未找到完全匹配品种"${filters.variety}"的资料，建议人工判断适用性`);
        }
        if (filters.region && !finalMatches.some((m) => m.material.applicableRegions.some((r) => r === filters.region || r.includes(filters.region!) || filters.region!.includes(r)))) {
          judgmentReasons.push(`未找到完全匹配地区"${filters.region}"的资料，建议人工判断适用性`);
        }
        if (filters.season && !finalMatches.some((m) => m.material.applicableSeasons.some((s) => s === filters.season || s.includes(filters.season!) || filters.season!.includes(s)))) {
          judgmentReasons.push(`未找到完全匹配季节"${filters.season}"的资料，建议人工判断适用性`);
        }

        const needsManualJudgment = confidence <= 70 || judgmentReasons.length > 0;

        const record: QARecord = {
          id: generateId('QA'),
          question,
          filters,
          answer,
          sources,
          applicableConditions,
          needsManualJudgment,
          judgmentReasons: judgmentReasons.length > 0 ? judgmentReasons : undefined,
          confidence,
          adopted: null,
          createdAt: new Date().toISOString(),
          askedBy: '农技员',
        };
        resolve(record);
      }, 500);
    });
  },

  async markAdoption(recordId: string, adopted: boolean, note?: string): Promise<void> {
    const history = getStorage<QARecord[]>('qa_history', []);
    const index = history.findIndex((r) => r.id === recordId);
    if (index !== -1) {
      history[index].adopted = adopted;
      if (note !== undefined) {
        history[index].adoptionNote = note;
      }
      setStorage('qa_history', history);
    }
  },

  async getHistory(): Promise<QARecord[]> {
    const history = getStorage<QARecord[]>('qa_history', []);
    return [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async saveRecord(record: QARecord): Promise<void> {
    const history = getStorage<QARecord[]>('qa_history', []);
    history.unshift(record);
    if (history.length > 100) {
      history.length = 100;
    }
    setStorage('qa_history', history);
  },
};
