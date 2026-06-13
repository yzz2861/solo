import type { Sign, FloorPlan, ComplianceWarning, Vec3 } from '@/types';
import { corridorMainDirection } from '@/data/floorData';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function dist2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function angleDiffRad(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

function pointToSegmentDist(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apz = p.z - a.z;
  const len2 = abx * abx + abz * abz;
  let t = len2 === 0 ? 0 : (apx * abx + apz * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cz = a.z + t * abz;
  return Math.sqrt((p.x - cx) ** 2 + (p.z - cz) ** 2);
}

function checkHeight(sign: Sign): ComplianceWarning | null {
  const bottom = sign.position.y;
  const top = sign.position.y + sign.height;
  if (sign.type === 'room_door') {
    if (bottom < 1.2) {
      return {
        id: uid('w'), signId: sign.id, level: 'error', category: 'height',
        message: `门牌底部高度 ${bottom.toFixed(2)}m 低于建议 1.2m`,
        suggestion: '将门牌抬高至 1.4m ~ 1.6m 之间，便于站立阅读',
        value: bottom, threshold: 1.2,
      };
    }
  } else if (sign.type === 'floor_standing') {
    if (bottom < 0.1) {
      return {
        id: uid('w'), signId: sign.id, level: 'info', category: 'height',
        message: `立式牌请确认底部已接触地面 (当前 ${bottom.toFixed(2)}m)`,
        suggestion: '将立式牌放置于地面，并使用膨胀螺栓固定',
        value: bottom, threshold: 0.1,
      };
    }
    if (bottom < 1.4) {
      return {
        id: uid('w'), signId: sign.id, level: 'warning', category: 'height',
        message: `立式牌文字区底部 ${bottom.toFixed(2)}m 低于建议 1.4m`,
        suggestion: '抬升文字区或增加底座高度，避免被人群遮挡',
        value: bottom, threshold: 1.4,
      };
    }
  }
  if (sign.type === 'accessible' || sign.type === 'room_door') {
    if (top > 2.5) {
      return {
        id: uid('w'), signId: sign.id, level: 'warning', category: 'height',
        message: `标牌顶部 ${top.toFixed(2)}m 超出无障碍视线上限 2.5m`,
        suggestion: '降低安装高度，确保轮椅乘坐者可读',
        value: top, threshold: 2.5,
      };
    }
  }
  return null;
}

function checkOrientation(sign: Sign): ComplianceWarning | null {
  const corridorAngle = Math.atan2(corridorMainDirection.z, corridorMainDirection.x);
  const signNormalAngle = sign.rotationY;
  const diff = angleDiffRad(signNormalAngle, corridorAngle);
  const diffOpp = angleDiffRad(signNormalAngle, corridorAngle + Math.PI);
  const minDiff = Math.min(diff, diffOpp);
  const threshold = (30 * Math.PI) / 180;
  if (minDiff > threshold) {
    return {
      id: uid('w'), signId: sign.id, level: 'warning', category: 'orientation',
      message: `标牌朝向与走廊主方向夹角 ${(minDiff * 180 / Math.PI).toFixed(0)}° > 30°`,
      suggestion: '旋转标牌使文字面朝向主要人流方向',
      value: minDiff * 180 / Math.PI, threshold: 30,
    };
  }
  return null;
}

function checkFireHydrant(sign: Sign, fp: FloorPlan): ComplianceWarning | null {
  for (const fh of fp.fireHydrants) {
    const d = dist2D(sign.position, fh.position);
    if (d < 0.5) {
      return {
        id: uid('w'), signId: sign.id, level: 'error', category: 'fire_hydrant',
        message: `距消防栓 ${fh.id} 仅 ${d.toFixed(2)}m，小于 0.5m 安全距离`,
        suggestion: '标牌移位至消防栓 0.5m 以外，并避免遮挡其正面操作空间',
        value: d, threshold: 0.5,
      };
    }
    const dx = sign.position.x - fh.position.x;
    const dz = sign.position.z - fh.position.z;
    const frontX = -Math.sin(fh.facing);
    const frontZ = Math.cos(fh.facing);
    const dot = dx * frontX + dz * frontZ;
    const signBottom = sign.position.y;
    const signTop = sign.position.y + sign.height;
    const fhTop = fh.size.h;
    if (dot > 0 && dot < 1.0 && Math.abs(dx * frontZ - dz * frontX) < fh.size.w / 2 + sign.width / 2) {
      if (!(signTop < 0.2 || signBottom > fhTop + 0.3)) {
        return {
          id: uid('w'), signId: sign.id, level: 'error', category: 'fire_hydrant',
          message: `标牌可能遮挡消防栓 ${fh.id} 正面操作面`,
          suggestion: '避开消防栓正面 1m 范围内安装',
        };
      }
    }
  }
  return null;
}

function buildCorridorObserverPoints(fp: FloorPlan): Vec3[] {
  const { w } = fp.size;
  const points: Vec3[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    points.push({ x: 1 + t * (w - 2), y: 1.6, z: 12 });
  }
  points.push({ x: 14, y: 1.6, z: 2 });
  points.push({ x: 26, y: 1.6, z: 2 });
  points.push({ x: 20, y: 1.6, z: 22 });
  return points;
}

function lineIntersectsBox(
  origin: Vec3, dir: Vec3,
  boxMin: Vec3, boxMax: Vec3,
  maxDist: number
): { hit: boolean; dist: number } {
  let tmin = -Infinity;
  let tmax = Infinity;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const mn = [boxMin.x, boxMin.y, boxMin.z];
  const mx = [boxMax.x, boxMax.y, boxMax.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < mn[i] || o[i] > mx[i]) return { hit: false, dist: Infinity };
    } else {
      const inv = 1 / d[i];
      let t1 = (mn[i] - o[i]) * inv;
      let t2 = (mx[i] - o[i]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmax < 0 || tmin > tmax) return { hit: false, dist: Infinity };
    }
  }
  const t = tmin > 0 ? tmin : tmax;
  if (t < 0 || t > maxDist) return { hit: false, dist: Infinity };
  return { hit: true, dist: t };
}

function signBox(sign: Sign): { min: Vec3; max: Vec3 } {
  const hw = sign.width / 2;
  return {
    min: { x: sign.position.x - hw, y: sign.position.y, z: sign.position.z - 0.05 },
    max: { x: sign.position.x + hw, y: sign.position.y + sign.height, z: sign.position.z + 0.05 },
  };
}

function obstacleBoxes(fp: FloorPlan): { min: Vec3; max: Vec3; id: string }[] {
  const result: { min: Vec3; max: Vec3; id: string }[] = [];
  for (const c of fp.columns) {
    result.push({
      id: c.id,
      min: { x: c.position.x - c.size.w / 2, y: 0, z: c.position.z - c.size.d / 2 },
      max: { x: c.position.x + c.size.w / 2, y: c.size.h, z: c.position.z + c.size.d / 2 },
    });
  }
  for (const w of fp.walls) {
    const dx = w.end.x - w.start.x;
    const dz = w.end.z - w.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.max(1, Math.ceil(len / 0.5));
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const sx = w.start.x + dx * t1;
      const sz = w.start.z + dz * t1;
      const ex = w.start.x + dx * t2;
      const ez = w.end.z + (w.end.z - w.start.z) * t2;
      const mx = (sx + ex) / 2;
      const mz = (sz + ez) / 2;
      const segLen = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
      result.push({
        id: w.id,
        min: { x: mx - segLen / 2 - w.thickness / 2, y: 0, z: mz - w.thickness / 2 },
        max: { x: mx + segLen / 2 + w.thickness / 2, y: w.height, z: mz + w.thickness / 2 },
      });
    }
  }
  return result;
}

function checkOcclusionAndCorner(sign: Sign, fp: FloorPlan): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];
  const observers = buildCorridorObserverPoints(fp);
  const obstacles = obstacleBoxes(fp);
  const sbox = signBox(sign);
  const sCenter = {
    x: (sbox.min.x + sbox.max.x) / 2,
    y: (sbox.min.y + sbox.max.y) / 2,
    z: (sbox.min.z + sbox.max.z) / 2,
  };
  let hits = 0;
  let minDist = Infinity;
  let occludedBy: string | null = null;
  for (const obs of observers) {
    const dx = sCenter.x - obs.x;
    const dy = sCenter.y - obs.y;
    const dz = sCenter.z - obs.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < minDist) minDist = dist;
    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const signHit = lineIntersectsBox(obs, dir, sbox.min, sbox.max, dist + 2);
    if (!signHit.hit) continue;
    let blocked = false;
    for (const ob of obstacles) {
      const r = lineIntersectsBox(obs, dir, ob.min, ob.max, dist);
      if (r.hit && r.dist < signHit.dist - 0.05) {
        blocked = true;
        occludedBy = ob.id;
        break;
      }
    }
    if (!blocked) hits++;
  }
  const total = observers.length;
  const ratio = hits / total;
  if (ratio < 0.6) {
    warnings.push({
      id: uid('w'), signId: sign.id, level: 'error', category: 'occlusion',
      message: `标牌可见率仅 ${(ratio * 100).toFixed(0)}%，低于 60% 阈值${occludedBy ? `（被 ${occludedBy} 遮挡）` : ''}`,
      suggestion: '移动标牌位置或提升高度，避开柱子/墙体遮挡',
      value: ratio * 100, threshold: 60,
    });
  } else if (ratio < 0.8) {
    warnings.push({
      id: uid('w'), signId: sign.id, level: 'warning', category: 'occlusion',
      message: `标牌可见率 ${(ratio * 100).toFixed(0)}%，建议优化`,
      suggestion: '微调标牌位置或朝向以提升可见性',
      value: ratio * 100, threshold: 80,
    });
  }
  if (minDist < 8) {
    warnings.push({
      id: uid('w'), signId: sign.id, level: 'warning', category: 'corner_view',
      message: `最近观察点视距仅 ${minDist.toFixed(2)}m，小于建议 8m`,
      suggestion: '转角处建议提前 8m 放置预告标牌',
      value: minDist, threshold: 8,
    });
  }
  return warnings;
}

function checkAccessiblePath(sign: Sign, fp: FloorPlan): ComplianceWarning | null {
  for (const path of fp.accessiblePaths) {
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i];
      const b = path.points[i + 1];
      const d = pointToSegmentDist(sign.position, a, b);
      if (d < path.width / 2 + sign.width / 2 + 0.1) {
        return {
          id: uid('w'), signId: sign.id, level: 'error', category: 'accessible_path',
          message: `标牌侵入无障碍通道 (距通道中心 ${d.toFixed(2)}m)`,
          suggestion: '移出无障碍通道 0.9m 宽度范围之外',
          value: d, threshold: path.width / 2,
        };
      }
    }
  }
  if (sign.type === 'accessible') {
    const bottom = sign.position.y;
    const top = sign.position.y + sign.height;
    if (bottom < 0.9) {
      return {
        id: uid('w'), signId: sign.id, level: 'error', category: 'accessible_path',
        message: `无障碍标识底部 ${bottom.toFixed(2)}m < 0.9m 建议下限`,
        suggestion: '无障碍标识底部建议 ≥ 0.9m，顶部 ≤ 2.5m',
        value: bottom, threshold: 0.9,
      };
    }
    if (top > 2.5) {
      return {
        id: uid('w'), signId: sign.id, level: 'warning', category: 'accessible_path',
        message: `无障碍标识顶部 ${top.toFixed(2)}m > 2.5m 建议上限`,
        suggestion: '降低安装高度，确保轮椅乘坐者视线范围内',
        value: top, threshold: 2.5,
      };
    }
  }
  return null;
}

export function runComplianceCheck(signs: Sign[], fp: FloorPlan): ComplianceWarning[] {
  const warnings: ComplianceWarning[] = [];
  for (const sign of signs) {
    const w1 = checkHeight(sign);
    if (w1) warnings.push(w1);
    const w2 = checkOrientation(sign);
    if (w2) warnings.push(w2);
    const w3 = checkFireHydrant(sign, fp);
    if (w3) warnings.push(w3);
    const w4s = checkOcclusionAndCorner(sign, fp);
    warnings.push(...w4s);
    const w5 = checkAccessiblePath(sign, fp);
    if (w5) warnings.push(w5);
  }
  return warnings;
}
