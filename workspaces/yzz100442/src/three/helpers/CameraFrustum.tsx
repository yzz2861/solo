interface CameraFrustumProps {
  fov: number;
  near: number;
  far: number;
  isSelected: boolean;
}

export function CameraFrustum({ fov, near, far, isSelected }: CameraFrustumProps) {
  const fovRad = (fov * Math.PI) / 180;
  const aspect = 16 / 9;

  const nearHeight = 2 * Math.tan(fovRad / 2) * near;
  const nearWidth = nearHeight * aspect;
  const farHeight = 2 * Math.tan(fovRad / 2) * far;
  const farWidth = farHeight * aspect;

  const color = isSelected ? '#3b82f6' : '#0ea5e9';
  const opacity = isSelected ? 0.25 : 0.15;

  return (
    <group position={[0, 0, near + (far - near) / 2]}>
      <mesh>
        <coneGeometry args={[farWidth / 2, far, 4, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={2}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -far / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[farWidth / 2 - 0.02, farWidth / 2, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={2} />
      </mesh>

      <mesh position={[0, 0, near]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[nearWidth / 2 - 0.01, nearWidth / 2, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={2} />
      </mesh>
    </group>
  );
}
