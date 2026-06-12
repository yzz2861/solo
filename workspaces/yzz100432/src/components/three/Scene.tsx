import { useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { useAppStore } from "../../store/useAppStore";
import { Tree } from "./Tree";
import { Road } from "./Road";
import { StreetLamp } from "./StreetLamp";
import { Sign } from "./Sign";
import { Bench } from "./Bench";
import { PowerLine } from "./PowerLine";
import { PruningBox } from "./PruningBox";
import { ClearanceLine } from "./ClearanceLine";
import { LightHeatmap } from "./LightHeatmap";
import { runAllChecks, calculateClearanceHeight } from "../../utils/collisionDetector";

interface SceneProps {
  showNightMode: boolean;
}

interface SceneContentProps {
  showNightMode: boolean;
}

function SceneContent({ showNightMode }: SceneContentProps) {
  const {
    trees,
    streetLamps,
    signs,
    benches,
    powerLines,
    roadSegments,
    selectedTreeId,
    pruningBox,
    showHeatmap,
    showClearanceLines,
    selectTree,
    updatePruningBox,
    setWarnings,
    warnings,
  } = useAppStore();

  const selectedTree = useMemo(
    () => trees.find((t) => t.id === selectedTreeId),
    [trees, selectedTreeId]
  );

  const pruningBoxMap = useMemo(() => {
    const map = new Map<string, typeof pruningBox>();
    if (selectedTreeId && pruningBox.visible) {
      map.set(selectedTreeId, pruningBox);
    }
    return map;
  }, [selectedTreeId, pruningBox]);

  const hasPowerLineCollision = useMemo(
    () => warnings.some((w) => w.type === "power_line"),
    [warnings]
  );

  const powerLineWarnings = useMemo(() => {
    return powerLines.map((line) => ({
      line,
      hasWarning: warnings.some(
        (w) => w.type === "power_line" && w.message.includes(line.id)
      ),
    }));
  }, [powerLines, warnings]);

  useEffect(() => {
    if (selectedTree && pruningBox.visible) {
      const newWarnings = runAllChecks(
        selectedTree,
        pruningBox,
        powerLines,
        streetLamps,
        trees
      );
      setWarnings(newWarnings);
    } else {
      setWarnings([]);
    }
  }, [selectedTree, pruningBox, powerLines, streetLamps, trees, setWarnings]);

  const handleDrag = (position: [number, number, number]) => {
    updatePruningBox({ position });
  };

  const handleResize = (size: [number, number, number]) => {
    updatePruningBox({ size });
  };

  const clearanceHeight = useMemo(() => {
    if (!pruningBox.visible) return 0;
    return calculateClearanceHeight(pruningBox);
  }, [pruningBox]);

  return (
    <>
      <ambientLight intensity={showNightMode ? 0.1 : 0.6} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={showNightMode ? 0.1 : 1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {!showNightMode && (
        <Sky
          distance={450000}
          sunPosition={[100, 50, 100]}
          inclination={0.5}
          azimuth={0.25}
        />
      )}

      {showNightMode && (
        <fog attach="fog" args={["#0a0a1a", 30, 100]} />
      )}

      <Road segments={roadSegments} />

      {trees.map((tree) => (
        <Tree
          key={tree.id}
          tree={tree}
          selected={tree.id === selectedTreeId}
          pruningBox={tree.id === selectedTreeId ? pruningBox : undefined}
          onClick={() => selectTree(tree.id === selectedTreeId ? null : tree.id)}
        />
      ))}

      {streetLamps.map((lamp) => (
        <StreetLamp key={lamp.id} lamp={lamp} showNightMode={showNightMode} />
      ))}

      {signs.map((sign) => (
        <Sign key={sign.id} sign={sign} />
      ))}

      {benches.map((bench) => (
        <Bench key={bench.id} bench={bench} />
      ))}

      {powerLineWarnings.map(({ line, hasWarning }) => (
        <PowerLine key={line.id} line={line} showWarning={hasWarning} />
      ))}

      {selectedTree && (
        <>
          <PruningBox
            state={pruningBox}
            hasCollision={hasPowerLineCollision}
            onDrag={handleDrag}
            onResize={handleResize}
          />
          {showClearanceLines && (
            <ClearanceLine
              tree={selectedTree}
              clearanceHeight={clearanceHeight}
              visible={pruningBox.visible}
            />
          )}
        </>
      )}

      <LightHeatmap
        trees={trees}
        lamps={streetLamps}
        pruningBoxes={pruningBoxMap}
        visible={showHeatmap}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      <gridHelper args={[100, 100, "#888888", "#cccccc"]} position={[0, 0.02, 0]} />
    </>
  );
}

export function Scene({ showNightMode }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 25, 30], fov: 50 }}
      gl={{ antialias: true }}
    >
      <SceneContent showNightMode={showNightMode} />
    </Canvas>
  );
}
