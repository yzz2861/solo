import { useRef } from 'react';
import { useStudioStore } from '@/store/useStudioStore';
import type { CameraDevice } from '@/types/device';
import { CameraFrustum } from '../helpers/CameraFrustum';

interface CameraDevice3DProps {
  device: CameraDevice;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
  onClick: (e: any) => void;
}

export function CameraDevice3D({
  device,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: CameraDevice3DProps) {
  const groupRef = useRef<any>(null);
  const showFrustum = useStudioStore((state) => state.showFrustum);
  const { position, rotation, fov, near, far, height } = device;

  const bodyColor = '#1e293b';
  const accentColor = '#3b82f6';

  return (
    <group
      ref={groupRef}
      position={[position.x, height, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <mesh position={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.25, 0.18, 0.3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0, 0.26]}>
        <circleGeometry args={[0.07, 16]} />
        <meshBasicMaterial color="#0ea5e9" />
      </mesh>

      <mesh position={[0, -0.15, -0.05]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.15, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0, -0.3, -0.05]}>
        <cylinderGeometry args={[0.1, 0.12, 0.05, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>

      {showFrustum && (
        <CameraFrustum
          fov={fov}
          near={near}
          far={far}
          isSelected={isSelected}
        />
      )}

      {isSelected && (
        <mesh position={[0, -0.28, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} side={2} />
        </mesh>
      )}
    </group>
  );
}
