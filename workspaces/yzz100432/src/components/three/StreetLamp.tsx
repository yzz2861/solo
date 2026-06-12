import { useMemo } from "react";
import type { StreetLamp as StreetLampType } from "../../types";

interface StreetLampProps {
  lamp: StreetLampType;
  showNightMode: boolean;
}

export function StreetLamp({ lamp, showNightMode }: StreetLampProps) {
  const lampHeight = lamp.height;

  return (
    <group position={lamp.position}>
      <mesh position={[0, lampHeight / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, lampHeight, 8]} />
        <meshStandardMaterial color="#37474F" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh position={[0, lampHeight + 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#37474F" />
      </mesh>

      <mesh position={[0, lampHeight + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.08, 8, 16]} />
        <meshStandardMaterial color="#37474F" />
      </mesh>

      {showNightMode && (
        <>
          <pointLight
            position={[0, lampHeight, 0]}
            color="#FFF8E7"
            intensity={lamp.intensity * 2}
            distance={lamp.radius * 2}
            decay={2}
          />
          <mesh position={[0, lampHeight, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#FFF8E7" transparent opacity={0.6} />
          </mesh>
        </>
      )}

      {!showNightMode && (
        <mesh position={[0, lampHeight, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>
      )}
    </group>
  );
}
