import { useRef } from 'react';
import type { ZoneDevice } from '@/types/device';

interface ZoneDevice3DProps {
  device: ZoneDevice;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  onClick: (e: any) => void;
}

export function ZoneDevice3D({
  device,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: ZoneDevice3DProps) {
  const groupRef = useRef<any>(null);
  const { position, rotation, size, color, zoneType } = device;

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
        <meshBasicMaterial color={color} transparent opacity={0.4} side={2} />
      </mesh>

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[
          Math.min(size.width, size.depth) * 0.4,
          Math.min(size.width, size.depth) * 0.42,
          4
        ]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={2} />
      </mesh>

      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -size.width / 2 + (size.width / 4) * i,
            0.05,
            0,
          ]}
        >
          <boxGeometry args={[0.02, 0.02, size.depth * 0.3]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>
      ))}

      {isSelected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(size.width, size.depth) * 0.55,
            Math.max(size.width, size.depth) * 0.6,
            4
          ]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} side={2} />
        </mesh>
      )}
    </group>
  );
}
