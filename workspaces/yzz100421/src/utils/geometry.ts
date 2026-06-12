/**
 * 二维几何计算工具集
 *
 * 坐标约定：x-z 平面（y 轴朝上），长度单位：米。
 * 矩形用中心坐标 + 尺寸（沿 x/z 方向的半长为 w/2、d/2）。
 */

/** 二维点 */
export interface Point2D {
  x: number;
  z: number;
}

/** 轴对齐矩形（中心坐标 + 宽（x方向）+ 深（z方向）+ 可选旋转 */
export interface Rect2D {
  /** 中心点 x */
  x: number;
  /** 中心点 z */
  z: number;
  /** x 方向尺寸（宽） */
  width: number;
  /** z 方向尺寸（深） */
  depth: number;
  /** 绕中心旋转角度（度），可选 */
  rotation?: number;
}

/**
 * 计算两点间欧氏距离（x-z 平面）。 */
export function distance2D(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * 角度转弧度。 */
function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 判断点 (px, pz) 是否在给定中心 (rx, rz) 的矩形内。
 *
 * - 矩形在局部坐标系中的半宽为 rw/2，半深为 rd/2。
 * - 当 rotation !== 0 时，先将点做逆旋转到矩形局部坐标后再判断。
 *
 * @param px        点 x 坐标
 * @param pz        点 z 坐标
 * @param rx        矩形中心 x
 * @param rz        矩形中心 z
 * @param rw        矩形宽度（x 方向）
 * @param rd        矩形深度（z 方向）
 * @param rotation  矩形绕中心的旋转角度（度），默认 0
 */
export function pointInRect(
  px: number,
  pz: number,
  rx: number,
  rz: number,
  rw: number,
  rd: number,
  rotation = 0,
): boolean {
  // 1. 平移到以矩形中心为原点
  let tx = px - rx;
  let tz = pz - rz;

  // 2. 若有旋转，反向旋转点（即把点"还原"到矩形的轴对齐坐标系
  if (rotation !== 0) {
    const r = -deg2rad(rotation);
    const cosA = Math.cos(r);
    const sinA = Math.sin(r);
    const nx = tx * cosA - tz * sinA;
    const nz = tx * sinA + tz * cosA;
    tx = nx;
    tz = nz;
  }

  const halfW = rw / 2;
  const halfD = rd / 2;

  return tx >= -halfW && tx <= halfW && tz >= -halfD && tz <= halfD;
}

/**
 * 判断两个轴对齐矩形是否相交（含边界接触）。
 *
 * 仅在旋转矩形请先自行做包围盒近似或 OBB 相交。
 * 这里实现经典的分离轴判定，仅处理轴对齐场景。
 */
export function rectIntersect(r1: Rect2D, r2: Rect2D): boolean {
  const r1MinX = r1.x - r1.width / 2;
  const r1MaxX = r1.x + r1.width / 2;
  const r1MinZ = r1.z - r1.depth / 2;
  const r1MaxZ = r1.z + r1.depth / 2;

  const r2MinX = r2.x - r2.width / 2;
  const r2MaxX = r2.x + r2.width / 2;
  const r2MinZ = r2.z - r2.depth / 2;
  const r2MaxZ = r2.z + r2.depth / 2;

  return !(
    r1MaxX >= r2MinX &&
    r1MinX <= r2MaxX &&
    r1MaxZ >= r2MinZ &&
    r1MinZ <= r2MaxZ
  );
}

/**
 * 将矩形在各方向向外扩展 padding（单位与矩形单位一致）。
 *
 * padding 可为负值表示向内收缩。
 * 返回一个新的矩形对象（旋转属性会被保留）。
 */
export function expandRect(rect: Rect2D, padding: number): Rect2D {
  return {
    x: rect.x,
    z: rect.z,
    width: Math.max(0, rect.width + padding * 2),
    depth: Math.max(0, rect.depth + padding * 2),
    rotation: rect.rotation,
  };
}

/**
 * 将数值 v 限制在 [min, max] 闭区间内。 */
export function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
