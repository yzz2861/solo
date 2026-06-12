import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PruningBoxState } from "../../types";

interface PruningBoxProps {
  state: PruningBoxState;
  hasCollision: boolean;
  onDrag: (position: [number, number, number]) => void;
  onResize: (size: [number, number, number]) => void;
}

export function PruningBox({ state, hasCollision, onDrag, onResize }: PruningBoxProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...state.position);
      groupRef.current.rotation.set(...state.rotation);
    }
  }, [state.position, state.rotation]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(state.size[0], state.size[1], state.size[2]);
    }
  });

  if (!state.visible) return null;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    e.target.setPointerCapture(e.pointerId);

    const normal = new THREE.Vector3(0, 1, 0);
    dragPlane.current.setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(...state.position)
    );
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return;
    e.stopPropagation();

    const rect = e.target.closest("canvas").getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, e.camera);
    const intersection = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, intersection);

    if (intersection) {
      onDrag([intersection.x, state.position[1], intersection.z]);
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  const boxColor = hasCollision ? "#E63946" : "#FF9F1C";

  return (
    <group ref={groupRef}>
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={boxColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color={boxColor} linewidth={2} />
      </lineSegments>

      <mesh position={[0, 0.5, 0]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.2, 0.1, 0.2]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      <mesh position={[0, -0.5, 0]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.2, 0.1, 0.2]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      <mesh position={[0.5, 0, 0]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.1, 0.2, 0.2]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      <mesh position={[-0.5, 0, 0]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.1, 0.2, 0.2]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      <mesh position={[0, 0, 0.5]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>
      <mesh position={[0, 0, -0.5]} onPointerDown={(e) => e.stopPropagation()}>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color={boxColor} />
      </mesh>

      <mesh position={[0, -0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color={boxColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
