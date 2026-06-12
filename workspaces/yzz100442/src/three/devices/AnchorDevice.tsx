import { useRef } from 'react';
import type { AnchorDevice } from '@/types/device';

interface AnchorDevice3DProps {
  device: AnchorDevice;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  onClick: (e: any) => void;
}

export function AnchorDevice3D({
  device,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: AnchorDevice3DProps) {
  const groupRef = useRef<any>(null);
  const { position, rotation, size } = device;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size.width, size.depth]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} />
      </mesh>

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(size.width, size.depth) * 0.4, Math.min(size.width, size.depth) * 0.45, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.6} side={2} />
      </mesh>

      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 1.7, 16]} />
        <meshStandardMaterial color="#34d399" metalness={0.3} roughness={0.6} />
      </mesh>

      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#6ee7b7" metalness={0.2} roughness={0.5} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(size.width, size.depth) * 0.6,
            Math.max(size.width, size.depth) * 0.65,
            32
          ]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={2} />
        </mesh>
      )}
    </group>
  );
}
