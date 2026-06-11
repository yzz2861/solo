export const SAFETY_THRESHOLDS = {
  DEFAULT_MAX_HOIST_LOAD: 500,
  DEFAULT_MIN_AUDIENCE_DISTANCE: 2,
  DEFAULT_MAX_LOAD_VARIANCE: 0.3,
  OVERLOAD_WARNING_RATIO: 0.8,
  OVERLOAD_CRITICAL_RATIO: 1.0,
  DISTANCE_WARNING_RATIO: 1.5,
  DISTANCE_CRITICAL_RATIO: 1.0,
  MAX_HISTORY_ENTRIES: 20,
} as const;

export const RISK_SUGGESTIONS = {
  overload: [
    '减少该吊点挂载的设备数量',
    '增加辅助吊点分担重量',
    '更换承重能力更强的吊点',
    '将部分设备移动到其他吊点',
  ],
  tooClose: [
    '将设备向远离观众区的方向移动',
    '增加设备的悬挂高度',
    '调整观众区的位置范围',
    '在设备下方设置安全警示区域',
  ],
  unbalanced: [
    '重新分配各吊点的负载',
    '在负载较轻的吊点增加设备',
    '调整设备位置使重量分布更均匀',
    '考虑在负载较重区域增加吊点',
  ],
  weightMissing: [
    '请填写该设备的重量参数',
    '参考设备说明书获取准确重量',
    '如果不确定重量，建议使用估测值并添加安全余量',
  ],
} as const;

export const getOverloadSuggestion = (currentLoad: number, maxLoad: number): string => {
  const overloadPercent = ((currentLoad - maxLoad) / maxLoad * 100).toFixed(0);
  return `当前超载 ${overloadPercent}%，${RISK_SUGGESTIONS.overload[0]}`;
};

export const getDistanceSuggestion = (distance: number, minDistance: number): string => {
  const deficit = (minDistance - distance).toFixed(1);
  return `距离不足 ${deficit}m，${RISK_SUGGESTIONS.tooClose[0]}`;
};

export const getUnbalancedSuggestion = (variance: number, maxVariance: number): string => {
  return `负载分布方差 ${variance.toFixed(2)} 超过阈值 ${maxVariance}，${RISK_SUGGESTIONS.unbalanced[0]}`;
};
