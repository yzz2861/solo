import { useState, useRef, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { AnchorPoint } from "@/types";
import { useStore } from "@/store/useStore";

interface Props {
  anchor: AnchorPoint;
}

const SHORE_COLOR = "#4A90D9";
const WATER_COLOR = "#FF6B35";
const RESTRICTED_COLOR = "#FF0000";

function findNearestModulePosition(
  anchor: AnchorPoint,
  modules: { position: [number, number, number] }[]
): [number, number, number] {
  if (modules.length === 0) return anchor.position;
  let minDist = Infinity;
  let nearest: [number, number, number] = anchor.position;
  for (const m of modules) {
    const dx = m.position[0] - anchor.position[0];
    const dz = m.position[2] - anchor.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      nearest = m.position;
    }
  }
  return nearest;
}

export default function AnchorPoint3D({ anchor }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<[number, number, number]>(
    anchor.position
  );
  const planeHelper = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionPoint = useRef(new THREE.Vector3());

  const { camera, gl } = useThree();
  const modules = useStore((s) => s.modules);
  const updateAnchor = useStore((s) => s.updateAnchor);
  const setSelectedAnchor = useStore((s) => s.setSelectedAnchor);
  const selectedAnchorId = useStore((s) => s.selectedAnchorId);

  const isSelected = selectedAnchorId === anchor.id;
  const color = anchor.type === "shore" ? SHORE_COLOR : WATER_COLOR;

  const currentPos = dragging ? dragPos : anchor.position;

  const nearestModule = findNearestModulePosition(anchor, modules);
  const ropePoints: [number, number, number][] = [
    [currentPos[0], currentPos[1] + 0.3, currentPos[2]],
    [nearestModule[0], nearestModule[1] + 0.2, nearestModule[2]],
  ];

  const onPointerMove = useCallback(
    (evt: PointerEvent) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (evt.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(evt.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      planeHelper.current.set(
        new THREE.Vector3(0, 1, 0),
        -anchor.position[1]
      );
      if (
        raycaster.ray.intersectPlane(
          planeHelper.current,
          intersectionPoint.current
        )
      ) {
        setDragPos([
          intersectionPoint.current.x,
          anchor.position[1],
          intersectionPoint.current.z,
        ]);
      }
    },
    [camera, gl, anchor.position]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
    gl.domElement.style.cursor = "auto";
    updateAnchor(anchor.id, { position: dragPos });
  }, [dragPos, anchor.id, updateAnchor, gl]);

  useEffect(() => {
    if (!dragging) return;
    gl.domElement.style.cursor = "grabbing";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      gl.domElement.style.cursor = "auto";
    };
  }, [dragging, onPointerMove, onPointerUp, gl]);

  return (
    <group ref={groupRef} position={currentPos}>
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          setSelectedAnchor(anchor.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAnchor(isSelected ? null : anchor.id);
        }}
        castShadow
      >
        <cylinderGeometry args={[0.15, 0.4, 0.8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      <Line
        points={ropePoints}
        color="#AAAAAA"
        lineWidth={2}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {anchor.restrictedZone && (
        <mesh
          position={[
            anchor.restrictedZone.center[0] - anchor.position[0],
            0.05,
            anchor.restrictedZone.center[1] - anchor.position[2],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[anchor.restrictedZone.radius, 32]} />
          <meshBasicMaterial
            color={RESTRICTED_COLOR}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <Html
        position={[0, 1.5, 0]}
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
        {anchor.id}
      </Html>
    </group>
  );
}
