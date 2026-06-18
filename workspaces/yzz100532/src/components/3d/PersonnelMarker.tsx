import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';

function PersonnelModel() {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const bounce = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      groupRef.current.position.y = 1 + bounce;
    }
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
      ringRef.current.scale.set(scale, scale, 1);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1, 0]}>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
        <meshBasicMaterial color="#e67e22" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#f39c12" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.3} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 4, 8]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#ff8c00" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function PersonnelMarker() {
  const personnelPosition = useSceneStore((state) => state.personnelPosition);
  const visibility = useSceneStore((state) => state.visibility);

  if (!visibility.personnel || !personnelPosition) return null;

  return (
    <group position={[personnelPosition.x, personnelPosition.y, personnelPosition.z]}>
      <PersonnelModel />
    </group>
  );
}
