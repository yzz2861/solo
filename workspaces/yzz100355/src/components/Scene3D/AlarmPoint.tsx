import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Alarm } from '@/types';
import { alarmLevelToColor } from '@/utils/colors';

interface AlarmPointProps {
  alarm: Alarm;
  selected?: boolean;
  onClick?: () => void;
}

export function AlarmPoint({ alarm, selected = false, onClick }: AlarmPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = alarmLevelToColor(alarm.level);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.setScalar(hovered || selected ? scale * 1.3 : scale);
    }
  });
  
  return (
    <group position={[alarm.x, 1, alarm.y]}>
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
        <sphereGeometry args={[selected ? 0.8 : 0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 0.8 : 0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <pointLight
        color={color}
        intensity={hovered || selected ? 2 : 1}
        distance={5}
      />
    </group>
  );
}
