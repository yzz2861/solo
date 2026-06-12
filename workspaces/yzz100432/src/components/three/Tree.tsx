import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Tree as TreeType, PruningBoxState } from "../../types";

interface TreeProps {
  tree: TreeType;
  selected: boolean;
  pruningBox?: PruningBoxState;
  onClick: () => void;
}

export function Tree({ tree, selected, pruningBox, onClick }: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Mesh>(null);

  const { crownGeometry, trunkGeometry } = useMemo(() => {
    const trunkHeight = tree.height * 0.3;
    const crownHeight = tree.height - trunkHeight;

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 8);
    trunkGeo.translate(0, trunkHeight / 2, 0);

    let crownGeo: THREE.BufferGeometry;
    const crownRadius = tree.crownRadius;

    switch (tree.crownShape) {
      case "conical":
        crownGeo = new THREE.ConeGeometry(crownRadius, crownHeight, 12);
        crownGeo.translate(0, trunkHeight + crownHeight / 2, 0);
        break;
      case "oval":
        crownGeo = new THREE.SphereGeometry(crownRadius, 16, 12);
        crownGeo.scale(1, 1.3, 1);
        crownGeo.translate(0, trunkHeight + crownHeight / 2, 0);
        break;
      case "irregular":
        crownGeo = new THREE.IcosahedronGeometry(crownRadius, 1);
        const positions = crownGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          const noise = 0.2 + Math.random() * 0.3;
          positions.setX(i, x * (1 + (Math.random() - 0.5) * noise));
          positions.setY(i, y * (1.2 + (Math.random() - 0.5) * noise));
          positions.setZ(i, z * (1 + (Math.random() - 0.5) * noise));
        }
        crownGeo.computeVertexNormals();
        crownGeo.translate(0, trunkHeight + crownHeight / 2, 0);
        break;
      default:
        crownGeo = new THREE.SphereGeometry(crownRadius, 16, 12);
        crownGeo.translate(0, trunkHeight + crownHeight / 2, 0);
    }

    return { crownGeometry: crownGeo, trunkGeometry: trunkGeo };
  }, [tree]);

  const prunedCrownGeometry = useMemo(() => {
    if (!pruningBox || !pruningBox.visible) return null;

    const trunkHeight = tree.height * 0.3;
    const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
    const originalCrownHeight = tree.height - trunkHeight;
    const newCrownHeight = Math.max(
      originalCrownHeight,
      prunedTop - trunkHeight
    );

    if (newCrownHeight <= 0.5) return null;

    const crownGeo = new THREE.SphereGeometry(tree.crownRadius, 16, 12);
    crownGeo.scale(1, newCrownHeight / originalCrownHeight, 1);
    crownGeo.translate(0, trunkHeight + newCrownHeight / 2, 0);

    return crownGeo;
  }, [tree, pruningBox]);

  useFrame((state) => {
    if (selected && groupRef.current) {
      groupRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 2) * 0.02
      );
    }
  });

  const leafColor = tree.healthStatus === "good" 
    ? "#2d6b52" 
    : tree.healthStatus === "fair" 
      ? "#3d8b6a" 
      : "#5a8a6e";

  return (
    <group
      ref={groupRef}
      position={[tree.positionX, tree.positionY, tree.positionZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <mesh geometry={trunkGeometry}>
        <meshStandardMaterial
          color="#5D4037"
          roughness={0.9}
        />
      </mesh>

      {prunedCrownGeometry ? (
        <>
          <mesh geometry={prunedCrownGeometry} ref={crownRef}>
            <meshStandardMaterial
              color={leafColor}
              roughness={0.8}
              transparent
              opacity={selected ? 0.9 : 1}
            />
          </mesh>
          <mesh geometry={crownGeometry}>
            <meshStandardMaterial
              color={leafColor}
              roughness={0.8}
              transparent
              opacity={0.3}
              wireframe={selected}
            />
          </mesh>
        </>
      ) : (
        <mesh geometry={crownGeometry} ref={crownRef}>
          <meshStandardMaterial
            color={leafColor}
            roughness={0.8}
            transparent
            opacity={selected ? 0.85 : 1}
          />
        </mesh>
      )}

      {selected && (
        <mesh position={[0, tree.height + 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#3A86FF" transparent opacity={0.8} />
        </mesh>
      )}

      {tree.heightEstimated && (
        <mesh position={[0, tree.height / 2, tree.crownRadius + 0.5]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#FF9F1C" />
        </mesh>
      )}
    </group>
  );
}
