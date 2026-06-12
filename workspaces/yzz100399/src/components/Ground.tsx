import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Ground() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame(() => {});

  return (
    <group>
      <gridHelper ref={gridRef} args={[20, 20, "#475569", "#334155"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}
