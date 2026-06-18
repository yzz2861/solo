import type { TunnelEdge, RouteWarning, AccidentType, ConstraintType } from '../../types';

const WATER_WARNING_THRESHOLD = 0.5;
const WATER_DANGER_THRESHOLD = 1.0;

/**
 * 检测边是否封闭
 * @param edge 巷道边
 * @returns 封闭警告，若未封闭则返回null
 */
function checkClosed(edge: TunnelEdge): RouteWarning | null {
  if (edge.isClosed) {
    return {
      type: 'closed',
      edgeId: edge.id,
      message: `巷道 ${edge.id} 已封闭，禁止通行`,
      severity: 'danger',
      suggestedAction: '请立即选择其他绕行路线',
    };
  }
  return null;
}

/**
 * 检测边的积水深度
 * @param edge 巷道边
 * @returns 积水警告，若无积水或积水在安全范围内则返回null
 */
function checkWaterDepth(edge: TunnelEdge): RouteWarning | null {
  const { waterDepth } = edge;

  if (waterDepth === undefined || waterDepth <= 0) {
    return null;
  }

  if (waterDepth > WATER_DANGER_THRESHOLD) {
    return {
      type: 'water_depth',
      edgeId: edge.id,
      message: `巷道积水深度 ${waterDepth.toFixed(2)}m，超过危险阈值 ${WATER_DANGER_THRESHOLD}m`,
      severity: 'danger',
      suggestedAction: '水深过深，禁止通行，请选择其他路线',
    };
  }

  if (waterDepth > WATER_WARNING_THRESHOLD) {
    return {
      type: 'water_depth',
      edgeId: edge.id,
      message: `巷道积水深度 ${waterDepth.toFixed(2)}m，超过警告阈值 ${WATER_WARNING_THRESHOLD}m`,
      severity: 'warning',
      suggestedAction: '请注意水深，缓慢通行，必要时更换路线',
    };
  }

  return null;
}

/**
 * 检测边的通风方向（仅在火灾事故时检测）
 * @param edge 巷道边
 * @param accidentType 事故类型
 * @returns 通风警告，若通风正常或非火灾事故则返回null
 */
function checkVentilation(edge: TunnelEdge, accidentType: AccidentType): RouteWarning | null {
  if (accidentType !== 'fire') {
    return null;
  }

  if (edge.ventilationDirection === 'forward') {
    return {
      type: 'ventilation',
      edgeId: edge.id,
      message: '火灾时顺风方向，烟雾扩散速度快，能见度低',
      severity: 'warning',
      suggestedAction: '建议逆风方向疏散，佩戴防毒面具，注意观察',
    };
  }

  return null;
}

/**
 * 检测单条边的所有约束条件
 * @param edge 巷道边
 * @param accidentType 事故类型
 * @returns 该边的所有警告数组
 */
function checkEdge(edge: TunnelEdge, accidentType: AccidentType): RouteWarning[] {
  const warnings: RouteWarning[] = [];

  const closedWarning = checkClosed(edge);
  if (closedWarning) warnings.push(closedWarning);

  const waterWarning = checkWaterDepth(edge);
  if (waterWarning) warnings.push(waterWarning);

  const ventilationWarning = checkVentilation(edge, accidentType);
  if (ventilationWarning) warnings.push(ventilationWarning);

  return warnings;
}

/**
 * 约束检测器，检测路线中每条边的约束条件
 * @param edges 路线中的边列表
 * @param accidentType 事故类型
 * @returns 所有警告的数组
 */
export function detectConstraints(
  edges: TunnelEdge[],
  accidentType: AccidentType
): RouteWarning[] {
  const warnings: RouteWarning[] = [];

  for (const edge of edges) {
    const edgeWarnings = checkEdge(edge, accidentType);
    warnings.push(...edgeWarnings);
  }

  return warnings;
}

/**
 * 根据警告类型获取显示的图标名称
 * @param type 约束类型
 * @returns 对应的图标名称
 */
export function getWarningIcon(type: ConstraintType): string {
  const iconMap: Record<ConstraintType, string> = {
    closed: 'lock',
    water_depth: 'droplets',
    ventilation: 'wind',
    blocked: 'octagon-alert',
  };
  return iconMap[type];
}

/**
 * 根据严重程度获取显示颜色
 * @param severity 严重程度
 * @returns 对应的颜色值
 */
export function getSeverityColor(severity: 'warning' | 'danger'): string {
  return severity === 'danger' ? '#e74c3c' : '#ff6b35';
}
