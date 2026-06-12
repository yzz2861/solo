import { useRef } from 'react';
import * as THREE from 'three';

export default function Lights() {
  const dirRef = useRef<THREE.DirectionalLight>(null);
  return (
    <>
      <hemisphereLight args={['#7AA7D4', '#1A2436', 0.55]} />
      <ambientLight intensity={0.3} color="#88AACC" />
      <directionalLight
        ref={dirRef}
        position={[25, 35, 15]}
        intensity={1.2}
        color="#FFD9A8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.00015}
      />
      <pointLight position={[-18, 12, 22]} intensity={0.5} color="#FFA94D" distance={30} />
      <pointLight position={[22, 8, -14]} intensity={0.45} color="#6AB5FF" distance={28} />
      <pointLight position={[0, 14, 0]} intensity={0.3} color="#FF8A3D" distance={20} />
      <fog attach="fog" args={['#0A1628', 60, 140]} />
    </>
  );
}
