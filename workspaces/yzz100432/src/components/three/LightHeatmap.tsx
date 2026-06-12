import { useMemo } from "react";
import * as THREE from "three";
import type { Tree, StreetLamp, PruningBoxState } from "../../types";
import { calculateLightingCoverage, getHeatmapColor } from "../../utils/lightingCalculator";

interface LightHeatmapProps {
  trees: Tree[];
  lamps: StreetLamp[];
  pruningBoxes: Map<string, PruningBoxState>;
  visible: boolean;
}

export function LightHeatmap({ trees, lamps, pruningBoxes, visible }: LightHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!visible) return null;
    return calculateLightingCoverage(trees, lamps, pruningBoxes, { width: 60, depth: 40 }, 400);
  }, [trees, lamps, pruningBoxes, visible]);

  if (!visible || !heatmapData) return null;

  const gridSize = Math.sqrt(400);
  const cellWidth = 60 / gridSize;
  const cellDepth = 40 / gridSize;

  return (
    <group position={[0, 0.05, 0]}>
      {Array.from({ length: gridSize }).map((_, i) =>
        Array.from({ length: gridSize }).map((_, j) => {
          const index = Math.floor(i * gridSize + j);
          const intensity = heatmapData.heatmapData[index];
          const color = getHeatmapColor(intensity);

          return (
            <mesh
              key={`${i}-${j}`}
              position={[
                -30 + (i + 0.5) * cellWidth,
                0,
                -20 + (j + 0.5) * cellDepth,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[cellWidth * 0.95, cellDepth * 0.95]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>
          );
        })
      )}
    </group>
  );
}
