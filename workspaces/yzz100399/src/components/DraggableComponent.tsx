import { useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import type { PlaygroundComponent } from "@/types";

interface DraggableComponentProps {
  comp: PlaygroundComponent;
  isSelected: boolean;
  isBlindSpot: boolean;
}

export function DraggableComponent({ comp, isSelected, isBlindSpot }: DraggableComponentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const { selectComponent, updatePosition } = usePlaygroundStore();

  const scale = comp.unit === "m" ? 100 : 1;
  const w = comp.dimensions.width * scale / 100;
  const h = comp.dimensions.height * scale / 100;
  const d = comp.dimensions.depth * scale / 100;
  const px = comp.position.x * scale / 100;
  const py = comp.position.y * scale / 100 + h / 2;
  const pz = comp.position.z * scale / 100;

  const colorMap: Record<string, string> = {
    platform: "#3B82F6",
    slide: "#22C55E",
    softpad: "#FF6B35",
    fence: "#F59E0B",
    supervisor: "#EF4444",
  };

  const baseColor = colorMap[comp.type] || "#888888";

  useFrame(() => {
    if (meshRef.current && !isDragging) {
      meshRef.current.position.set(px, py, pz);
      if (comp.type === "slide") {
        meshRef.current.rotation.x = -0.3;
      } else {
        meshRef.current.rotation.x = 0;
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    selectComponent(comp.id);
    setIsDragging(true);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -py);
    dragPlane.current.copy(plane);

    const intersection = new THREE.Vector3();
    e.ray.intersectPlane(dragPlane.current, intersection);
    if (intersection) {
      dragOffset.current.set(px - intersection.x, 0, pz - intersection.z);
    }

    if (e.target && (e.target as HTMLElement).setPointerCapture) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    const intersection = new THREE.Vector3();
    e.ray.intersectPlane(dragPlane.current, intersection);
    if (intersection) {
      const newX = (intersection.x + dragOffset.current.x) * 100 / scale;
      const newZ = (intersection.z + dragOffset.current.z) * 100 / scale;
      updatePosition(comp.id, newX, comp.position.y, newZ);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  if (comp.type === "supervisor") {
    return (
      <group>
        <mesh
          ref={meshRef}
          position={[px, py, pz]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <cylinderGeometry args={[0.15, 0.15, h, 16]} />
          <meshStandardMaterial
            color={isSelected ? "#FCA5A5" : baseColor}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[px, py + h / 2 + 0.15, pz]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={isSelected ? "#FCA5A5" : baseColor} transparent opacity={0.85} />
        </mesh>
        {isSelected && (
          <mesh position={[px, py, pz]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[2, 3, 32, 1, true]} />
            <meshStandardMaterial color="#EF4444" transparent opacity={0.12} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[px, py, pz]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        castShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={isSelected ? "#93C5FD" : isBlindSpot ? "#FCA5A5" : baseColor}
          transparent
          opacity={0.75}
        />
      </mesh>
      {isSelected && (
        <lineSegments position={[px, py, pz]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w + 0.02, h + 0.02, d + 0.02)]} />
          <lineBasicMaterial color="#FFFFFF" linewidth={2} />
        </lineSegments>
      )}
      {comp.bufferZone > 0 && isSelected && (
        <mesh position={[px, py, pz]}>
          <boxGeometry
            args={[
              (w * 100 + comp.bufferZone * (comp.unit === "m" ? 100 : 1) * 2) / 100,
              h + 0.02,
              (d * 100 + comp.bufferZone * (comp.unit === "m" ? 100 : 1) * 2) / 100,
            ]}
          />
          <meshStandardMaterial
            color="#FF6B35"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
