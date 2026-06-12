import { useMemo } from "react";
import * as THREE from "three";
import type { PowerLine as PowerLineType } from "../../types";

interface PowerLineProps {
  line: PowerLineType;
  showWarning: boolean;
}

export function PowerLine({ line, showWarning }: PowerLineProps) {
  const { curve, position } = useMemo(() => {
    const start = new THREE.Vector3(...line.start);
    const end = new THREE.Vector3(...line.end);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y -= 0.5;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return {
      curve: geometry,
      position: [0, 0, 0] as [number, number, number],
    };
  }, [line]);

  const lineColor = useMemo(() => {
    if (showWarning) return "#E63946";
    switch (line.voltage) {
      case "high":
        return "#D32F2F";
      case "medium":
        return "#F57C00";
      default:
        return "#757575";
    }
  }, [line.voltage, showWarning]);

  return (
    <group>
      <lineSegments geometry={curve}>
        <lineBasicMaterial color={lineColor} linewidth={2} />
      </lineSegments>

      {showWarning && (
        <>
          <mesh position={line.start}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#E63946" transparent opacity={0.6} />
          </mesh>
          <mesh position={line.end}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#E63946" transparent opacity={0.6} />
          </mesh>
        </>
      )}

      <mesh position={line.start}>
        <cylinderGeometry args={[0.15, 0.2, line.start[1], 8]} />
        <meshStandardMaterial color="#424242" />
      </mesh>
      <mesh position={line.end}>
        <cylinderGeometry args={[0.15, 0.2, line.end[1], 8]} />
        <meshStandardMaterial color="#424242" />
      </mesh>
    </group>
  );
}
