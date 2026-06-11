import type { ComplaintSource } from '@/types';

export const PROBLEM_TYPE_MAPPING: Record<string, string[]> = {
  '电梯问题': ['电梯', '梯控', '困梯', '电梯噪音', '电梯坏', '电梯停', '电梯卡'],
  '给排水问题': ['漏水', '渗水', '水管', '下水道', '堵塞', '排水', '水龙头', '马桶', '水表'],
  '电力照明': ['灯坏', '停电', '跳闸', '电路', '电线', '开关', '灯泡', '照明'],
  '噪音扰民': ['噪音', '扰民', '装修', '狗叫', '大声', '唱歌', '施工'],
  '环境卫生': ['卫生', '垃圾', '保洁', '异味', '臭味', '蟑螂', '老鼠', '清扫'],
  '安防门禁': ['门禁', '刷卡', '门锁', '保安', '监控', '门坏', '单元门'],
  '停车管理': ['停车', '车位', '车辆', '道闸', '车库', '收费', '挪车'],
  '绿化养护': ['绿化', '草坪', '树木', '虫', '剪枝', '浇水', '枯'],
};

export const SOURCE_KEYWORDS: Record<ComplaintSource, string[]> = {
  '电话': ['电话', '来电', 'call', 'phone'],
  '业主群': ['业主群', '微信', '群', 'wechat', '群里'],
  '工单系统': ['工单', '系统', '系统派', 'APP', 'app', '线上'],
  '其他': ['其他', '上门', '现场'],
};

export const OVERDUE_THRESHOLD_HOURS = 72;
export const SLOW_RESPONSE_THRESHOLD_HOURS = 2;

export function standardizeProblemType(raw: string): { type: string; confidence: number; flags: string[] } {
  if (!raw) return { type: '未分类', confidence: 0, flags: ['type_unconfirmed'] };
  
  const rawLower = raw.toLowerCase();
  let bestMatch = '未分类';
  let bestConfidence = 0;
  const flags: string[] = [];

  for (const [standardType, keywords] of Object.entries(PROBLEM_TYPE_MAPPING)) {
    let matchCount = 0;
    for (const kw of keywords) {
      if (rawLower.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }
    const confidence = matchCount > 0 ? Math.min(1, matchCount / Math.max(1, keywords.length / 2)) : 0;
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = standardType;
    }
  }

  if (bestConfidence > 0 && bestConfidence < 0.6) {
    flags.push('type_unconfirmed');
  }
  if (bestMatch !== raw.trim()) {
    flags.push('type_standardized');
  }

  return { type: bestMatch, confidence: bestConfidence, flags };
}

export function standardizeSource(raw: string): ComplaintSource {
  if (!raw) return '其他';
  const rawLower = raw.toLowerCase();
  for (const [source, keywords] of Object.entries(SOURCE_KEYWORDS)) {
    for (const kw of keywords) {
      if (rawLower.includes(kw.toLowerCase())) {
        return source as ComplaintSource;
      }
    }
  }
  return '其他';
}
