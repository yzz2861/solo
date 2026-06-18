import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExhibitionObject, MallConfig } from '../../types';

interface PowerLineProps {
  object: ExhibitionObject;
  mall: MallConfig;
}

export const PowerLine = ({ object, mall }: PowerLineProps) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.LineSegments>(null);

  const points = useMemo(() => {
    if (!object.hasPower || !object.powerSourceId) return null;
    
    const powerPoint = mall.powerPoints.find(p => p.id === object.powerSourceId);
    if (!powerPoint) return null;

    const start = new THREE.Vector3(...powerPoint.position);
    const end = new THREE.Vector3(...object.position);
    end.y = 0.1;

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y = 0.5;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const curvePoints = curve.getPoints(20);
    
    return curvePoints;
  }, [object, mall.powerPoints]);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  if (!points) return null;

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <lineSegments ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#eab308" linewidth={2} />
      </lineSegments>
      <lineSegments ref={glowRef} geometry={geometry}>
        <lineBasicMaterial color="#fbbf24" linewidth={4} transparent opacity={0.4} />
      </lineSegments>
      {points.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      ))}
    </group>
  );
};
