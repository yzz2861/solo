import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Checkpoint } from '@/types';

interface CheckpointMarkerProps {
  checkpoint: Checkpoint;
  visited?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function CheckpointMarker({
  checkpoint,
  visited = false,
  selected = false,
  onClick,
}: CheckpointMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  const color = visited ? '#10b981' : '#6b7280';
  
  return (
    <group
      ref={groupRef}
      position={[checkpoint.x, 0, checkpoint.y]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[checkpoint.radius - 0.2, checkpoint.radius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered || selected ? 0.8 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 0.5 : 0.2}
        />
      </mesh>
      
      <mesh position={[0, 1.2, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 0.8 : 0.4}
        />
      </mesh>
      
      {selected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[checkpoint.radius, checkpoint.radius + 0.3, 32]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
