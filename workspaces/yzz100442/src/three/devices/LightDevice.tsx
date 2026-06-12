import { useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import type { LightDevice } from '@/types/device';
import { LightCone } from '../helpers/LightCone';

interface LightDevice3DProps {
  device: LightDevice;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  onClick: (e: any) => void;
}

export function LightDevice3D({
  device,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: LightDevice3DProps) {
  const groupRef = useRef<any>(null);
  const showLightRange = useStudioStore((state) => state.showLightRange);
  const { position, rotation, height, intensity, color, angle, penumbra, lightType } = device;

  const standColor = '#334155';
  const headColor = '#1e293b';

  const lightHeight = height;
  const headHeight = 0.3;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.1, 16]} />
        <meshStandardMaterial color={standColor} metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0, lightHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, lightHeight - 0.1, 8]} />
        <meshStandardMaterial color={standColor} metalness={0.7} roughness={0.3} />
      </mesh>

      <group position={[0, lightHeight - 0.05, 0]}>
        <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.08, headHeight, 16]} />
          <meshStandardMaterial color={headColor} metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[0, 0, -0.25]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>

        <pointLight
          color={color}
          intensity={intensity * 0.3}
          distance={5}
          position={[0, 0, -0.2]}
        />

        {showLightRange && lightType === 'spot' && angle && (
          <LightCone
            angle={angle}
            distance={5}
            color={color}
            intensity={intensity}
            isSelected={isSelected}
          />
        )}
      </group>

      {isSelected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.32, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} side={2} />
        </mesh>
      )}
    </group>
  );
}
