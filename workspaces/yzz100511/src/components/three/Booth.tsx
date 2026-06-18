import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExhibitionObject } from '../../types';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useObjectStore } from '../../store/useObjectStore';
import { useRiskStore } from '../../store/useRiskStore';

interface BoothProps {
  object: ExhibitionObject;
}

export const Booth = ({ object }: BoothProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
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
    if (meshRef.current) {
      if (isDragging) {
        meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
      } else if (isSelected) {
        meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      } else {
        meshRef.current.position.y = object.dimensions.height / 2;
      }
      
      if (hasDanger && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
        meshRef.current.material.emissive.setRGB(pulse, 0, 0);
      } else if (hasWarning && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
        meshRef.current.material.emissive.setRGB(pulse, pulse * 0.5, 0);
      }
    }
  });

  const baseColor = hasDanger ? '#dc2626' : hasWarning ? '#f59e0b' : '#3b82f6';
  const edgeColor = isSelected ? '#60a5fa' : hovered ? '#93c5fd' : '#1d4ed8';

  return (
    <group position={object.position}>
      <mesh
        ref={meshRef}
        position={[0, object.dimensions.height / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={(e) => handlePointerDown(e, object.id, object.position)}
        onPointerMove={(e) => handlePointerMove(e, object.id)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[object.dimensions.width, object.dimensions.height, object.dimensions.depth]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.3}
          roughness={0.5}
          emissive={isSelected ? '#1e40af' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <lineSegments position={[0, object.dimensions.height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(object.dimensions.width, object.dimensions.height, object.dimensions.depth)]} />
        <lineBasicMaterial color={edgeColor} linewidth={isSelected ? 2 : 1} />
      </lineSegments>

      {isSelected && (
        <mesh position={[0, object.dimensions.height + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.5, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
