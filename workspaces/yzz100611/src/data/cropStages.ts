import type { CropStageReference } from '@/types';

export const CROP_STAGES: CropStageReference[] = [
  {
    stage: '育苗期',
    ecRange: [0.8, 1.2],
    description: '幼苗期，EC值宜低，促进根系发育',
  },
  {
    stage: '生长期',
    ecRange: [1.5, 2.0],
    description: '营养生长旺盛期，需要较高养分',
  },
  {
    stage: '开花期',
    ecRange: [1.8, 2.5],
    description: '开花坐果期，需增加磷钾肥',
  },
  {
    stage: '结果期',
    ecRange: [2.0, 2.8],
    description: '果实膨大期，养分需求最高',
  },
  {
    stage: '成熟期',
    ecRange: [1.5, 2.0],
    description: '采收期，适当降低EC提高品质',
  },
];

export function getEcRangeForStage(stage: string): [number, number] | null {
  const found = CROP_STAGES.find((s) => s.stage === stage);
  return found ? found.ecRange : null;
}
