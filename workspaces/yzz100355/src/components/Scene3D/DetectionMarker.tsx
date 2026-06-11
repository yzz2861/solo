import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { DetectionResult } from '@/types';
import { severityToHex } from '@/utils/colors';

interface DetectionMarkerProps {
  detection: DetectionResult;
  position: [number, number, number];
  selected?: boolean;
  onClick?: () => void;
}

export function DetectionMarker({
  detection,
  position,
  selected = false,
  onClick,
}: DetectionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = severityToHex(detection.severity);
  
  useFrame((state) => {
    if (meshRef.current) {
      const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.3;
      meshRef.current.position.y = 1.5 + bounce;
    }
  });
  
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh
        ref={meshRef}
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
        <dodecahedronGeometry args={[selected ? 0.8 : 0.5, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 0.8 : 0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered || selected ? 0.8 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <pointLight
        color={color}
        intensity={hovered || selected ? 1.5 : 0.8}
        distance={3}
      />
    </group>
  );
}
