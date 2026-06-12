import type { TypoEntry } from '@/types';

export const commonTypos: TypoEntry[] = [
  { wrong: '包奘', correct: '包装' },
  { wrong: '质亮', correct: '质量' },
  { wrong: '物留', correct: '物流' },
  { wrong: '田', correct: '甜' },
  { wrong: '太度', correct: '态度' },
  { wrong: '快弟', correct: '快递' },
  { wrong: '作工', correct: '做工' },
  { wrong: '细妮', correct: '细腻' },
  { wrong: '划酸', correct: '划算' },
  { wrong: '价兼', correct: '价廉' },
  { wrong: '神马', correct: '什么' },
  { wrong: '酱紫', correct: '这样子' },
  { wrong: '童鞋', correct: '同学' },
  { wrong: '盆友', correct: '朋友' },
  { wrong: '灰常', correct: '非常' },
  { wrong: '鸡冻', correct: '激动' },
];

export const typoMap: Record<string, string> = commonTypos.reduce((acc, entry) => {
  acc[entry.wrong] = entry.correct;
  return acc;
}, {} as Record<string, string>);
