import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../../constants/colors';
import type { LightRig as LightRigType } from '../../types/devices';
import { getHighestRiskLevel } from '../../types/safety';
import type { Risk } from '../../types/safety';
import { getRiskLevelColor } from '../../types/safety';

interface LightRigProps {
  device: LightRigType;
  isSelected: boolean;
  hasRisks: boolean;
  risks: Risk[];
  onClick: () => void;
}

export function LightRig({ device, isSelected, hasRisks, risks, onClick }: LightRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { position, dimensions } = device;

  const width = dimensions?.width || 3;
  const height = dimensions?.height || 0.3;
  const depth = dimensions?.depth || 0.3;

  const riskLevel = getHighestRiskLevel(device.id, risks);
  const riskColor = riskLevel ? getRiskLevelColor(riskLevel) : null;

  const trussColor = COLORS.devices.lightRig;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
    >
      <group
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {[-1, 1].map((sideX) =>
          [-1, 1].map((sideZ) => (
            <mesh
              key={`truss-${sideX}-${sideZ}`}
              position={[
                (sideX * (width - 0.15)) / 2,
                0,
                (sideZ * (depth - 0.15)) / 2,
              ]}
              castShadow
            >
              <boxGeometry args={[0.1, height, 0.1]} />
              <meshStandardMaterial color={trussColor} metalness={0.9} roughness={0.1} />
            </mesh>
          ))
        )}

        {[-1, 1].map((side) => (
          <mesh
            key={`cross-x-${side}`}
            position={[0, 0, (side * (depth - 0.1)) / 2]}
            rotation={[0, 0, Math.PI / 8]}
            castShadow
          >
            <boxGeometry args={[width, 0.05, 0.05]} />
            <meshStandardMaterial color={trussColor} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}

        <mesh
          position={[0, -0.2, 0]}
          castShadow
        >
          <boxGeometry args={[width * 0.8, 0.08, 0.08]} />
          <meshStandardMaterial
            color="#fff59d"
            emissive="#fff59d"
            emissiveIntensity={0.5}
          />
        </mesh>

        {Array.from({ length: Math.floor(width / 0.8) }).map((_, i) => (
          <mesh
            key={`light-${i}`}
            position={[
              -width / 2 + 0.4 + i * 0.8,
              -0.25,
              0,
            ]}
          >
            <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
      </group>

      {hasRisks && riskColor && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.2, height + 0.2, depth + 0.2]} />
          <meshBasicMaterial color={riskColor} transparent opacity={0.2} />
        </mesh>
      )}

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.1, height + 0.1, depth + 0.1]} />
          <meshBasicMaterial color={COLORS.status.info} transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}
