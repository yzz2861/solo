import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import WaterSurface from "./WaterSurface";
import BridgeModule3D from "./BridgeModule3D";
import AnchorPoint3D from "./AnchorPoint3D";
import WindArrow from "./WindArrow";
import { useStore } from "@/store/useStore";

const RESTRICTED_ZONES: { center: [number, number]; radius: number }[] = [
  { center: [-15, -10], radius: 3 },
  { center: [12, 8], radius: 4 },
  { center: [-5, 15], radius: 2.5 },
];

function RestrictedZone({
  center,
  radius,
}: {
  center: [number, number];
  radius: number;
}) {
  return (
    <mesh
      position={[center[0], 0.02, center[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        color="#FF0000"
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent() {
  const modules = useStore((s) => s.modules);
  const anchors = useStore((s) => s.anchors);
  const envParams = useStore((s) => s.envParams);

  return (
    <>
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        color="#FFF5E1"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-near={0.1}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <ambientLight intensity={0.4} color="#E8F0FF" />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#88CCEE" distance={30} />

      <Sky
        distance={450000}
        sunPosition={[10, 20, 10]}
        inclination={0.52}
        azimuth={0.25}
      />
      <Environment preset="sunset" />

      <WaterSurface />

      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#446688"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#6688AA"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {modules.map((m) => (
        <BridgeModule3D key={m.id} module={m} />
      ))}

      {anchors.map((a) => (
        <AnchorPoint3D key={a.id} anchor={a} />
      ))}

      {RESTRICTED_ZONES.map((zone, i) => (
        <RestrictedZone key={i} center={zone.center} radius={zone.radius} />
      ))}

      <WindArrow
        direction={envParams.windDirection}
        speed={envParams.windSpeed}
      />

      <OrbitControls
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={80}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [15, 15, 15], fov: 50, near: 0.1, far: 500 }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => {
        useStore.getState().setSelectedModule(null);
        useStore.getState().setSelectedAnchor(null);
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
