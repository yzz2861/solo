import { useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

export interface WaitZoneProps {
  position: [number, number, number?];
  width: number;
  depth: number;
  capacity: number;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 等待区组件
 * 半透明黄色 #EAB308 地面 + 实线边框，每隔 1m 画车位分隔线，显示容量文字
 */
export default function WaitZone({
  position,
  width,
  depth,
  capacity,
  selected = false,
  onClick,
}: WaitZoneProps) {
  const [hover, setHover] = useState(false);
  const [x, z, y = 0] = position;

  // 假设车位沿 depth 方向排布，每个车位约占 1m；
  // 分隔线在 depth 方向按 1m 间距，横跨 width
  const separators = useMemo(() => {
    const lines: { startX: number; endX: number; z: number }[] = [];
    const steps = Math.floor(depth);
    for (let i = 1; i < steps; i++) {
      const loc = -depth / 2 + i;
      lines.push({ startX: -width / 2, endX: width / 2, z: loc });
    }
    return lines;
  }, [width, depth]);

  const borderColor = selected
    ? '#FACC15'
    : hover
      ? '#F59E0B'
      : '#CA8A04';

  return (
    <group position={[x, y, z]}>
      {/* 地面：半透明黄色 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#EAB308"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* 边框：实线 */}
      <lineSegments position={[0, 0.03, 0]}>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.PlaneGeometry(width, depth)]}
        />
        <lineBasicMaterial color={borderColor} linewidth={2} toneMapped={false} />
      </lineSegments>

      {/* 车位分隔线（每隔 1m） */}
      {separators.map((s, i) => (
        <Line
          key={`sep-${i}`}
          points={[
            [s.startX, 0.032, s.z],
            [s.endX, 0.032, s.z],
          ]}
          color="#A16207"
          transparent
          opacity={0.8}
          lineWidth={1}
        />
      ))}

      {/* 选中外框加厚效果 */}
      {(selected || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry
            args={[
              Math.min(width, depth) * 0.48,
              Math.min(width, depth) * 0.52,
              4,
            ]}
          />
          <meshBasicMaterial
            color={borderColor}
            transparent
            opacity={0.0}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 容量文字标签 */}
      <Html
        position={[0, 0.5, 0]}
        center
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(161, 98, 7, 0.9)',
            color: '#FEFCE8',
            border: selected
              ? '1px solid #FACC15'
              : '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          等待区 · 容量 {capacity}
        </div>
      </Html>
    </group>
  );
}
