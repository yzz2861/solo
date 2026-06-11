import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../../constants/colors';
import type { Speaker as SpeakerType } from '../../types/devices';
import { getHighestRiskLevel } from '../../types/safety';
import type { Risk } from '../../types/safety';
import { getRiskLevelColor } from '../../types/safety';

interface SpeakerProps {
  device: SpeakerType;
  isSelected: boolean;
  hasRisks: boolean;
  risks: Risk[];
  onClick: () => void;
}

export function Speaker({ device, isSelected, hasRisks, risks, onClick }: SpeakerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { position, dimensions } = device;

  const width = dimensions?.width || 0.6;
  const height = dimensions?.height || 1.2;
  const depth = dimensions?.depth || 0.5;

  const riskLevel = getHighestRiskLevel(device.id, risks);
  const riskColor = riskLevel ? getRiskLevelColor(riskLevel) : null;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y + height / 2, position.z]}
    >
      <group
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={COLORS.devices.speaker}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>

        <mesh position={[0, 0.1, depth / 2 + 0.01]}>
          <cylinderGeometry args={[width * 0.35, width * 0.35, 0.05, 32]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.8}
          />
        </mesh>

        <mesh position={[0, 0.1, depth / 2 + 0.03]}>
          <cylinderGeometry args={[width * 0.25, width * 0.25, 0.02, 32]} />
          <meshStandardMaterial
            color="#333333"
            roughness={0.5}
          />
        </mesh>

        <mesh position={[0, -height * 0.3, depth / 2 + 0.01]}>
          <cylinderGeometry args={[width * 0.2, width * 0.2, 0.05, 32]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.8}
          />
        </mesh>

        <mesh position={[0, height * 0.35, depth / 2 + 0.01]}>
          <torusGeometry args={[width * 0.08, 0.01, 8, 32]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
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
          <meshBasicMaterial color={COLORS.status.info} transparent opacity={0.25} />
        </mesh>
      )}
    </group>
  );
}
