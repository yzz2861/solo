import { useState, useRef, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { BridgeModule } from "@/types";
import { useStore } from "@/store/useStore";

interface Props {
  module: BridgeModule;
}

const BASE_COLOR = new THREE.Color("#8B6914");
const HOVER_COLOR = new THREE.Color("#B8941E");
const SELECTED_COLOR = new THREE.Color("#D4AA20");

function StraightGeometry({ length, width }: { length: number; width: number }) {
  return <boxGeometry args={[length, 0.4, width]} />;
}

function CurveGeometry({ length, width }: { length: number; width: number }) {
  const radius = length * 0.8;
  const tubeRadius = width * 0.3;
  return (
    <torusGeometry args={[radius, tubeRadius, 8, 24, Math.PI / 4]} />
  );
}

function PlatformGeometry({ width }: { width: number }) {
  return <boxGeometry args={[width, 0.25, width]} />;
}

export default function BridgeModule3D({ module }: Props) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedModuleId = useStore((s) => s.selectedModuleId);
  const setSelectedModule = useStore((s) => s.setSelectedModule);

  const isSelected = selectedModuleId === module.id;

  const color = useMemo(() => {
    if (isSelected) return SELECTED_COLOR;
    if (hovered) return HOVER_COLOR;
    return BASE_COLOR;
  }, [isSelected, hovered]);

  const position: [number, number, number] = [
    module.position[0],
    module.position[1],
    module.position[2],
  ];

  const rotation: [number, number, number] = [0, module.rotation, 0];

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedModule(isSelected ? null : module.id);
        }}
        castShadow
        receiveShadow
      >
        {module.type === "straight" && (
          <StraightGeometry length={module.length} width={module.width} />
        )}
        {module.type === "curve" && (
          <CurveGeometry length={module.length} width={module.width} />
        )}
        {module.type === "platform" && (
          <PlatformGeometry width={module.width} />
        )}
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>

      {isSelected && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          {module.type === "straight" && (
            <StraightGeometry length={module.length} width={module.width} />
          )}
          {module.type === "curve" && (
            <CurveGeometry length={module.length} width={module.width} />
          )}
          {module.type === "platform" && (
            <PlatformGeometry width={module.width} />
          )}
          <meshBasicMaterial
            color="#FFD700"
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      <Html
        position={[0, 1.2, 0]}
        center
        style={{
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 11,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {module.id}
      </Html>
    </group>
  );
}
