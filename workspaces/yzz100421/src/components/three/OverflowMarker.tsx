import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OverflowSeverity } from '@/types';

export interface OverflowMarkerProps {
  position: [number, number, number?];
  severity: OverflowSeverity;
  message?: string;
}

/**
 * 溢出（溢出/拥堵/违规）警告标记
 * 红色闪烁光柱 + 感叹号；danger 更亮更大
 */
export default function OverflowMarker({
  position,
  severity,
  message,
}: OverflowMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactGroupRef = useRef<THREE.Group>(null);
  const exclaimRef = useRef<THREE.MeshStandardMaterial>(null);

  const isDanger = severity === 'danger';

  // 根据 severity 调整尺寸与亮度
  const height = isDanger ? 4.5 : 3.2;
  const radius = isDanger ? 0.32 : 0.22;
  const baseColor: THREE.ColorRepresentation = isDanger ? '#EF4444' : '#F97316';
  const glowColor: THREE.ColorRepresentation = isDanger ? '#B91C1C' : '#C2410C';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // 整体轻微漂浮
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 2) * 0.08;
    }
    // 光柱闪烁
    if (beamRef.current) {
      const pulse = 0.45 + 0.5 * Math.abs(Math.sin(t * (isDanger ? 4.8 : 3.2)));
      beamRef.current.opacity = pulse;
    }
    // 地面冲击圈扩散
    if (impactRef.current) {
      const phase = (t * 0.9) % 1;
      const scale = 0.3 + phase * 2.4;
      impactRef.current.opacity = (1 - phase) * (isDanger ? 0.7 : 0.55);
    }
    if (impactGroupRef.current) {
      const phase = (t * 0.9) % 1;
      const scale = 0.3 + phase * 2.4;
      impactGroupRef.current.scale.setScalar(scale);
    }
    // 感叹号呼吸
    if (exclaimRef.current) {
      exclaimRef.current.emissiveIntensity =
        0.8 + 0.6 * Math.sin(t * (isDanger ? 5 : 3.5));
    }
  });

  const [x, z, y = 0] = position;

  return (
    <group position={[x, y, z]}>
      <group ref={groupRef}>
        {/* 地面冲击环（扩散动画） */}
        <group ref={impactGroupRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.6, 0.8, 48]} />
            <meshBasicMaterial
              ref={impactRef}
              color={baseColor}
              transparent
              opacity={0.6}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* 实心底座圆盘 */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
        >
          <circleGeometry args={[radius * 2.2, 32]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>

        {/* 底部发光源 */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry
            args={[radius * 2.4, radius * 2.6, 0.1, 32]}
          />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={0.65}
            toneMapped={false}
          />
        </mesh>

        {/* 主体发光光柱（上小下大 cone 渐变色） */}
        <mesh position={[0, height / 2, 0]}>
          <coneGeometry args={[radius, height, 24, 1, true]} />
          <meshBasicMaterial
            ref={beamRef}
            color={baseColor}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 外层更大的柔光柱 */}
        <mesh position={[0, height / 2, 0]}>
          <coneGeometry args={[radius * 1.8, height, 24, 1, true]} />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={isDanger ? 0.22 : 0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 顶部感叹号球 */}
        <group position={[0, height + 0.15, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[radius * 1.4, 24, 20]} />
            <meshStandardMaterial
              ref={exclaimRef}
              color="#FEF2F2"
              emissive={baseColor}
              emissiveIntensity={1.2}
              metalness={0.3}
              roughness={0.4}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            color={baseColor}
            intensity={isDanger ? 1.6 : 1.0}
            distance={isDanger ? 4 : 3}
            decay={2}
          />
          {/* 感叹号（!）使用两个圆柱模拟 */}
          <mesh position={[0, 0.02, radius * 1.38]}>
            <cylinderGeometry args={[radius * 0.18, radius * 0.18, radius * 1.3, 10]} />
            <meshBasicMaterial
              color="#7F1D1D"
              transparent
              opacity={0.95}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, -radius * 0.95, radius * 1.38]}>
            <sphereGeometry args={[radius * 0.22, 12, 10]} />
            <meshBasicMaterial
              color="#7F1D1D"
              transparent
              opacity={0.95}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* 说明文字 */}
      {message && (
        <Html
          position={[0, height + 1.0, 0]}
          center
          distanceFactor={14}
          zIndexRange={[0, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: isDanger
                ? 'rgba(185, 28, 28, 0.95)'
                : 'rgba(194, 65, 12, 0.92)',
              color: '#FFF7ED',
              border: isDanger
                ? '1px solid #FCA5A5'
                : '1px solid #FDBA74',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              letterSpacing: 0.4,
              boxShadow: isDanger
                ? '0 2px 12px rgba(239, 68, 68, 0.6)'
                : '0 2px 10px rgba(249, 115, 22, 0.5)',
            }}
          >
            {isDanger ? '严重溢出' : '溢出警告'} · {message}
          </div>
        </Html>
      )}
    </group>
  );
}
