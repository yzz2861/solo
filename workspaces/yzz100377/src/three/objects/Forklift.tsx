import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ForkliftObject } from '@/types/scene';
import * as THREE from 'three';

interface ForkliftProps {
  object: ForkliftObject;
  selected?: boolean;
  onClick?: () => void;
  showTurnRadius?: boolean;
}

export function Forklift({ object, selected, onClick, showTurnRadius = false }: ForkliftProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current && selected) {
      const pulse = 0.02 + Math.sin(state.clock.elapsedTime * 3) * 0.01;
      glowRef.current.scale.setScalar(1 + pulse);
    }
  });

  const { width, wheelbase, forkLength, turningRadius } = object;

  const bodyLength = wheelbase * 1.2;
  const bodyHeight = 1.2;
  const cabinHeight = 1.5;
  const mastHeight = 3;

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
        <mesh ref={glowRef} position={[0, bodyHeight / 2, 0]}>
          <boxGeometry args={[width + 0.4, bodyHeight + cabinHeight + 0.4, bodyLength + forkLength + 0.4]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}

      {showTurnRadius && turningRadius > 0 && (
        <group position={[0, 0.01, wheelbase / 2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[turningRadius - 0.02, turningRadius + 0.02, 64, 1, 0, Math.PI]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[turningRadius - width / 2 - 0.02, turningRadius - width / 2 + 0.02, 64, 1, 0, Math.PI]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      <mesh position={[0, bodyHeight / 2, 0]}>
        <boxGeometry args={[width, bodyHeight, bodyLength]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, bodyHeight + cabinHeight / 2, -bodyLength * 0.1]}>
        <boxGeometry args={[width * 0.9, cabinHeight, bodyLength * 0.6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.4} roughness={0.5} transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, mastHeight / 2, bodyLength / 2 + 0.1]}>
        <boxGeometry args={[width * 0.15, mastHeight, 0.1]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[0, mastHeight / 2, bodyLength / 2 - 0.15]}>
        <boxGeometry args={[width * 0.15, mastHeight, 0.1]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>

      <group position={[0, 0.2, bodyLength / 2 + forkLength / 2]}>
        <mesh position={[-width * 0.25, 0, 0]}>
          <boxGeometry args={[0.1, 0.1, forkLength]} />
          <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[width * 0.25, 0, 0]}>
          <boxGeometry args={[0.1, 0.1, forkLength]} />
          <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {[
        [-width / 2, 0, bodyLength * 0.25],
        [width / 2, 0, bodyLength * 0.25],
        [-width / 2, 0, -bodyLength * 0.25],
        [width / 2, 0, -bodyLength * 0.25],
      ].map((pos, i) => (
        <mesh key={`wheel-${i}`} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
