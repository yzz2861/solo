import { ToothRegion, RegionDetail, PracticeRecord, REGION_ORDER } from '@/types';

export function calculateScore(regions: Record<ToothRegion, RegionDetail>, totalDuration: number, targetDuration: number): { score: number; stars: number; overallIssues: string[] } {
  let totalCleanliness = 0;
  let completedCount = 0;
  const issues: string[] = [];

  REGION_ORDER.forEach((region) => {
    const detail = regions[region];
    totalCleanliness += detail.cleanliness;
    if (detail.completed) {
      completedCount++;
    }
    if (detail.issues.length > 0) {
      issues.push(...detail.issues);
    }
  });

  const avgCleanliness = totalCleanliness / 4;
  const completionRate = completedCount / 4;

  const timeRatio = Math.min(totalDuration / targetDuration, 1);

  const cleanlinessScore = avgCleanliness * 0.4;
  const completionScore = completionRate * 100 * 0.3;
  const timeScore = timeRatio * 100 * 0.3;

  const issuePenalty = Math.min(issues.length * 3, 15);

  let score = Math.round(cleanlinessScore + completionScore + timeScore - issuePenalty);
  score = Math.max(0, Math.min(100, score));

  let stars = 0;
  if (score >= 90) stars = 3;
  else if (score >= 70) stars = 2;
  else if (score >= 50) stars = 1;

  const overallIssues: string[] = [];
  if (completionRate < 1) {
    const skipped = REGION_ORDER.filter(r => !regions[r].completed);
    if (skipped.length > 0) {
      overallIssues.push('有区域没有刷到哦');
    }
  }
  if (timeRatio < 0.8) {
    overallIssues.push('刷牙时间有点短');
  }
  if (issues.some(i => i.includes('力度'))) {
    overallIssues.push('刷牙力度需要注意');
  }

  return { score, stars, overallIssues: [...new Set(overallIssues)] };
}

export function getEncouragement(score: number, stars: number, childName: string): string {
  const encouragements = {
    3: [
      `太棒了${childName}！牙齿刷得干干净净！`,
      `哇，${childName}是刷牙小能手！`,
      `完美！${childName}的牙齿闪闪发光～`,
      `太厉害了！给${childName}点个大大的赞！`,
    ],
    2: [
      `不错哦${childName}，继续加油！`,
      `很棒！再努力一点点就完美啦～`,
      `好样的${childName}！下次会更好！`,
      `进步很大呢，继续保持！`,
    ],
    1: [
      `加油${childName}，已经很棒啦！`,
      `不错的开始，多多练习就会更好～`,
      `第一次已经很棒了，我们再来一次？`,
      `慢慢来，每天进步一点点！`,
    ],
    0: [
      `没关系${childName}，我们再试一次！`,
      `别着急，我们一起学习正确的刷牙方法～`,
      `第一次尝试已经很棒啦，再来一次好不好？`,
      `每一次练习都是进步哦！`,
    ],
  };

  const list = encouragements[stars as keyof typeof encouragements] || encouragements[0];
  return list[Math.floor(Math.random() * list.length)];
}
