import { useRef } from 'react';
import type { Mesh } from 'three';
import { COLORS } from '../../constants/colors';
import type { HoistPoint as HoistPointType } from '../../types/devices';
import { getHighestRiskLevel } from '../../types/safety';
import type { Risk } from '../../types/safety';
import { getRiskLevelColor } from '../../types/safety';

interface HoistPointProps {
  device: HoistPointType;
  isSelected: boolean;
  hasRisks: boolean;
  risks: Risk[];
  currentLoad: number;
  onClick: () => void;
}

export function HoistPoint({ device, isSelected, hasRisks, risks, currentLoad, onClick }: HoistPointProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { position } = device;

  const riskLevel = getHighestRiskLevel(device.id, risks);
  const baseColor = hasRisks && riskLevel ? getRiskLevelColor(riskLevel) : COLORS.devices.hoistPoint;

  const loadRatio = device.maxLoad > 0 ? currentLoad / device.maxLoad : 0;
  const loadColor = loadRatio >= 1 ? COLORS.status.danger : loadRatio >= 0.8 ? COLORS.status.warning : COLORS.status.success;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
    >
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        castShadow
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.9} />
      </mesh>

      <mesh position={[0, -0.35, 0]}>
        <torusGeometry args={[0.08, 0.02, 8, 16]} />
        <meshStandardMaterial color={loadColor} metalness={0.7} />
      </mesh>

      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.9} />
      </mesh>

      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.3]} />
        <meshStandardMaterial color="#444444" metalness={0.8} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color={COLORS.status.info} transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}
