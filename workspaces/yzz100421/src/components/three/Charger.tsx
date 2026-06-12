import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface ChargerProps {
  position: [number, number, number?];
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 充电桩组件
 * 尺寸 1.2x1.6x0.8，主体蓝色金属质感 #2563EB，顶部绿色指示灯，底座发光
 * 选中时外框高亮黄色，带文字标签"充电桩"
 */
export default function Charger({
  position,
  selected = false,
  onClick,
}: ChargerProps) {
  const [hover, setHover] = useState(false);

  const width = 1.2;
  const height = 1.6;
  const depth = 0.8;

  const [x, z, y = 0] = position;

  const highlightColor = selected
    ? '#FACC15'
    : hover
      ? '#F59E0B'
      : '#0F172A';
  const highlightOpacity = selected ? 0.95 : hover ? 0.6 : 0.0;

  const edges = useMemo(() => {
    const geom = new THREE.BoxGeometry(
      width + 0.18,
      height + 0.18,
      depth + 0.18,
    );
    const edgesGeom = new THREE.EdgesGeometry(geom);
    geom.dispose();
    return edgesGeom;
  }, [width, height, depth]);

  return (
    <group position={[x, y, z]}>
      {/* 底座发光环 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <ringGeometry args={[width * 0.55, width * 0.85, 48]} />
        <meshBasicMaterial color="#60A5FA" transparent opacity={0.35} />
      </mesh>

      {/* 底座底盘 */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 1.1, 0.16, depth * 1.1]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>

      {/* 主体：蓝色金属质感 */}
      <mesh
        position={[0, height / 2 + 0.16, 0]}
        castShadow
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
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#2563EB"
          metalness={0.75}
          roughness={0.3}
          emissive="#1D4ED8"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* 主体正面凹槽面板 */}
      <mesh
        position={[0, height / 2 + 0.16, depth / 2 + 0.001]}
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
        <boxGeometry args={[width * 0.78, height * 0.6, 0.01]} />
        <meshStandardMaterial
          color="#1E40AF"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>

      {/* 顶部绿色指示灯 */}
      <mesh position={[0, height + 0.32, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.14, 24]} />
        <meshStandardMaterial
          color="#22C55E"
          emissive="#16A34A"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, height + 0.4, 0]}
        color="#22C55E"
        intensity={0.6}
        distance={3}
        decay={2}
      />

      {/* 选中 / 悬停 黄色高亮外框 */}
      {(selected || hover) && (
        <>
          <mesh position={[0, height / 2 + 0.16, 0]}>
            <lineSegments
              attach="geometry"
              geometry={edges as unknown as THREE.BufferGeometry}
            />
            <lineBasicMaterial color={highlightColor} toneMapped={false} />
          </mesh>
          <mesh position={[0, height / 2 + 0.16, 0]}>
            <boxGeometry
              args={[width + 0.18, height + 0.18, depth + 0.18]}
            />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={highlightOpacity * 0.12}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* 名称标签 */}
      <Html
        position={[0, height + 0.9, 0]}
        center
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#F8FAFC',
            border: selected
              ? '1px solid #FACC15'
              : '1px solid #334155',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            letterSpacing: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
          }}
        >
          充电桩
        </div>
      </Html>
    </group>
  );
}
