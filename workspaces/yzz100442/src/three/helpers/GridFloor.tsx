import * as THREE from 'three';

interface GridFloorProps {
  size: { width: number; depth: number };
}

export function GridFloor({ size }: GridFloorProps) {
  const gridSize = Math.max(size.width, size.depth) * 1.5;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <gridHelper
        args={[gridSize, 20, '#1e3a5f', '#0f2540']}
        position={[0, 0.01, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[size.width, size.depth]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.15} />
      </mesh>

      <lineSegments
        geometry={new THREE.EdgesGeometry(new THREE.PlaneGeometry(size.width, size.depth))}
      >
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </lineSegments>
    </group>
  );
}
