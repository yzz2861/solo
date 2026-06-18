import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExhibitionObject } from '../../types';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useObjectStore } from '../../store/useObjectStore';

interface BarrierProps {
  object: ExhibitionObject;
}

export const Barrier = ({ object }: BarrierProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragDrop();
  const selectedId = useObjectStore((state) => state.selectedId);
  const dragState = useObjectStore((state) => state.dragState);
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedId === object.id;
  const isDragging = dragState.isDragging && dragState.objectId === object.id;

  const segmentCount = Math.max(1, Math.floor(object.dimensions.width / 1.2));
  const dummy = useRef(new THREE.Object3D());

  useFrame((state) => {
    if (meshRef.current) {
      for (let i = 0; i < segmentCount; i++) {
        const x = (i - (segmentCount - 1) / 2) * 1.2;
        dummy.current.position.set(x, object.dimensions.height / 2, 0);
        dummy.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.02;
        dummy.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.current.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const baseColor = '#94a3b8';
  const accentColor = isSelected ? '#60a5fa' : hovered ? '#93c5fd' : '#475569';
  const stripeColor = '#fbbf24';

  return (
    <group position={object.position}>
      <group
        onPointerDown={(e) => handlePointerDown(e, object.id, object.position)}
        onPointerMove={(e) => handlePointerMove(e, object.id)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, segmentCount]}
          castShadow
        >
          <boxGeometry args={[1, object.dimensions.height, object.dimensions.depth]} />
          <meshStandardMaterial color={baseColor} metalness={0.3} roughness={0.6} />
        </instancedMesh>

        <mesh position={[0, object.dimensions.height * 0.3, 0]}>
          <boxGeometry args={[object.dimensions.width, object.dimensions.height * 0.2, object.dimensions.depth + 0.02]} />
          <meshStandardMaterial color={stripeColor} metalness={0.2} roughness={0.7} />
        </mesh>

        <mesh position={[0, object.dimensions.height * 0.7, 0]}>
          <boxGeometry args={[object.dimensions.width, object.dimensions.height * 0.2, object.dimensions.depth + 0.02]} />
          <meshStandardMaterial color={stripeColor} metalness={0.2} roughness={0.7} />
        </mesh>

        <lineSegments position={[0, object.dimensions.height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(object.dimensions.width, object.dimensions.height, object.dimensions.depth)]} />
          <lineBasicMaterial color={accentColor} linewidth={isSelected ? 2 : 1} />
        </lineSegments>
      </group>

      {isSelected && (
        <mesh position={[0, object.dimensions.height + 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.35, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isDragging && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[object.dimensions.width + 0.5, object.dimensions.depth + 0.5]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
};
