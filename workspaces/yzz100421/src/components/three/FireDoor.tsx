import { useMemo, useState, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface FireDoorProps {
  position: [number, number, number?];
  width: number;
  /** 净空区半径（米），默认使用 1.4m */
  clearanceRadius?: number;
  selected?: boolean;
  isBlocked?: boolean;
  onClick?: () => void;
}

/**
 * 消防门组件
 * 门框红色 #DC2626，中间透明玻璃
 * 周围 1.4m 净空区红色虚线圆圈；isBlocked 为 true 时圆圈变实线并闪烁红光
 */
export default function FireDoor({
  position,
  width,
  clearanceRadius = 1.4,
  selected = false,
  isBlocked = false,
  onClick,
}: FireDoorProps) {
  const [hover, setHover] = useState(false);
  const [x, z, y = 0] = position;

  const height = 2.4;
  const frameThickness = 0.14;

  const blockedRingRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!blockedRingRef.current) return;
    const mat = blockedRingRef.current.material as THREE.MeshBasicMaterial;
    const t = state.clock.getElapsedTime();
    const pulse = 0.35 + 0.3 * Math.sin(t * 4);
    mat.opacity = 0.25 + pulse * 0.5;
  });

  // 净空圈 geometry（用两个 RingGeometry 模拟虚线 / 实线）
  const dashedRingGeom = useMemo(() => {
    const inner = clearanceRadius - 0.02;
    const outer = clearanceRadius + 0.02;
    // 使用多个小扇形拼成虚线圆
    const segments = 72;
    const indices: number[] = [];
    const positions: number[] = [];
    const dashEvery = 3; // 每3段画1段
    for (let i = 0; i < segments; i++) {
      if (i % dashEvery !== 0) continue;
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const baseIdx = positions.length / 3;
      // 4 个点形成两个三角形
      const p00 = [Math.cos(a0) * inner, 0, Math.sin(a0) * inner];
      const p10 = [Math.cos(a0) * outer, 0, Math.sin(a0) * outer];
      const p01 = [Math.cos(a1) * inner, 0, Math.sin(a1) * inner];
      const p11 = [Math.cos(a1) * outer, 0, Math.sin(a1) * outer];
      positions.push(...p00, ...p10, ...p01, ...p11);
      indices.push(
        baseIdx,
        baseIdx + 1,
        baseIdx + 2,
        baseIdx + 1,
        baseIdx + 3,
        baseIdx + 2,
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [clearanceRadius]);

  const solidRingGeom = useMemo(() => {
    return new THREE.RingGeometry(
      clearanceRadius - 0.04,
      clearanceRadius + 0.04,
      96,
    );
  }, [clearanceRadius]);

  const borderColor = selected
    ? '#FACC15'
    : hover
      ? '#F59E0B'
      : '#DC2626';

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <group position={[x, y, z]}>
      {/* 净空区圆圈 */}
      {isBlocked ? (
        <mesh
          ref={blockedRingRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, 0]}
        >
          <primitive attach="geometry" object={solidRingGeom} />
          <meshBasicMaterial
            color="#DC2626"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ) : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, 0]}
        >
          <primitive attach="geometry" object={dashedRingGeom} />
          <meshBasicMaterial
            color="#DC2626"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 净空区内圈淡红色 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[clearanceRadius, 64]} />
        <meshBasicMaterial
          color="#DC2626"
          transparent
          opacity={isBlocked ? 0.18 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 门框左侧 */}
      <mesh
        position={[-width / 2 + frameThickness / 2, height / 2, 0]}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={handleClick}
      >
        <boxGeometry args={[frameThickness, height, 0.16]} />
        <meshStandardMaterial
          color="#DC2626"
          metalness={0.7}
          roughness={0.35}
          emissive="#7F1D1D"
          emissiveIntensity={isBlocked ? 0.35 : 0.12}
        />
      </mesh>

      {/* 门框右侧 */}
      <mesh
        position={[width / 2 - frameThickness / 2, height / 2, 0]}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={handleClick}
      >
        <boxGeometry args={[frameThickness, height, 0.16]} />
        <meshStandardMaterial
          color="#DC2626"
          metalness={0.7}
          roughness={0.35}
          emissive="#7F1D1D"
          emissiveIntensity={isBlocked ? 0.35 : 0.12}
        />
      </mesh>

      {/* 门框顶部 */}
      <mesh
        position={[0, height - frameThickness / 2, 0]}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={handleClick}
      >
        <boxGeometry args={[width, frameThickness, 0.16]} />
        <meshStandardMaterial
          color="#DC2626"
          metalness={0.7}
          roughness={0.35}
          emissive="#7F1D1D"
          emissiveIntensity={isBlocked ? 0.35 : 0.12}
        />
      </mesh>

      {/* 透明玻璃门扇 */}
      <mesh
        position={[0, (height - frameThickness) / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={handleClick}
      >
        <boxGeometry
          args={[
            width - frameThickness * 2,
            height - frameThickness * 2,
            0.03,
          ]}
        />
        <meshPhysicalMaterial
          color="#BAE6FD"
          transparent
          opacity={0.22}
          roughness={0.05}
          metalness={0.1}
          transmission={0.6}
          thickness={0.2}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 顶部警示灯 */}
      <mesh position={[0, height + 0.18, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.16]} />
        <meshStandardMaterial
          color={isBlocked ? '#EF4444' : '#22C55E'}
          emissive={isBlocked ? '#DC2626' : '#16A34A'}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* 选中 / 悬停高亮外框 */}
      {(selected || hover) && (
        <lineSegments position={[0, height / 2, 0]}>
          <edgesGeometry
            attach="geometry"
            args={[
              new THREE.BoxGeometry(
                width + 0.2,
                height + 0.3,
                0.4,
              ),
            ]}
          />
          <lineBasicMaterial color={borderColor} toneMapped={false} />
        </lineSegments>
      )}

      {/* 标签 */}
      <Html
        position={[0, height + 0.6, 0]}
        center
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: isBlocked
              ? 'rgba(185, 28, 28, 0.95)'
              : 'rgba(127, 29, 29, 0.9)',
            color: '#FEE2E2',
            border: selected
              ? '1px solid #FACC15'
              : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          {isBlocked ? '消防门 · 已阻挡' : '消防门 · 净空'}
        </div>
      </Html>
    </group>
  );
}
