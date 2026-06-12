import { useMemo } from "react";
import * as THREE from "three";
import type { RoadSegment } from "../../types";

interface RoadProps {
  segments: RoadSegment[];
}

export function Road({ segments }: RoadProps) {
  const roads = useMemo(() => {
    return segments.map((segment) => {
      const start = new THREE.Vector3(...segment.start);
      const end = new THREE.Vector3(...segment.end);
      const length = start.distanceTo(end);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const direction = end.clone().sub(start).normalize();
      const rotation = Math.atan2(direction.x, direction.z);

      return {
        id: segment.id,
        position: [mid.x, 0.01, mid.z] as [number, number, number],
        rotation: [0, -rotation, 0] as [number, number, number],
        length,
        width: segment.width,
      };
    });
  }, [segments]);

  return (
    <group>
      {roads.map((road) => (
        <group
          key={road.id}
          position={road.position}
          rotation={road.rotation}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[road.width, road.length]} />
            <meshStandardMaterial color="#4A4A4A" roughness={0.95} />
          </mesh>

          <mesh position={[0, 0.02, road.length / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 1]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.02, -road.length / 2 + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 1]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>

          {Array.from({ length: Math.floor(road.length / 4) }).map((_, i) => (
            <mesh
              key={i}
              position={[0, 0.02, -road.length / 2 + 2 + i * 4]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.15, 2]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          ))}
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#8FBC8F" roughness={1} />
      </mesh>
    </group>
  );
}
