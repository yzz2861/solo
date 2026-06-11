import { useRef } from 'react';
import { Mesh } from 'three';

interface GroundProps {
  width?: number;
  height?: number;
}

export function Ground({ width = 100, height = 80 }: GroundProps) {
  const meshRef = useRef<Mesh>(null);
  
  return (
    <group>
      <mesh 
        ref={meshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[width / 2, -0.01, height / 2]}
        receiveShadow
      >
        <planeGeometry args={[width + 20, height + 20]} />
        <meshStandardMaterial 
          color="#0a1628"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0.001, height / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial 
          color="#0f172a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      <gridHelper
        args={[Math.max(width, height), 20, '#1e40af', '#1e3a5f']}
        position={[width / 2, 0.02, height / 2]}
      />
    </group>
  );
}
