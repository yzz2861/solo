import type { Tree, PruningBoxState, StreetLamp, Sign, Bench } from "../types";

interface SurroundingElement {
  type: "lamp" | "sign" | "bench" | "road";
  position: [number, number, number];
  distance: number;
}

export function calculateLandscapeScore(
  originalTree: Tree,
  pruningBox: PruningBoxState,
  elements: { lamps: StreetLamp[]; signs: Sign[]; benches: Bench[] }
): {
  totalScore: number;
  breakdown: {
    shapeScore: number;
    obstructionScore: number;
    harmonyScore: number;
  };
} {
  const surroundings = collectSurroundingElements(originalTree, elements);

  const shapeScore = calculateShapeScore(originalTree, pruningBox);
  const obstructionScore = calculateObstructionScore(originalTree, pruningBox, surroundings);
  const harmonyScore = calculateHarmonyScore(originalTree, pruningBox, surroundings);

  const totalScore = Math.round((shapeScore * 0.4 + obstructionScore * 0.3 + harmonyScore * 0.3) * 10) / 10;

  return {
    totalScore: Math.min(10, Math.max(0, totalScore)),
    breakdown: {
      shapeScore,
      obstructionScore,
      harmonyScore,
    },
  };
}

function collectSurroundingElements(
  tree: Tree,
  elements: { lamps: StreetLamp[]; signs: Sign[]; benches: Bench[] }
): SurroundingElement[] {
  const surroundings: SurroundingElement[] = [];
  const treePos = { x: tree.positionX, z: tree.positionZ };

  for (const lamp of elements.lamps) {
    const dist = Math.sqrt(
      Math.pow(lamp.position[0] - treePos.x, 2) +
      Math.pow(lamp.position[2] - treePos.z, 2)
    );
    if (dist < 15) {
      surroundings.push({
        type: "lamp",
        position: lamp.position,
        distance: dist,
      });
    }
  }

  for (const sign of elements.signs) {
    const dist = Math.sqrt(
      Math.pow(sign.position[0] - treePos.x, 2) +
      Math.pow(sign.position[2] - treePos.z, 2)
    );
    if (dist < 10) {
      surroundings.push({
        type: "sign",
        position: sign.position,
        distance: dist,
      });
    }
  }

  for (const bench of elements.benches) {
    const dist = Math.sqrt(
      Math.pow(bench.position[0] - treePos.x, 2) +
      Math.pow(bench.position[2] - treePos.z, 2)
    );
    if (dist < 12) {
      surroundings.push({
        type: "bench",
        position: bench.position,
        distance: dist,
      });
    }
  }

  return surroundings;
}

function calculateShapeScore(
  tree: Tree,
  pruningBox: PruningBoxState
): number {
  const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
  const prunedBottom = pruningBox.position[1] - pruningBox.size[1] / 2;
  const prunedWidth = pruningBox.size[0];
  const prunedDepth = pruningBox.size[2];

  const heightRatio = prunedTop / tree.height;
  const widthRatio = prunedWidth / (tree.crownRadius * 2);
  const depthRatio = prunedDepth / (tree.crownRadius * 2);

  const symmetryPenalty = Math.abs(widthRatio - depthRatio);

  const volumeRatio =
    (prunedWidth * prunedDepth * (prunedTop - prunedBottom)) /
    (tree.crownRadius * tree.crownRadius * tree.height);

  let score = 10;

  if (heightRatio < 0.5) {
    score -= (0.5 - heightRatio) * 10;
  }

  if (volumeRatio > 0.6) {
    score -= (volumeRatio - 0.6) * 10;
  }

  if (symmetryPenalty > 0.3) {
    score -= symmetryPenalty * 5;
  }

  if (tree.crownShape === "conical" && heightRatio < 0.7) {
    score -= 1;
  }

  return Math.max(0, Math.min(10, score));
}

function calculateObstructionScore(
  tree: Tree,
  pruningBox: PruningBoxState,
  surroundings: SurroundingElement[]
): number {
  const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
  let score = 10;

  const signs = surroundings.filter((s) => s.type === "sign");
  const lamps = surroundings.filter((s) => s.type === "lamp");

  for (const sign of signs) {
    const signHeight = sign.position[1] + 1;
    if (prunedTop > signHeight && sign.distance < tree.crownRadius + 2) {
      score -= (1 - sign.distance / 10) * 3;
    }
  }

  for (const lamp of lamps) {
    const lampHeight = lamp.position[1] + 2;
    if (prunedTop > lampHeight && lamp.distance < tree.crownRadius + 3) {
      score -= (1 - lamp.distance / 15) * 2;
    }
  }

  const clearance = pruningBox.position[1] - pruningBox.size[1] / 2;
  if (clearance >= 2.5) {
    score += 1;
  } else if (clearance < 2.0) {
    score -= 2;
  }

  return Math.max(0, Math.min(10, score));
}

function calculateHarmonyScore(
  tree: Tree,
  pruningBox: PruningBoxState,
  surroundings: SurroundingElement[]
): number {
  let score = 8;

  const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
  const prunedRatio = (prunedTop / tree.height);

  const nearbyBenches = surroundings.filter((s) => s.type === "bench");
  if (nearbyBenches.length > 0) {
    if (prunedRatio > 0.8) {
      score += 1;
    }
  }

  const nearbyLamps = surroundings.filter((s) => s.type === "lamp");
  if (nearbyLamps.length > 0 && prunedRatio < 0.9) {
    score += 1;
  }

  if (tree.healthStatus === "fair" && prunedRatio > 0.85) {
    score -= 1;
  }

  if (tree.species === "桂花" && prunedRatio > 0.8) {
    score -= 1;
  }

  const widthRatio = pruningBox.size[0] / (tree.crownRadius * 2);
  if (widthRatio > 0.9 && widthRatio < 1.1) {
    score += 1;
  }

  return Math.max(0, Math.min(10, score));
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "#10B981";
  if (score >= 6) return "#FF9F1C";
  return "#E63946";
}

export function getScoreLabel(score: number): string {
  if (score >= 9) return "优秀";
  if (score >= 7) return "良好";
  if (score >= 5) return "一般";
  return "需改进";
}

export function determinePruningSide(
  tree: Tree,
  pruningBox: PruningBoxState
): string {
  const dx = pruningBox.position[0] - tree.positionX;
  const dz = pruningBox.position[2] - tree.positionZ;
  const dy = pruningBox.position[1] - tree.height / 2;

  const sides: string[] = [];

  if (Math.abs(dx) > 0.5) {
    sides.push(dx > 0 ? "东侧" : "西侧");
  }

  if (Math.abs(dz) > 0.5) {
    sides.push(dz > 0 ? "南侧" : "北侧");
  }

  if (dy > 0.5) {
    sides.push("上部");
  } else if (dy < -0.5) {
    sides.push("下部");
  }

  if (sides.length === 0) {
    const prunedTop = pruningBox.position[1] + pruningBox.size[1] / 2;
    if (prunedTop < tree.height * 0.8) {
      sides.push("顶部");
    } else {
      sides.push("整体");
    }
  }

  return sides.join("、");
}

export function generatePhotoRequirements(
  tree: Tree,
  pruningSide: string
): string {
  const requirements = [
    "修剪前全景照1张（包含树木编号牌）",
    "修剪后全景照1张（相同角度）",
    `${pruningSide}局部特写2张`,
  ];

  if (tree.heightEstimated) {
    requirements.push("现场测量高度照片1张");
  }

  if (tree.healthStatus === "fair") {
    requirements.push("树木健康状况特写1张");
  }

  return requirements.join("；");
}
