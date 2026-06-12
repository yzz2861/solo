import { useRef } from 'react';
import type { ProductTableDevice } from '@/types/device';

interface ProductTableDevice3DProps {
  device: ProductTableDevice;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  onClick: (e: any) => void;
}

export function ProductTableDevice3D({
  device,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: ProductTableDevice3DProps) {
  const groupRef = useRef<any>(null);
  const { position, rotation, size } = device;

  const tableColor = '#8b5a2b';
  const legColor = '#5c3d1e';

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh position={[0, size.height, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.width, 0.05, size.depth]} />
        <meshStandardMaterial color={tableColor} metalness={0.1} roughness={0.7} />
      </mesh>

      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
        <mesh
          key={i}
          position={[
            (dx * size.width) / 2 - dx * 0.05,
            size.height / 2,
            (dz * size.depth) / 2 - dz * 0.05,
          ]}
          castShadow
        >
          <boxGeometry args={[0.04, size.height - 0.05, 0.04]} />
          <meshStandardMaterial color={legColor} />
        </mesh>
      ))}

      <mesh position={[0, size.height + 0.06, 0]}>
        <boxGeometry args={[size.width * 0.4, 0.1, size.depth * 0.3]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.3} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(size.width, size.depth) * 0.7,
            Math.max(size.width, size.depth) * 0.78,
            32
          ]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={2} />
        </mesh>
      )}
    </group>
  );
}
