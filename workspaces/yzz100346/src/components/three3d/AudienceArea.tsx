import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../../constants/colors';
import type { AudienceArea as AudienceAreaType } from '../../types/devices';

interface AudienceAreaProps {
  device: AudienceAreaType;
  isSelected: boolean;
  onClick: () => void;
}

export function AudienceArea({ device, isSelected, onClick }: AudienceAreaProps) {
  const meshRef = useRef<Mesh>(null);
  const { position, dimensions } = device;

  const width = dimensions?.width || 15;
  const height = dimensions?.height || 0.1;
  const depth = dimensions?.depth || 10;

  const seatRows = Math.floor(depth / 1.2);
  const seatCols = Math.floor(width / 0.8);

  return (
    <group position={[position.x, position.y + height / 2, position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={COLORS.status.info}
          transparent
          opacity={0.15}
        />
      </mesh>

      <mesh position={[0, height / 2 + 0.01, 0]}>
        <boxGeometry args={[width, 0.02, depth]} />
        <meshStandardMaterial
          color={COLORS.status.info}
          transparent
          opacity={0.3}
        />
      </mesh>

      {Array.from({ length: seatRows }).map((_, row) =>
        Array.from({ length: seatCols }).map((_, col) => (
          <mesh
            key={`seat-${row}-${col}`}
            position={[
              -width / 2 + 0.4 + col * 0.8,
              height + 0.05,
              -depth / 2 + 0.6 + row * 1.2,
            ]}
          >
            <boxGeometry args={[0.5, 0.02, 0.5]} />
            <meshStandardMaterial
              color={COLORS.status.info}
              transparent
              opacity={0.25}
            />
          </mesh>
        ))
      )}

      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, 1, 0.1]} />
        <meshStandardMaterial
          color={COLORS.status.info}
          transparent
          opacity={0.2}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.1, height + 0.1, depth + 0.1]} />
          <meshBasicMaterial color={COLORS.status.info} transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}
