import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExhibitionObject } from '../../types';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useObjectStore } from '../../store/useObjectStore';
import { useRiskStore } from '../../store/useRiskStore';

interface CarProps {
  object: ExhibitionObject;
}

export const Car = ({ object }: CarProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragDrop();
  const selectedId = useObjectStore((state) => state.selectedId);
  const dragState = useObjectStore((state) => state.dragState);
  const risks = useRiskStore((state) => state.risks);
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedId === object.id;
  const isDragging = dragState.isDragging && dragState.objectId === object.id;
  const hasDanger = risks.some((r) => r.objectId === object.id && r.severity === 'danger');
  const hasWarning = risks.some((r) => r.objectId === object.id && r.severity === 'warning');

  useFrame((state) => {
    if (groupRef.current) {
      if (isDragging) {
        groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
      } else if (isSelected) {
        groupRef.current.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      } else {
        groupRef.current.position.y = object.position[1];
      }
    }
  });

  const bodyColor = hasDanger ? '#dc2626' : hasWarning ? '#f59e0b' : '#1e40af';
  const windowColor = '#1a1a2e';
  const wheelColor = '#1f2937';
  const accentColor = isSelected ? '#60a5fa' : hovered ? '#93c5fd' : '#374151';

  const w = object.dimensions.width;
  const d = object.dimensions.depth;
  const h = object.dimensions.height;

  return (
    <group ref={groupRef} position={[object.position[0], object.position[1], object.position[2]]}>
      <group
        onPointerDown={(e) => handlePointerDown(e, object.id, object.position)}
        onPointerMove={(e) => handlePointerMove(e, object.id)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <mesh position={[0, h * 0.35, 0]} castShadow>
          <boxGeometry args={[w * 0.95, h * 0.45, d * 0.9]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[0, h * 0.7, 0]} castShadow>
          <boxGeometry args={[w * 0.85, h * 0.35, d * 0.6]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[0, h * 0.7, d * 0.15]}>
          <boxGeometry args={[w * 0.75, h * 0.25, d * 0.02]} />
          <meshStandardMaterial color={windowColor} metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        </mesh>

        <mesh position={[0, h * 0.7, -d * 0.15]}>
          <boxGeometry args={[w * 0.75, h * 0.25, d * 0.02]} />
          <meshStandardMaterial color={windowColor} metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        </mesh>

        <mesh position={[w * 0.4, h * 0.7, 0]}>
          <boxGeometry args={[d * 0.02, h * 0.25, d * 0.55]} />
          <meshStandardMaterial color={windowColor} metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        </mesh>

        <mesh position={[-w * 0.4, h * 0.7, 0]}>
          <boxGeometry args={[d * 0.02, h * 0.25, d * 0.55]} />
          <meshStandardMaterial color={windowColor} metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        </mesh>

        {[
          [w * 0.35, h * 0.12, d * 0.3],
          [-w * 0.35, h * 0.12, d * 0.3],
          [w * 0.35, h * 0.12, -d * 0.3],
          [-w * 0.35, h * 0.12, -d * 0.3],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[h * 0.12, h * 0.12, w * 0.1, 16]} />
            <meshStandardMaterial color={wheelColor} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}

        <mesh position={[0, h * 0.15, d * 0.46]}>
          <boxGeometry args={[w * 0.6, h * 0.08, d * 0.02]} />
          <meshStandardMaterial color="#fef3c7" metalness={0.5} roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>

        <mesh position={[0, h * 0.15, -d * 0.46]}>
          <boxGeometry args={[w * 0.6, h * 0.08, d * 0.02]} />
          <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.3} emissive="#dc2626" emissiveIntensity={0.3} />
        </mesh>

        <lineSegments position={[0, h * 0.35, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w * 0.95, h * 0.45, d * 0.9)]} />
          <lineBasicMaterial color={accentColor} linewidth={isSelected ? 2 : 1} />
        </lineSegments>
      </group>

      {isSelected && (
        <mesh position={[0, h + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.5, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
