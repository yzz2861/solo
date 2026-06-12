import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  direction: number;
  speed: number;
}

export default function WindArrow({ direction, speed }: Props) {
  const groupRotation = useMemo((): [number, number, number] => {
    const rad = THREE.MathUtils.degToRad(direction);
    return [0, -rad, 0];
  }, [direction]);

  const shaftLength = Math.min(speed * 0.3, 5);
  const shaftRadius = 0.08;
  const headLength = shaftLength * 0.3;
  const headRadius = shaftRadius * 3;

  return (
    <group position={[0, 12, 0]} rotation={groupRotation}>
      <mesh position={[0, 0, shaftLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 8]} />
        <meshBasicMaterial
          color="#B0D4F1"
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh position={[0, 0, shaftLength + headLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[headRadius, headLength, 8]} />
        <meshBasicMaterial
          color="#B0D4F1"
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
