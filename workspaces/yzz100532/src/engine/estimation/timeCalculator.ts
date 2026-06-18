import type { TunnelEdge, TimeCalculationParams } from '../../types';

const DEFAULT_BASE_SPEED = 1.2;
const EQUIPMENT_FACTOR = 0.8;
const SLOPE_STEP_DEGREES = 5;
const SLOPE_FACTOR_PER_STEP = 0.9;
const WATER_LOW_FACTOR = 0.7;
const WATER_HIGH_FACTOR = 0.4;
const WATER_LOW_MIN = 0.3;
const WATER_LOW_MAX = 0.5;
const WATER_HIGH_MIN = 0.5;
const WATER_HIGH_MAX = 1.0;

/**
 * 计算积水深度对应的速度调整系数
 * @param waterDepth 积水深度（米）
 * @returns 速度调整系数
 */
function getWaterFactor(waterDepth?: number): number {
  if (waterDepth === undefined || waterDepth <= 0) {
    return 1.0;
  }

  if (waterDepth >= WATER_LOW_MIN && waterDepth <= WATER_LOW_MAX) {
    return WATER_LOW_FACTOR;
  }

  if (waterDepth > WATER_HIGH_MIN && waterDepth <= WATER_HIGH_MAX) {
    return WATER_HIGH_FACTOR;
  }

  if (waterDepth > WATER_HIGH_MAX) {
    return 0;
  }

  return 1.0;
}

/**
 * 计算坡度对应的速度调整系数
 * @param slopeAngle 坡度角度（度）
 * @returns 速度调整系数
 */
function getSlopeFactor(slopeAngle?: number): number {
  if (slopeAngle === undefined || slopeAngle <= 0) {
    return 1.0;
  }

  const steps = Math.floor(Math.abs(slopeAngle) / SLOPE_STEP_DEGREES);
  return Math.pow(SLOPE_FACTOR_PER_STEP, steps);
}

/**
 * 计算单条边的通过时间
 * @param edge 巷道边
 * @param baseSpeed 基准速度
 * @param hasEquipment 是否佩戴装备
 * @returns 通过时间（秒）
 */
function calculateEdgeTime(
  edge: TunnelEdge,
  baseSpeed: number,
  hasEquipment: boolean
): number {
  let speed = baseSpeed;

  speed *= getWaterFactor(edge.waterDepth);

  speed *= getSlopeFactor(edge.slopeAngle);

  if (hasEquipment) {
    speed *= EQUIPMENT_FACTOR;
  }

  if (speed <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return edge.length / speed;
}

/**
 * 时间估算器，计算路线的预计总时间
 * @param params 时间计算参数
 * @returns 预计总时间（秒）
 */
export function calculateTime(params: TimeCalculationParams): number {
  const { edges, baseSpeed = DEFAULT_BASE_SPEED, hasEquipment = false } = params;

  if (edges.length === 0) {
    return 0;
  }

  let totalTime = 0;

  for (const edge of edges) {
    const edgeTime = calculateEdgeTime(edge, baseSpeed, hasEquipment);
    totalTime += edgeTime;
  }

  return totalTime;
}

/**
 * 格式化时间显示，将秒转换为可读格式
 * @param seconds 秒数
 * @returns 格式化的时间字符串
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) {
    return '无法通行';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }

  return `${remainingSeconds}秒`;
}

/**
 * 获取时间估算详情，返回每条边的时间明细
 * @param params 时间计算参数
 * @returns 每条边的时间明细
 */
export function getTimeBreakdown(
  params: TimeCalculationParams
): { edgeId: string; time: number; distance: number }[] {
  const { edges, baseSpeed = DEFAULT_BASE_SPEED, hasEquipment = false } = params;

  return edges.map((edge) => ({
    edgeId: edge.id,
    time: calculateEdgeTime(edge, baseSpeed, hasEquipment),
    distance: edge.length,
  }));
}
