interface LightConeProps {
  angle: number;
  distance: number;
  color: string;
  intensity: number;
  isSelected: boolean;
}

export function LightCone({ angle, distance, color, intensity, isSelected }: LightConeProps) {
  const radius = Math.tan(angle / 2) * distance;
  const opacity = isSelected ? 0.3 : 0.15;

  return (
    <group position={[0, 0, -distance / 2 - 0.2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[radius, distance, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * Math.min(intensity / 2, 1)}
          side={2}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -distance / 2]}>
        <ringGeometry args={[radius - 0.02, radius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 2}
          side={2}
        />
      </mesh>
    </group>
  );
}
