import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface AgvPathLineProps {
  /** 关键点数组，每个元素是 { x, z } */
  points: { x: number; z: number }[];
  /** 线条宽度（Tube 半径） */
  width?: number;
  /** 基础抬升高度，避免与地面 z-fighting */
  y?: number;
}

/**
 * AGV 路径组件
 * 蓝色发光线条 + 流动纹理动画，使用 TubeGeometry 构建平滑路径
 */
export default function AgvPathLine({
  points,
  width = 0.12,
  y = 0.05,
}: AgvPathLineProps) {
  const flowRef = useRef<THREE.MeshBasicMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);

  const { tubeGeom, pathLength } = useMemo(() => {
    if (!points || points.length < 2) {
      return { tubeGeom: null as unknown as THREE.TubeGeometry, pathLength: 0 };
    }
    const curvePts = points.map(
      (p) => new THREE.Vector3(p.x, y, p.z),
    );
    // 若只有 2 个点使用直线段，更多点使用平滑 CatmullRom
    const curve =
      curvePts.length === 2
        ? new THREE.LineCurve3(curvePts[0], curvePts[1])
        : new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.2);
    const length = curve.getLength();
    const tubularSegments = Math.max(40, Math.floor(length * 12));
    const geom = new THREE.TubeGeometry(
      curve as THREE.Curve<THREE.Vector3>,
      tubularSegments,
      width,
      12,
      false,
    );
    return { tubeGeom: geom, pathLength: length };
  }, [points, width, y]);

  // 流动纹理（使用 CanvasTexture，通过 offset.y 或 repeat 变化实现动画）
  const flowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 渐变斜箭头纹理
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, 'rgba(147,197,253,0)');
    grd.addColorStop(0.45, 'rgba(147,197,253,0)');
    grd.addColorStop(0.5, 'rgba(219,234,254,1)');
    grd.addColorStop(0.55, 'rgba(147,197,253,0)');
    grd.addColorStop(1, 'rgba(147,197,253,0)');
    ctx.fillStyle = grd;
    for (let i = 0; i < canvas.height; i += 32) {
      ctx.fillRect(0, i, canvas.width, 16);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, Math.max(4, Math.floor(pathLength / 1.2)));
    tex.anisotropy = 4;
    return tex;
  }, [pathLength]);

  useFrame((_, delta) => {
    if (flowRef.current) {
      flowRef.current.map = flowTexture;
      flowTexture.offset.y -= delta * 0.6;
      flowRef.current.needsUpdate = true;
    }
    if (glowRef.current) {
      const t = performance.now() * 0.002;
      const pulse = 0.45 + 0.15 * Math.sin(t * 1.8);
      glowRef.current.opacity = pulse;
    }
  });

  if (!tubeGeom) return null;

  return (
    <group>
      {/* 外层发光光晕 */}
      <mesh geometry={tubeGeom}>
        <meshBasicMaterial
          ref={glowRef}
          color="#60A5FA"
          transparent
          opacity={0.45}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
        />
        {/* 将 tube 放大为辉光层 */}
        <group scale={[1.8, 1.8, 1.8]} />
      </mesh>

      {/* 底层深色主管道 */}
      <mesh geometry={tubeGeom}>
        <meshBasicMaterial
          color="#1E3A8A"
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* 流动高光层（稍微放大以包裹主管道） */}
      <mesh
        geometry={tubeGeom}
        scale={[1.02, 1.02, 1.02]}
      >
        <meshBasicMaterial
          ref={flowRef}
          map={flowTexture}
          color="#DBEAFE"
          transparent
          opacity={0.85}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 关键点锚点标记 */}
      {points.map((p, i) => (
        <mesh key={`pt-${i}`} position={[p.x, y + 0.02, p.z]}>
          <cylinderGeometry args={[width * 1.4, width * 1.4, 0.04, 24]} />
          <meshBasicMaterial
            color="#3B82F6"
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
