import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ShelfObject } from '@/types/scene';
import * as THREE from 'three';

interface ShelfProps {
  object: ShelfObject;
  selected?: boolean;
  onClick?: () => void;
}

export function Shelf({ object, selected, onClick }: ShelfProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current && selected) {
      const pulse = 0.02 + Math.sin(state.clock.elapsedTime * 3) * 0.01;
      glowRef.current.scale.setScalar(1 + pulse);
    }
  });

  const { width, depth, height, levels, hasPallet, palletOverhang } = object;
  const beamHeight = 0.08;
  const postSize = 0.08;
  const levelHeight = height / levels;

  const totalWidth = width + (hasPallet ? palletOverhang * 2 : 0);

  const shelfColor = '#3b82f6';
  const palletColor = '#d97706';

  return (
    <group
      ref={groupRef}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[0, (object.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {selected && (
        <mesh ref={glowRef} position={[0, height / 2, 0]}>
          <boxGeometry args={[totalWidth + 0.2, height + 0.2, depth + 0.2]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}

      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`post-${i}`} position={[sx * (width / 2 - postSize / 2), height / 2, sz * (depth / 2 - postSize / 2)]}>
          <boxGeometry args={[postSize, height, postSize]} />
          <meshStandardMaterial color={shelfColor} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {Array.from({ length: levels + 1 }).map((_, i) => (
        <group key={`level-${i}`} position={[0, i * levelHeight, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[width, beamHeight, depth]} />
            <meshStandardMaterial color={shelfColor} metalness={0.5} roughness={0.4} />
          </mesh>

          {hasPallet && i < levels && (
            <mesh position={[0, beamHeight / 2 + 0.15, 0]}>
              <boxGeometry args={[totalWidth, 0.15, depth + 0.1]} />
              <meshStandardMaterial color={palletColor} metalness={0.1} roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}

      {object.label && (
        <group position={[0, height + 0.3, 0]}>
          <mesh>
            <planeGeometry args={[Math.min(width * 0.8, 2), 0.4]} />
            <meshBasicMaterial color="#1e3a8a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}
