import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { COLORS } from '../../constants/colors';

interface ConnectionLineProps {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  isOverloaded?: boolean;
  loadRatio?: number;
}

export function ConnectionLine({ start, end, isOverloaded, loadRatio = 0 }: ConnectionLineProps) {
  const { points, color } = useMemo(() => {
    const startPoint = new THREE.Vector3(start.x, start.y, start.z);
    const endPoint = new THREE.Vector3(end.x, end.y, end.z);
    const midPoint = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 + 0.5,
      (start.z + end.z) / 2
    );

    const curve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
    const curvePoints = curve.getPoints(20);

    let lineColor: string = COLORS.status.info;
    if (isOverloaded) {
      lineColor = COLORS.status.danger;
    } else if (loadRatio > 0.8) {
      lineColor = COLORS.status.warning;
    }

    return { points: curvePoints, color: lineColor };
  }, [start, end, isOverloaded, loadRatio]);

  return (
    <>
      <Line
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.7}
      />
      <mesh position={[end.x, end.y, end.z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}
