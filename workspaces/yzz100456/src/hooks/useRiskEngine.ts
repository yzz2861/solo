import { useMemo } from 'react';
import type { CraneSpec, CargoSpec, Zone, RiskItem, LiftOperation } from '@/types';
import { toTon } from '@/utils/unitConvert';
import { bilinearInterpolateCapacity } from '@/utils/interpolation';
import { arcPolygonIntersection, angleToDirection, vec2Dist, clamp } from '@/utils/geometry';

const RISK_LEVEL_ORDER: Record<RiskItem['level'], number> = {
  danger: 0,
  warning: 1,
  info: 2,
  notice: 3,
};

export interface OperationRisk {
  operationId: string;
  liftNo: string;
  risks: RiskItem[];
  maxSafeRadius: number;
  currentRadius: number;
  minClearance: number;
}

export const useRiskEngine = (
  crane: CraneSpec,
  cargo: CargoSpec,
  zones: Zone[],
  operations: LiftOperation[],
  windSpeed: number
) => {
  const cargoTon = useMemo(() => toTon(cargo.weight, cargo.weightUnit), [cargo.weight, cargo.weightUnit]);

  const operationRisks = useMemo((): OperationRisk[] => {
    return operations.map((op) => {
      const risks: RiskItem[] = [];
      const baseX = crane.basePosition[0];
      const baseY = crane.basePosition[2];

      const liftRadius = vec2Dist([baseX, baseY], [op.liftPoint[0], op.liftPoint[2]]);
      const dropRadius = vec2Dist([baseX, baseY], [op.dropPoint[0], op.dropPoint[2]]);
      const currentRadius = Math.max(liftRadius, dropRadius);

      const capAtLift = bilinearInterpolateCapacity(crane.radiusTable, op.armLength, liftRadius);
      const capAtDrop = bilinearInterpolateCapacity(crane.radiusTable, op.armLength, dropRadius);
      const maxSafeRadius = computeMaxSafeRadius(crane, op.armLength, cargoTon);

      let minClearance = Infinity;
      let start = op.startAngle, end = op.endAngle;
      while (end < start) end += 360;

      for (let a = start; a <= end; a += op.stepAngle || 2) {
        const dir = angleToDirection(a, maxSafeRadius);
        const pt = [baseX + dir[0], baseY + dir[1]];
        for (const z of zones) {
          const d = checkArcZoneDistance(baseX, baseY, a, a, maxSafeRadius, z);
          if (d !== null && d < minClearance) minClearance = d;
        }
        if (capAtLift !== null && cargoTon > capAtLift * 0.98) {
          // handled below
        }
      }

      if (op.armLength > crane.maxArmLength + 0.01) {
        risks.push({
          id: `${op.id}-arm-len`,
          level: 'danger',
          category: 'radius',
          title: `吊次${op.liftNo}：臂长超出吊车最大值`,
          description: `当前臂长 ${op.armLength.toFixed(1)}m > 吊车最大臂长 ${crane.maxArmLength.toFixed(1)}m，请缩短臂长或换更大吊车。`,
          affectedAngle: [op.startAngle, op.endAngle],
        });
      }

      if (capAtLift === null || (capAtLift !== null && cargoTon > capAtLift)) {
        risks.push({
          id: `${op.id}-cap-lift`,
          level: 'danger',
          category: 'capacity',
          title: `吊次${op.liftNo}：起吊点超载`,
          description: `起吊半径 ${liftRadius.toFixed(1)}m 处额定载荷 ${capAtLift?.toFixed(1) ?? '超限'}t，货物重 ${cargoTon.toFixed(1)}t。${capAtLift !== null ? `超出 ${(cargoTon - capAtLift).toFixed(2)}t（${((cargoTon / capAtLift - 1) * 100).toFixed(0)}%）` : '已超过该臂长作业范围'}。`,
          affectedAngle: [op.startAngle, op.endAngle],
        });
      } else if (capAtLift !== null && cargoTon > capAtLift * 0.9) {
        risks.push({
          id: `${op.id}-cap-lift-warn`,
          level: 'warning',
          category: 'capacity',
          title: `吊次${op.liftNo}：起吊点载荷接近上限`,
          description: `载荷率 ${((cargoTon / capAtLift) * 100).toFixed(0)}%，建议增加配重或减小半径。`,
        });
      }

      if (capAtDrop === null || (capAtDrop !== null && cargoTon > capAtDrop)) {
        risks.push({
          id: `${op.id}-cap-drop`,
          level: 'danger',
          category: 'capacity',
          title: `吊次${op.liftNo}：落吊点超载`,
          description: `落吊半径 ${dropRadius.toFixed(1)}m 处额定载荷 ${capAtDrop?.toFixed(1) ?? '超限'}t，货物重 ${cargoTon.toFixed(1)}t。`,
          affectedAngle: [op.startAngle, op.endAngle],
        });
      }

      for (const z of zones) {
        const result = arcPolygonIntersection(
          [baseX, baseY],
          maxSafeRadius,
          op.startAngle,
          op.endAngle,
          z.polygon
        );
        if (!result.intersects) continue;
        if (z.type === 'walkway') {
          risks.push({
            id: `${op.id}-walk-${z.id}`,
            level: 'warning',
            category: 'walkway',
            title: `吊次${op.liftNo}：回转覆盖人员通道`,
            description: `区域「${z.name}」在回转扇区内。需安排专人监护通道口，作业期间禁止通行，或调整回转角/半径。`,
            affectedAngle: [op.startAngle, op.endAngle],
          });
        } else if (z.type === 'forbidden') {
          risks.push({
            id: `${op.id}-forbid-${z.id}`,
            level: 'danger',
            category: 'collision',
            title: `吊次${op.liftNo}：回转侵入禁入区「${z.name}」`,
            description: `禁入区高度 ${z.height}m，半径扇区与其相交，净距不足 ${result.minDist.toFixed(1)}m，必须调整。`,
            affectedAngle: [op.startAngle, op.endAngle],
          });
        } else if (z.type === 'obstacle') {
          risks.push({
            id: `${op.id}-obs-${z.id}`,
            level: 'danger',
            category: 'collision',
            title: `吊次${op.liftNo}：与障碍物「${z.name}」存在碰撞风险`,
            description: `最近距离 ${result.minDist.toFixed(2)}m，障碍物高度 ${z.height}m，需抬高吊物或绕行。`,
            affectedAngle: [op.startAngle, op.endAngle],
          });
        } else if (z.type === 'ship_edge') {
          if (result.minDist < 1.5) {
            risks.push({
              id: `${op.id}-ship-${z.id}`,
              level: 'warning',
              category: 'collision',
              title: `吊次${op.liftNo}：靠近船舷「${z.name}」`,
              description: `与船舷最近距离 ${result.minDist.toFixed(1)}m，注意吊钩摆动与船舱构件干涉。`,
              affectedAngle: [op.startAngle, op.endAngle],
            });
          }
        } else if (z.type === 'warehouse_door') {
          if (result.minDist < 1) {
            risks.push({
              id: `${op.id}-wh-${z.id}`,
              level: 'warning',
              category: 'collision',
              title: `吊次${op.liftNo}：落吊点靠近仓库门框`,
              description: `与门柱距离 ${result.minDist.toFixed(1)}m，库门高 ${z.height}m，核对货物+吊具总高度。`,
            });
          }
        }
      }

      if (windSpeed > 10.8) {
        risks.push({
          id: `${op.id}-wind`,
          level: 'warning',
          category: 'special',
          title: `吊次${op.liftNo}：风速超限（${windSpeed.toFixed(1)}m/s）`,
          description: `当前风速 ${windSpeed.toFixed(1)}m/s（6级），大件迎风面积大需降低作业速度，超过12m/s建议停工。`,
        });
      } else if (windSpeed > 8) {
        risks.push({
          id: `${op.id}-wind-note`,
          level: 'info',
          category: 'special',
          title: `吊次${op.liftNo}：注意风载（${windSpeed.toFixed(1)}m/s）`,
          description: `阵风偏多，需设揽风绳并提前试吊验证。`,
        });
      }

      return {
        operationId: op.id,
        liftNo: op.liftNo,
        risks,
        maxSafeRadius,
        currentRadius,
        minClearance: Number.isFinite(minClearance) ? minClearance : 0,
      };
    });
  }, [crane, cargoTon, zones, operations, windSpeed]);

  const specialRisks = useMemo((): RiskItem[] => {
    const list: RiskItem[] = [];
    if (!cargo.height || cargo.height <= 0) {
      list.push({
        id: 'sp-height',
        level: 'notice',
        category: 'special',
        title: '货物高度缺失',
        description: '未输入货物高度（含吊具）。已默认按3m估算净距，请补充准确值后重新核算：货物本体高 + 吊具/吊索高 + 底部垫木。',
      });
    }
    const hasEccentric = Math.abs(cargo.liftPointOffsetX) > 0.001 || Math.abs(cargo.liftPointOffsetY) > 0.001;
    if (hasEccentric) {
      list.push({
        id: 'sp-ecc',
        level: 'warning',
        category: 'special',
        title: `吊点偏心：X=${cargo.liftPointOffsetX.toFixed(2)}m，Y=${cargo.liftPointOffsetY.toFixed(2)}m`,
        description: '吊点未在货物几何中心。起吊瞬间会产生水平摆动，实际所需净距需再增加 1.5~2 倍偏心量；请确认支腿反力未超设计值。',
      });
    }
    if (cargo.weightUnit === 'kg') {
      list.push({
        id: 'sp-unit',
        level: 'notice',
        category: 'special',
        title: `重量单位：公斤（已按 ${toTon(cargo.weight, 'kg').toFixed(3)} 吨验算）`,
        description: `输入值 ${cargo.weight} kg = ${toTon(cargo.weight, 'kg').toFixed(3)} t。若实际单位应为吨，请切换单位避免误算。`,
      });
    }
    const height = cargo.height || 3;
    if (height >= 4) {
      list.push({
        id: 'sp-tall',
        level: 'info',
        category: 'special',
        title: `超高货物：总高 ≈ ${height.toFixed(1)}m`,
        description: `含吊具总高度较大，回转通过船舷/仓库门/高压线时需核对垂直净距。高压线下方最小安全距离 ≥6m。`,
      });
    }
    return list;
  }, [cargo]);

  const allRisks = useMemo((): RiskItem[] => {
    const merged = [...specialRisks];
    for (const or of operationRisks) merged.push(...or.risks);
    return merged.sort((a, b) => RISK_LEVEL_ORDER[a.level] - RISK_LEVEL_ORDER[b.level]);
  }, [specialRisks, operationRisks]);

  const summary = useMemo(() => {
    const count = { danger: 0, warning: 0, info: 0, notice: 0 } as Record<RiskItem['level'], number>;
    for (const r of allRisks) count[r.level]++;
    return count;
  }, [allRisks]);

  const firstOpSafeRadius = operationRisks[0]?.maxSafeRadius ?? 0;

  return {
    cargoTon,
    allRisks,
    operationRisks,
    specialRisks,
    summary,
    firstOpSafeRadius,
  };
};

function computeMaxSafeRadius(crane: CraneSpec, armLength: number, capacityTon: number): number {
  const arms = Array.from(new Set(crane.radiusTable.map(e => e.armLength))).sort((a, b) => a - b);
  if (arms.length === 0) return 0;
  const al = clamp(armLength, arms[0], arms[arms.length - 1]);

  let closestArm0 = arms[0], closestArm1 = arms[arms.length - 1];
  for (let i = 0; i < arms.length - 1; i++) {
    if (al >= arms[i] && al <= arms[i + 1]) {
      closestArm0 = arms[i];
      closestArm1 = arms[i + 1];
      break;
    }
  }

  const maxAt = (arm: number): number => {
    const entries = crane.radiusTable
      .filter(e => Math.abs(e.armLength - arm) < 0.001)
      .sort((a, b) => a.radius - b.radius);
    let r = 0;
    for (const e of entries) {
      if (e.capacity >= capacityTon) r = Math.max(r, e.radius);
    }
    return r;
  };

  const r0 = maxAt(closestArm0);
  const r1 = maxAt(closestArm1);
  if (closestArm0 === closestArm1) return r0;
  const t = (al - closestArm0) / (closestArm1 - closestArm0);
  return r0 + t * (r1 - r0);
}

function checkArcZoneDistance(
  cx: number, cy: number,
  startA: number, endA: number,
  radius: number,
  zone: Zone
): number | null {
  let minD = Infinity;
  let s = startA, e = endA;
  while (e < s) e += 360;
  for (let a = s; a <= e; a += 5) {
    const dir = angleToDirection(a, radius);
    const pt: [number, number] = [cx + dir[0], cy + dir[1]];
    const poly = zone.polygon;
    for (let i = 0; i < poly.length; i++) {
      const b = poly[i];
      const c = poly[(i + 1) % poly.length];
      const abx = c[0] - b[0], aby = c[1] - b[1];
      const apx = pt[0] - b[0], apy = pt[1] - b[1];
      const len2 = abx * abx + aby * aby || 1;
      let t = (apx * abx + apy * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = pt[0] - (b[0] + abx * t);
      const dy = pt[1] - (b[1] + aby * t);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) minD = d;
    }
  }
  return Number.isFinite(minD) ? minD : null;
}
