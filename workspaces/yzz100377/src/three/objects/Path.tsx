import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Path, PathPoint } from '@/types/scene';
import { pointsToPolyline } from '@/utils/geometry';

interface PathLineProps {
  path: Path;
  isDrawing?: boolean;
  showTurnRadius?: boolean;
  color?: string;
}

export function PathLine({ path, isDrawing = false, showTurnRadius = true, color = '#22d3ee' }: PathLineProps) {
  const lineRef = useRef<THREE.Line>(null);
  const tubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (tubeRef.current) {
      const material = tubeRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      material.opacity = isDrawing ? pulse : 0.8;
    }
  });

  const tubeGeometry = useMemo(() => {
    if (path.points.length < 2) return null;

    const points2d = path.points.map((p) => new THREE.Vector3(p.x, 0.05, p.z));
    const smoothPoints = pointsToPolyline(
      path.points.map((p) => ({ x: p.x, z: p.z })),
      8,
    );

    const curvePoints = smoothPoints.map((p) => new THREE.Vector3(p.x, 0.05, p.z));

    if (curvePoints.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.3);
    return new THREE.TubeGeometry(curve, Math.max(smoothPoints.length * 3, 30), 0.04, 8, false);
  }, [path.points]);

  const turnRadiusVisuals = useMemo(() => {
    if (!showTurnRadius) return [];

    const visuals: { center: [number, number, number]; radius: number; angle: number }[] = [];

    for (let i = 1; i < path.points.length - 1; i++) {
      const point = path.points[i];
      if (point.radius && point.isTurn) {
        const prev = path.points[i - 1];
        const next = path.points[i + 1];

        const angle1 = Math.atan2(point.x - prev.x, point.z - prev.z);
        const angle2 = Math.atan2(next.x - point.x, next.z - point.z);
        const turnAngle = Math.abs(angle2 - angle1);

        visuals.push({
          center: [point.x, 0.06, point.z],
          radius: point.radius,
          angle: turnAngle,
        });
      }
    }

    return visuals;
  }, [path.points, showTurnRadius]);

  const pointMarkers = useMemo(() => {
    return path.points.map((p, i) => ({
      position: [p.x, 0.08, p.z] as [number, number, number],
      isTurn: p.isTurn,
      index: i,
    }));
  }, [path.points]);

  if (path.points.length < 2) {
    if (path.points.length === 1) {
      return (
        <mesh position={[path.points[0].x, 0.1, path.points[0].z]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    }
    return null;
  }

  return (
    <group>
      {tubeGeometry && (
        <mesh ref={tubeRef} geometry={tubeGeometry}>
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}

      {turnRadiusVisuals.map((v, i) => (
        <group key={`turn-${i}`} position={v.center}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[v.radius - 0.02, v.radius + 0.02, 32, 1, 0, v.angle]} />
            <meshBasicMaterial color="#f472b6" transparent opacity={0.6} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#f472b6" />
          </mesh>
        </group>
      ))}

      {pointMarkers.map((p) => (
        <mesh key={`point-${p.index}`} position={p.position}>
          <sphereGeometry args={[p.isTurn ? 0.08 : 0.05, 12, 12]} />
          <meshBasicMaterial color={p.isTurn ? '#f472b6' : color} />
        </mesh>
      ))}
    </group>
  );
}

interface CollisionMarkerProps {
  position: [number, number, number];
  severity: 'danger' | 'warning' | 'safe';
  label?: string;
}

export function CollisionMarker({ position, severity, label }: CollisionMarkerProps) {
  const ref = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  const colors = {
    danger: '#ef4444',
    warning: '#eab308',
    safe: '#10b981',
  };

  return (
    <group ref={ref} position={position}>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={colors[severity]} transparent opacity={0.3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={colors[severity]} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshBasicMaterial color={colors[severity]} />
      </mesh>
    </group>
  );
}
