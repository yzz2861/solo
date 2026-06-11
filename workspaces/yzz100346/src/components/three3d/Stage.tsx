import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../../constants/colors';
import type { Stage as StageType } from '../../types/devices';

interface StageProps {
  device: StageType;
  isSelected: boolean;
  onClick: () => void;
}

export function Stage({ device, isSelected, onClick }: StageProps) {
  const meshRef = useRef<Mesh>(null);
  const { position, dimensions } = device;

  const width = dimensions?.width || 12;
  const height = dimensions?.height || 0.8;
  const depth = dimensions?.depth || 8;

  return (
    <group position={[position.x, position.y + height / 2, position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={COLORS.devices.stage}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {[-width / 2 + 0.5, width / 2 - 0.5].map((x) =>
        [-depth / 2 + 0.5, depth / 2 - 0.5].map((z) => (
          <mesh
            key={`leg-${x}-${z}`}
            position={[x, -height / 2 - 0.3, z]}
            castShadow
          >
            <boxGeometry args={[0.3, 0.6, 0.3]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>
        ))
      )}

      <mesh position={[0, height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width - 0.2, depth - 0.2]} />
        <meshStandardMaterial color="#6b4423" roughness={0.9} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.05, height + 0.05, depth + 0.05]} />
          <meshBasicMaterial color={COLORS.status.info} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}
