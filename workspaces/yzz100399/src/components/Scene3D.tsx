import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { DraggableComponent } from "./DraggableComponent";
import { Ground } from "./Ground";

export function Scene3D() {
  const { components, selectedId, risks, selectComponent } = usePlaygroundStore();
  const blindSpotIds = new Set(
    risks.filter((r) => r.type === "blind_spot").flatMap((r) => r.componentIds)
  );

  const handleBackgroundClick = () => {
    selectComponent(null);
  };

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      shadows
      onPointerMissed={handleBackgroundClick}
      style={{ background: "#0F172A" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      <Ground />

      {components.map((comp) => (
        <DraggableComponent
          key={comp.id}
          comp={comp}
          isSelected={selectedId === comp.id}
          isBlindSpot={blindSpotIds.has(comp.id)}
        />
      ))}

      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={25}
        enablePan
      />
    </Canvas>
  );
}
