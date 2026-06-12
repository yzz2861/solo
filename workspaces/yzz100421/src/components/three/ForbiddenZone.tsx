import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface ForbiddenZoneProps {
  position: [number, number, number?];
  width: number;
  depth: number;
  reason?: string;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 禁区组件
 * 红色半透明填充 #DC2626 (alpha=0.3)，红色边框，带 X 斜线纹理
 * 标签显示 reason
 */
export default function ForbiddenZone({
  position,
  width,
  depth,
  reason = '禁区',
  selected = false,
  onClick,
}: ForbiddenZoneProps) {
  const [hover, setHover] = useState(false);
  const [x, z, y = 0] = position;

  // X 斜线纹理
  const crossTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.95)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(depth / 2)));
    tex.anisotropy = 4;
    return tex;
  }, [width, depth]);

  const borderColor = selected
    ? '#FACC15'
    : hover
      ? '#F59E0B'
      : '#B91C1C';

  return (
    <group position={[x, y, z]}>
      {/* 半透明红色填充 */}
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
          color="#DC2626"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          metalness={0.05}
          roughness={0.85}
        />
      </mesh>

      {/* X 斜线纹理叠加 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial
          map={crossTexture}
          transparent
          opacity={0.6}
          depthWrite={false}
          alphaTest={0.01}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* 红色边框 */}
      <lineSegments position={[0, 0.03, 0]}>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.PlaneGeometry(width, depth)]}
        />
        <lineBasicMaterial color={borderColor} toneMapped={false} />
      </lineSegments>

      {/* 四角警示柱 */}
      {[
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
        [-width / 2, depth / 2],
        [width / 2, depth / 2],
      ].map(([cx, cz], i) => (
        <group key={`corner-${i}`} position={[cx, 0, cz]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.12, 0.8, 0.12]} />
            <meshStandardMaterial
              color="#DC2626"
              emissive="#7F1D1D"
              emissiveIntensity={0.3}
              metalness={0.6}
              roughness={0.45}
            />
          </mesh>
          <mesh position={[0, 0.88, 0]}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshStandardMaterial
              color="#F87171"
              emissive="#DC2626"
              emissiveIntensity={0.8}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* reason 标签 */}
      <Html
        position={[0, 1.2, 0]}
        center
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(185, 28, 28, 0.92)',
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
          禁区 · {reason}
        </div>
      </Html>
    </group>
  );
}
