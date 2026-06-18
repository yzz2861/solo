import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { FireExitZone } from '../../types';

interface FireExitProps {
  exit: FireExitZone;
}

export const FireExit = ({ exit }: FireExitProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group position={exit.position}>
      <mesh ref={meshRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[exit.dimensions.width, exit.dimensions.depth]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      <gridHelper args={[exit.dimensions.width, 4, '#ef4444', '#ef4444']} position={[0, 0.03, 0]} />

      {Array.from({ length: Math.ceil(exit.dimensions.depth / 2) }).map((_, i) => (
        <mesh
          key={`hatch-${i}`}
          position={[0, 0.04, -exit.dimensions.depth / 2 + i * 2 + 1]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        >
          <planeGeometry args={[0.3, exit.dimensions.width * 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      ))}

      <mesh position={[0, 1, -exit.dimensions.depth / 2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[exit.dimensions.width, 0.1, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      <mesh position={[0, 1, exit.dimensions.depth / 2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[exit.dimensions.width, 0.1, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      <group position={[0, 2, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 1, 0.2]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
        </mesh>
        <Text
          position={[0, 0, 0.11]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          消防通道
        </Text>
      </group>
    </group>
  );
};
