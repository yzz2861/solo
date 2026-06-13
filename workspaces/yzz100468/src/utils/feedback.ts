import { ToothRegion, REGION_NAMES } from '@/types';

export const feedbackMessages = {
  tooHard: [
    '轻一点哦～牙齿喜欢温柔的按摩',
    '慢一点，太用力会伤到牙龈的',
    '嘘～轻轻刷，像给牙齿挠痒痒',
  ],
  tooLight: [
    '再用一点点力～',
    '这样刷不干净哦，稍微用点力',
    '再加点力度，牙齿才会亮晶晶',
  ],
  good: [
    '对！就是这样～',
    '太棒了，保持住！',
    '真厉害，刷得干干净净！',
    '完美！继续保持～',
  ],
  sameSpot: [
    '往前挪一点点，别只刷一个地方哦',
    '别忘了旁边的牙齿也需要照顾～',
    '左右移动一下，让每颗牙齿都刷到',
  ],
  skipRegion: [
    '别急，我们把这一面刷完再换下一个',
    '再坚持一下，这一面还差一点点',
    '慢慢来，每一面都要刷够时间哦',
  ],
  regionStart: {
    outer: '先来刷牙齿的外侧，从左到右画圈圈～',
    inner: '现在来刷内侧，嘴巴微微张开，牙刷竖起来哦',
    occlusal: '接下来是咬合面，来回刷，把食物残渣都赶跑！',
    lingual: '最后是舌侧面，刷头立起来，轻轻刷前牙内侧',
  },
  regionComplete: {
    outer: '外侧刷完啦，干干净净的！',
    inner: '内侧也刷好了，真棒！',
    occlusal: '咬合面刷完啦，咀嚼更有力！',
    lingual: '舌侧面也完成了，太厉害啦！',
  },
};

export function getRandomFeedback(category: keyof typeof feedbackMessages): string {
  const messages = feedbackMessages[category];
  if (Array.isArray(messages)) {
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return '';
}

export function getRegionStartMessage(region: ToothRegion): string {
  const msgs = feedbackMessages.regionStart;
  return msgs[region] || '';
}

export function getRegionCompleteMessage(region: ToothRegion): string {
  const msgs = feedbackMessages.regionComplete;
  return msgs[region] || '';
}

export function generateParentSuggestions(weakRegions: ToothRegion[], avgScore: number): string[] {
  const suggestions: string[] = [];

  if (weakRegions.length > 0) {
    const regionNames = weakRegions.map(r => REGION_NAMES[r]).join('、');
    suggestions.push(`最近${regionNames}刷得不够多，可以多练习这几个区域`);
  }

  if (avgScore < 60) {
    suggestions.push('建议每天早晚各练习一次，每次2分钟');
    suggestions.push('可以陪着孩子一起刷，做好榜样');
  } else if (avgScore < 80) {
    suggestions.push('已经很棒了！再多注意一下容易漏掉的区域');
    suggestions.push('可以试着让孩子自己刷，刷完后家长检查一下');
  } else {
    suggestions.push('保持得很好！继续坚持每天刷牙');
    suggestions.push('可以适当增加难度，挑战更快的速度');
  }

  suggestions.push('记得每3个月更换一次牙刷哦');
  suggestions.push('饭后漱口，少吃甜食，牙齿更健康');

  return suggestions.slice(0, 4);
}

export function generateDoctorTalkingPoints(
  avgScore: number,
  totalPractices: number,
  weakRegions: ToothRegion[],
  commonIssues: string[]
): string[] {
  const points: string[] = [];

  if (avgScore >= 80) {
    points.push('刷牙习惯保持得非常好，值得表扬！');
  } else if (avgScore >= 60) {
    points.push('已经有不错的刷牙基础，继续努力会更好');
  } else {
    points.push('需要加强刷牙练习，建议家长多陪伴引导');
  }

  if (totalPractices >= 14) {
    points.push('练习频率很高，坚持得很好');
  } else if (totalPractices >= 7) {
    points.push('基本能保持每天练习，继续保持');
  } else {
    points.push('练习次数偏少，建议每天早晚各一次');
  }

  if (weakRegions.length > 0) {
    const regionNames = weakRegions.map(r => REGION_NAMES[r]).join('、');
    points.push(`重点加强${regionNames}的刷牙练习`);
  }

  if (commonIssues.includes('力度过大')) {
    points.push('注意刷牙力度，避免损伤牙釉质和牙龈');
  }
  if (commonIssues.includes('漏刷区域')) {
    points.push('注意不要漏掉牙齿内侧和舌侧面');
  }

  points.push('使用含氟牙膏，每次用量约豌豆大小');
  points.push('建议每半年进行一次口腔检查');

  return points;
}
