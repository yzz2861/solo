import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { ForbiddenZone } from '@/types';
import { zoneTypeToColor } from '@/utils/colors';
import { getPolygonCenter } from '@/utils/math';

interface ForbiddenZoneMeshProps {
  zone: ForbiddenZone;
  onClick?: () => void;
}

export function ForbiddenZoneMesh({ zone, onClick }: ForbiddenZoneMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = zoneTypeToColor(zone.type);
  
  const { shape, position } = useMemo(() => {
    const points = zone.polygon.map(p => new THREE.Vector2(p.x, p.y));
    const shape = new THREE.Shape(points);
    const center = getPolygonCenter(zone.polygon);
    
    return {
      shape,
      position: [center.x, 0, center.y] as [number, number, number],
    };
  }, [zone]);
  
  return (
    <group ref={groupRef} position={position}>
      <mesh
        position={[0, zone.height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <extrudeGeometry
          args={[
            shape,
            {
              depth: zone.height,
              bevelEnabled: false,
            },
          ]}
        />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      <mesh position={[0, zone.height + 0.1, 0]}>
        <ringGeometry args={[zone.warningDistance - 0.1, zone.warningDistance, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <lineSegments>
        <edgesGeometry 
          args={[new THREE.ExtrudeGeometry(shape, { depth: zone.height, bevelEnabled: false })]} 
        />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
    </group>
  );
}
