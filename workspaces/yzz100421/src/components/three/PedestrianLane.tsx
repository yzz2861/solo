import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface PedestrianLaneProps {
  position: [number, number, number?];
  width: number;
  length: number;
  rotation?: number; // 绕 Y 轴旋转（弧度）
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 行人通道组件
 * 绿色半透明 #16A34A 铺面带条纹纹理，两端绿色柱标识
 */
export default function PedestrianLane({
  position,
  width,
  length,
  rotation = 0,
  selected = false,
  onClick,
}: PedestrianLaneProps) {
  const [hover, setHover] = useState(false);
  const [x, z, y = 0] = position;

  // 条纹纹理：使用 CanvasTexture 生成斜纹/横纹
  const stripeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    // 背景透明
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 白色条纹
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    const stripeH = 18;
    const gap = 22;
    for (let y = -canvas.height; y < canvas.height * 2; y += stripeH + gap) {
      ctx.fillRect(0, y, canvas.width, stripeH);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, Math.max(1, length / 2));
    tex.anisotropy = 4;
    return tex;
  }, [length]);

  const borderColor = selected
    ? '#FACC15'
    : hover
      ? '#F59E0B'
      : '#15803D';

  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]}>
      {/* 半透明绿色地面 */}
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
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color="#16A34A"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
          metalness={0.05}
          roughness={0.85}
        />
      </mesh>

      {/* 白色条纹叠加层 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <planeGeometry args={[width * 0.7, length]} />
        <meshBasicMaterial
          map={stripeTexture}
          transparent
          opacity={0.55}
          depthWrite={false}
          alphaTest={0.01}
          toneMapped={false}
        />
      </mesh>

      {/* 边框 */}
      <lineSegments position={[0, 0.03, 0]}>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.PlaneGeometry(width, length)]}
        />
        <lineBasicMaterial color={borderColor} toneMapped={false} />
      </lineSegments>

      {/* 两端绿色柱标识 */}
      {[-length / 2, length / 2].map((loc, idx) => (
        <group key={`pole-${idx}`} position={[0, 0, loc]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 16]} />
            <meshStandardMaterial
              color="#22C55E"
              emissive="#16A34A"
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.16, 20, 16]} />
            <meshStandardMaterial
              color="#4ADE80"
              emissive="#22C55E"
              emissiveIntensity={0.9}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, 1.3, 0]}
            color="#22C55E"
            intensity={0.4}
            distance={2.5}
          />
        </group>
      ))}

      {/* 标签 */}
      <Html
        position={[0, 1.8, 0]}
        center
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(21, 128, 61, 0.9)',
            color: '#F0FDF4',
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
          行人通道
        </div>
      </Html>
    </group>
  );
}
