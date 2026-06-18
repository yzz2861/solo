import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMallStore } from '../../store/useMallStore';

export const Atrium = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { config } = useMallStore();
  const { width, depth, height } = config.atriumDimensions;

  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      const material = gridRef.current.material;
      const materials = Array.isArray(material) 
        ? material 
        : [material] as unknown as THREE.Material[];
      const time = state.clock.elapsedTime;
      materials.forEach((mat) => {
        if ('opacity' in mat) {
          (mat as THREE.LineBasicMaterial).opacity = 0.3 + Math.sin(time * 0.5) * 0.1;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.8} />
      </mesh>

      <gridHelper
        ref={gridRef}
        args={[Math.max(width, depth), Math.max(width, depth), '#4a90d9', '#2a2a4a']}
        position={[0, 0.01, 0]}
      />

      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#0f0f1a" transparent opacity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#0f0f1a" transparent opacity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial color="#0f0f1a" transparent opacity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial color="#0f0f1a" transparent opacity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>

      <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#16162a" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      <pointLight position={[0, height - 1, 0]} intensity={0.8} color="#ffffff" distance={30} decay={2} />
      <pointLight position={[-width / 4, height - 1, -depth / 4]} intensity={0.5} color="#ffffff" distance={20} decay={2} />
      <pointLight position={[width / 4, height - 1, depth / 4]} intensity={0.5} color="#ffffff" distance={20} decay={2} />

      <mesh position={[0, height - 0.5, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
};
