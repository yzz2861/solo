/**
 * 布局 / AGV 参数验证
 *
 * 所有验证函数返回 Record<string, string>：
 *   - 键为字段名（或字段路径），值为中文错误信息
 *   - 若对象无任何键表示校验通过
 *
 * 使用方式：if (Object.keys(errors).length === 0) 即通过验证
 */
import type { AgvParams, CorridorParams } from '../types'

/**
 * AGV 本体参数验证。
 */
export function validateAgvParams(p: AgvParams): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!Number.isFinite(p.lengthMeters) || p.lengthMeters < 0.5 || p.lengthMeters > 5) {
    errors.lengthMeters = '车体长度必须在 0.5 ~ 5 米之间'
  }

  if (!Number.isFinite(p.widthMeters) || p.widthMeters < 0.3 || p.widthMeters > 3) {
    errors.widthMeters = '车体宽度必须在 0.3 ~ 3 米之间'
  }

  if (!Number.isFinite(p.turningRadius) || p.turningRadius < 0) {
    errors.turningRadius = '转弯半径不能为负'
  } else if (
    p.turningRadius < Math.max(p.lengthMeters, p.widthMeters) / 2
  ) {
    errors.turningRadius = '转弯半径过小，至少为车体长/宽的一半'
  }

  if (!Number.isFinite(p.chargeMinutes) || p.chargeMinutes < 5 || p.chargeMinutes > 180) {
    errors.chargeMinutes = '充电时间必须在 5 ~ 180 分钟之间'
  }

  if (!Number.isFinite(p.lowBatteryThreshold)
    || p.lowBatteryThreshold < 0
    || p.lowBatteryThreshold >= 100) {
    errors.lowBatteryThreshold = '低电量阈值范围应为 [0, 100)'
  }

  if (!Number.isFinite(p.peakCount) || p.peakCount < 0 || !Number.isInteger(p.peakCount)) {
    errors.peakCount = '高峰车辆数必须为非负整数'
  }
  if (!Number.isFinite(p.offPeakCount) || p.offPeakCount < 0 || !Number.isInteger(p.offPeakCount)) {
    errors.offPeakCount = '平峰车辆数必须为非负整数'
  }
  if (p.peakCount < p.offPeakCount) {
    errors.peakCount = '高峰车辆数不应小于平峰车辆数'
  }

  return errors
}

/**
 * 通道与布局约束参数验证。
 */
export function validateCorridorParams(p: CorridorParams): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!Number.isFinite(p.mainCorridorWidth) || p.mainCorridorWidth < 1.5) {
    errors.mainCorridorWidth = '主通道宽度至少为 1.5 米'
  } else if (p.mainCorridorWidth < 2 * p.forkliftWidth) {
    errors.mainCorridorWidth = '主通道宽度至少应为叉车宽度的 2 倍（双向通行）'
  }

  if (!Number.isFinite(p.forkliftWidth) || p.forkliftWidth < 1.2) {
    errors.forkliftWidth = '叉车作业通道宽度至少为 1.2 米'
  }

  if (!Number.isFinite(p.fireClearance) || p.fireClearance < 1.4) {
    errors.fireClearance = '消防净空距离至少为 1.4 米'
  }

  return errors
}
