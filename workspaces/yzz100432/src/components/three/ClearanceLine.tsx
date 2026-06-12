import { useMemo } from "react";
import * as THREE from "three";
import type { Tree } from "../../types";
import { getClearanceStatus } from "../../utils/collisionDetector";

interface ClearanceLineProps {
  tree: Tree;
  clearanceHeight: number;
  visible: boolean;
}

export function ClearanceLine({ tree, clearanceHeight, visible }: ClearanceLineProps) {
  const clearanceStatus = useMemo(
    () => getClearanceStatus(clearanceHeight),
    [clearanceHeight]
  );

  if (!visible) return null;

  const radius = tree.crownRadius * 1.5;

  return (
    <group position={[tree.positionX, 0, tree.positionZ]}>
      <mesh position={[0, clearanceHeight / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, clearanceHeight, 8]} />
        <meshBasicMaterial color={clearanceStatus.color} />
      </mesh>

      <mesh position={[0, clearanceHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.3, radius, 48]} />
        <meshBasicMaterial
          color={clearanceStatus.color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, clearanceHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.1, radius, 48]} />
        <meshBasicMaterial color={clearanceStatus.color} />
      </mesh>

      <group position={[radius + 0.5, clearanceHeight, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.5, 0.1]} />
          <meshStandardMaterial color={clearanceStatus.color} />
        </mesh>
        <mesh position={[-0.6, 0, 0.06]}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[-0.3, 0, 0.06]}>
          <boxGeometry args={[0.02, 0.4, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.02, 0.5, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.3, 0, 0.06]}>
          <boxGeometry args={[0.02, 0.4, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.6, 0, 0.06]}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </group>
  );
}
