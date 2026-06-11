import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useFloatAnimation } from '@/hooks/useAnimation';

interface RobotProps {
  position: [number, number, number] | null;
  visible?: boolean;
}

export function Robot({ position, visible = true }: RobotProps) {
  const groupRef = useFloatAnimation(0.2, 1.5);
  const wheelsRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (wheelsRef.current) {
      wheelsRef.current.rotation.x = state.clock.elapsedTime * 5;
    }
  });
  
  if (!visible || !position) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.5, 0.8, 1]} />
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.5, 16]} />
        <meshStandardMaterial
          color="#2563eb"
          metalness={0.9}
          roughness={0.1}
          emissive="#3b82f6"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.8}
        />
      </mesh>
      
      <group ref={wheelsRef} position={[0, 0.25, 0]}>
        <mesh position={[0.6, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-0.6, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0.6, 0, -0.4]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[-0.6, 0, -0.4]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
      
      <mesh position={[0, 1.1, 0.5]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <pointLight
        position={[0, 1.5, 0]}
        color="#3b82f6"
        intensity={1}
        distance={10}
      />
    </group>
  );
}
