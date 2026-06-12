import * as THREE from "three";
import type { PruningBoxState, PowerLine, Warning, Tree, StreetLamp } from "../types";

export function checkPowerLineCollision(
  pruningBox: PruningBoxState,
  powerLines: PowerLine[]
): Warning | null {
  const boxMin = new THREE.Vector3(
    pruningBox.position[0] - pruningBox.size[0] / 2,
    pruningBox.position[1] - pruningBox.size[1] / 2,
    pruningBox.position[2] - pruningBox.size[2] / 2
  );
  const boxMax = new THREE.Vector3(
    pruningBox.position[0] + pruningBox.size[0] / 2,
    pruningBox.position[1] + pruningBox.size[1] / 2,
    pruningBox.position[2] + pruningBox.size[2] / 2
  );

  const box = new THREE.Box3(boxMin, boxMax);

  for (const line of powerLines) {
    const lineStart = new THREE.Vector3(...line.start);
    const lineEnd = new THREE.Vector3(...line.end);
    const line3 = new THREE.Line3(lineStart, lineEnd);

    const intersects = (() => {
      if (box.containsPoint(lineStart) || box.containsPoint(lineEnd)) {
        return true;
      }
      const target = new THREE.Vector3();
      const point = line3.closestPointToPoint(box.min, false, target);
      return box.containsPoint(point);
    })();

    if (intersects) {
      return {
        id: `warning-power-${line.id}`,
        type: "power_line",
        severity: "error",
        message: `修剪范围与${line.voltage === "high" ? "高压" : line.voltage === "medium" ? "中压" : "低压"}电线碰撞，请调整修剪范围`,
        position: [
          (line.start[0] + line.end[0]) / 2,
          line.height,
          (line.start[2] + line.end[2]) / 2,
        ],
      };
    }
  }

  return null;
}

export function checkHeightEstimation(tree: Tree | undefined): Warning | null {
  if (!tree) return null;
  if (tree.heightEstimated) {
    return {
      id: `warning-height-${tree.id}`,
      type: "height_incomplete",
      severity: "warning",
      message: "该树木高度为估算值，建议现场实测后再确定修剪方案",
      treeId: tree.id,
      position: [tree.positionX, tree.height / 2, tree.positionZ],
    };
  }
  return null;
}

export function calculateClearanceHeight(pruningBox: PruningBoxState): number {
  return pruningBox.position[1] - pruningBox.size[1] / 2;
}

export function getClearanceStatus(height: number): {
  status: "good" | "warning" | "danger";
  color: string;
  label: string;
} {
  if (height >= 2.5) {
    return { status: "good", color: "#10B981", label: "达标" };
  } else if (height >= 2.0) {
    return { status: "warning", color: "#FF9F1C", label: "警告" };
  } else {
    return { status: "danger", color: "#E63946", label: "不达标" };
  }
}

export function checkBlindSpots(
  tree: Tree,
  pruningBox: PruningBoxState,
  lamps: StreetLamp[],
  trees: Tree[]
): Warning[] {
  const warnings: Warning[] = [];
  const prunedHeight = pruningBox.position[1] + pruningBox.size[1] / 2;

  for (const lamp of lamps) {
    const lampPos = new THREE.Vector3(...lamp.position);
    lampPos.y = lamp.height;
    const treePos = new THREE.Vector3(tree.positionX, tree.height / 2, tree.positionZ);
    const distance = lampPos.distanceTo(treePos);

    if (distance < lamp.radius * 1.5 && distance > 1) {
      const direction = treePos.clone().sub(lampPos).normalize();
      const raycaster = new THREE.Raycaster(lampPos, direction, 0, distance);

      const treeObstacle = trees.find((t) => {
        if (t.id === tree.id) return false;
        const tPos = new THREE.Vector3(t.positionX, t.height / 2, t.positionZ);
        const tDist = lampPos.distanceTo(tPos);
        return tDist < distance && tDist > 1;
      });

      if (!treeObstacle && tree.height > prunedHeight + 1) {
        warnings.push({
          id: `warning-blind-${lamp.id}-${tree.id}`,
          type: "blind_spot",
          severity: "warning",
          message: `修剪后路灯光线仍被遮挡，建议增加顶部修剪高度`,
          treeId: tree.id,
          position: [tree.positionX, tree.height / 2, tree.positionZ],
        });
      }
    }
  }

  return warnings;
}

export function checkExcessivePruning(
  tree: Tree,
  pruningBox: PruningBoxState
): Warning | null {
  const prunedVolume = pruningBox.size[0] * pruningBox.size[1] * pruningBox.size[2];
  const originalVolume =
    (4 / 3) * Math.PI * tree.crownRadius * tree.crownRadius * tree.height;
  const prunedRatio = prunedVolume / originalVolume;

  if (prunedRatio > 0.5) {
    return {
      id: `warning-excessive-${tree.id}`,
      type: "excessive_pruning",
      severity: "warning",
      message: `修剪量过大(约${Math.round(prunedRatio * 100)}%)，可能影响树木健康`,
      treeId: tree.id,
    };
  }
  return null;
}

export function runAllChecks(
  tree: Tree | undefined,
  pruningBox: PruningBoxState,
  powerLines: PowerLine[],
  lamps: StreetLamp[],
  trees: Tree[]
): Warning[] {
  if (!tree || !pruningBox.visible) return [];

  const warnings: Warning[] = [];

  const heightWarning = checkHeightEstimation(tree);
  if (heightWarning) warnings.push(heightWarning);

  const powerWarning = checkPowerLineCollision(pruningBox, powerLines);
  if (powerWarning) warnings.push(powerWarning);

  const blindWarnings = checkBlindSpots(tree, pruningBox, lamps, trees);
  warnings.push(...blindWarnings);

  const excessiveWarning = checkExcessivePruning(tree, pruningBox);
  if (excessiveWarning) warnings.push(excessiveWarning);

  return warnings;
}
