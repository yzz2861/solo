import * as THREE from "three";
import type { Tree, StreetLamp, PruningBoxState } from "../types";

export function calculateLightingCoverage(
  trees: Tree[],
  lamps: StreetLamp[],
  pruningBoxes: Map<string, PruningBoxState>,
  areaSize: { width: number; depth: number } = { width: 60, depth: 40 },
  sampleCount: number = 400
): { coverage: number; heatmapData: Float32Array } {
  const raycaster = new THREE.Raycaster();
  const heatmapData = new Float32Array(sampleCount);
  let coveredPoints = 0;

  const gridSize = Math.sqrt(sampleCount);
  const cellWidth = areaSize.width / gridSize;
  const cellDepth = areaSize.depth / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const point = new THREE.Vector3(
        -areaSize.width / 2 + (i + 0.5) * cellWidth,
        0.1,
        -areaSize.depth / 2 + (j + 0.5) * cellDepth
      );

      let maxIntensity = 0;

      for (const lamp of lamps) {
        const lampPos = new THREE.Vector3(...lamp.position);
        lampPos.y = lamp.height;

        const direction = point.clone().sub(lampPos).normalize();
        const distance = lampPos.distanceTo(point);

        if (distance > lamp.radius) continue;

        raycaster.set(lampPos, direction);
        raycaster.far = distance;

        const treeMeshes = createTreeBoundingBoxes(trees, pruningBoxes);
        const intersects = raycaster.intersectObjects(treeMeshes, true);

        if (intersects.length === 0 || intersects[0].distance >= distance - 0.5) {
          const attenuation = 1 - distance / lamp.radius;
          const intensity = lamp.intensity * attenuation;
          maxIntensity = Math.max(maxIntensity, intensity);
        }
      }

      const index = Math.floor(i * gridSize + j);
      heatmapData[index] = maxIntensity;

      if (maxIntensity > 0.3) {
        coveredPoints++;
      }
    }
  }

  return {
    coverage: coveredPoints / sampleCount,
    heatmapData,
  };
}

function createTreeBoundingBoxes(
  trees: Tree[],
  pruningBoxes: Map<string, PruningBoxState>
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  for (const tree of trees) {
    const pruningBox = pruningBoxes.get(tree.id);
    let treeHeight = tree.height;
    let treeRadius = tree.crownRadius;

    if (pruningBox && pruningBox.visible) {
      const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
      treeHeight = Math.min(tree.height, prunedTop);
    }

    const geometry = new THREE.CylinderGeometry(
      treeRadius * 0.3,
      treeRadius,
      treeHeight,
      8
    );
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(tree.positionX, treeHeight / 2, tree.positionZ);
    meshes.push(mesh);
  }

  return meshes;
}

export function getHeatmapColor(intensity: number): string {
  if (intensity <= 0.2) {
    const t = intensity / 0.2;
    return `rgb(${Math.round(230 + t * 25)}, ${Math.round(57 + t * 100)}, ${Math.round(70 + t * 50)})`;
  } else if (intensity <= 0.5) {
    const t = (intensity - 0.2) / 0.3;
    return `rgb(${Math.round(255 - t * 100)}, ${Math.round(159 + t * 50)}, ${Math.round(28 + t * 100)})`;
  } else {
    const t = (intensity - 0.5) / 0.5;
    return `rgb(${Math.round(155 - t * 100)}, ${Math.round(209 + t * 46)}, ${Math.round(128 + t * 80)})`;
  }
}

export function calculateSingleTreeLighting(
  tree: Tree,
  lamps: StreetLamp[],
  pruningBox?: PruningBoxState
): { before: number; after: number; improvement: number } {
  let beforeCoverage = 0;
  let afterCoverage = 0;
  const samplePoints = 50;

  const treePos = new THREE.Vector3(tree.positionX, 0, tree.positionZ);
  const relevantLamps = lamps.filter(
    (l) =>
      new THREE.Vector3(l.position[0], 0, l.position[2]).distanceTo(treePos) <
      l.radius * 2
  );

  for (let i = 0; i < samplePoints; i++) {
    const angle = (i / samplePoints) * Math.PI * 2;
    const radius = tree.crownRadius * 1.5;
    const point = new THREE.Vector3(
      tree.positionX + Math.cos(angle) * radius,
      1.5,
      tree.positionZ + Math.sin(angle) * radius
    );

    let litBefore = true;
    let litAfter = true;

    for (const lamp of relevantLamps) {
      const lampPos = new THREE.Vector3(lamp.position[0], lamp.height, lamp.position[2]);
      const direction = point.clone().sub(lampPos).normalize();
      const distance = lampPos.distanceTo(point);

      if (distance > lamp.radius) continue;

      const raycaster = new THREE.Raycaster(lampPos, direction, 0, distance);

      const beforeBox = new THREE.Box3(
        new THREE.Vector3(
          tree.positionX - tree.crownRadius,
          0,
          tree.positionZ - tree.crownRadius
        ),
        new THREE.Vector3(
          tree.positionX + tree.crownRadius,
          tree.height,
          tree.positionZ + tree.crownRadius
        )
      );

      if (raycaster.ray.intersectsBox(beforeBox)) {
        litBefore = false;
      }

      if (pruningBox) {
        const prunedHeight = pruningBox.position[1] + pruningBox.size[1] / 2;
        const afterBox = new THREE.Box3(
          new THREE.Vector3(
            tree.positionX - tree.crownRadius,
            0,
            tree.positionZ - tree.crownRadius
          ),
          new THREE.Vector3(
            tree.positionX + tree.crownRadius,
            Math.min(tree.height, prunedHeight),
            tree.positionZ + tree.crownRadius
          )
        );

        if (raycaster.ray.intersectsBox(afterBox)) {
          litAfter = false;
        }
      } else {
        litAfter = litBefore;
      }
    }

    if (litBefore) beforeCoverage++;
    if (litAfter) afterCoverage++;
  }

  const before = beforeCoverage / samplePoints;
  const after = afterCoverage / samplePoints;

  return {
    before,
    after,
    improvement: after - before,
  };
}
