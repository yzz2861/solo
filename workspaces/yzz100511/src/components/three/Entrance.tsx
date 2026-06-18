import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { EntranceZone } from '../../types';

interface EntranceProps {
  entrance: EntranceZone;
}

export const Entrance = ({ entrance }: EntranceProps) => {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (arrowRef.current) {
      arrowRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const arrowCount = Math.ceil(entrance.dimensions.width / 2);

  return (
    <group position={entrance.position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[entrance.dimensions.width, entrance.dimensions.depth]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      <gridHelper args={[entrance.dimensions.width, 4, '#22c55e', '#22c55e']} position={[0, 0.03, 0]} />

      {Array.from({ length: arrowCount }).map((_, i) => (
        <group
          key={`arrow-${i}`}
          ref={i === 0 ? arrowRef : undefined}
          position={[
            -entrance.dimensions.width / 2 + i * 2 + 1,
            0.5,
            0,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <mesh>
            <coneGeometry args={[0.3, 0.8, 4]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[entrance.dimensions.width, 0.1, 0.1]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      <group position={[0, 2, 0]}>
        <mesh>
          <boxGeometry args={[2, 1, 0.2]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
        </mesh>
        <Text
          position={[0, 0, 0.11]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          客流入口
        </Text>
      </group>

      <group position={[0, 0.05, entrance.dimensions.depth / 2 - 0.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.05, 8, 24]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.02, 8, 24]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
};
