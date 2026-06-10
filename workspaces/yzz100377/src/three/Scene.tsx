import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Shelf } from './objects/Shelf';
import { Forklift } from './objects/Forklift';
import { Zone } from './objects/Zone';
import { PathLine, CollisionMarker } from './objects/Path';
import { Ground } from './objects/Ground';
import { useSceneStore } from '@/store/useSceneStore';
import { generateId } from '@/utils/id';
import type { ShelfObject, ForkliftObject, ZoneObject, SceneObject } from '@/types/scene';

function SceneContent() {
  const {
    objects,
    paths,
    currentPathId,
    selectedObjectId,
    toolMode,
    isDrawingPath,
    collisions,
    displaySettings,
    isBriefingMode,
    briefingRiskIndex,
    selectObject,
    addObject,
    startPath,
    addPathPoint,
    finishPath,
  } = useSceneStore();

  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const briefingTargetRef = useRef(new THREE.Vector3());

  const handleGroundClick = (event: any) => {
    event.stopPropagation();
    const point = event.point;

    if (toolMode === 'select') {
      selectObject(null);
      return;
    }

    if (toolMode === 'path') {
      if (!isDrawingPath) {
        startPath();
      }
      addPathPoint(point.x, point.z);
      return;
    }

    let newObject: SceneObject | null = null;

    if (toolMode === 'shelf') {
      const shelfCount = objects.filter((o) => o.type === 'shelf').length;
      newObject = {
        id: generateId('shelf'),
        type: 'shelf',
        position: { x: point.x, y: 0, z: point.z },
        rotation: 0,
        width: 4,
        depth: 1,
        height: 5,
        levels: 5,
        hasPallet: true,
        palletOverhang: 0.15,
        name: `货架 ${shelfCount + 1}`,
        label: `S${shelfCount + 1}`,
      } as ShelfObject;
    } else if (toolMode === 'forklift') {
      const forkliftCount = objects.filter((o) => o.type === 'forklift').length;
      newObject = {
        id: generateId('forklift'),
        type: 'forklift',
        position: { x: point.x, y: 0, z: point.z },
        rotation: 0,
        forkLength: 1.2,
        wheelbase: 1.8,
        width: 1.2,
        turningRadius: 2.5,
        name: `${forkliftCount + 1}号叉车`,
        model: '标准内燃叉车',
      } as ForkliftObject;
    } else if (toolMode === 'zone_forbidden') {
      const forbiddenCount = objects.filter(
        (o) => o.type === 'zone' && (o as ZoneObject).zoneType === 'forbidden',
      ).length;
      newObject = {
        id: generateId('zone'),
        type: 'zone',
        position: { x: point.x, y: 0, z: point.z },
        rotation: 0,
        zoneType: 'forbidden',
        width: 3,
        depth: 3,
        name: `禁行区 ${forbiddenCount + 1}`,
      } as ZoneObject;
    } else if (toolMode === 'zone_pedestrian') {
      const pedestrianCount = objects.filter(
        (o) => o.type === 'zone' && (o as ZoneObject).zoneType === 'pedestrian',
      ).length;
      newObject = {
        id: generateId('zone'),
        type: 'zone',
        position: { x: point.x, y: 0, z: point.z },
        rotation: 0,
        zoneType: 'pedestrian',
        width: 2,
        depth: 10,
        name: `行人通道 ${pedestrianCount + 1}`,
      } as ZoneObject;
    }

    if (newObject) {
      addObject(newObject);
      selectObject(newObject.id);
    }
  };

  const handleDoubleClick = () => {
    if (toolMode === 'path' && isDrawingPath) {
      finishPath();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawingPath) {
          useSceneStore.getState().cancelPath();
        }
        useSceneStore.getState().setToolMode('select');
      }
      if (e.key === 'Enter' && isDrawingPath) {
        finishPath();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
        useSceneStore.getState().removeObject(selectedObjectId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingPath, selectedObjectId, finishPath]);

  const briefingRisks = useMemo(() => {
    return collisions.filter((c) => c.severity !== 'safe');
  }, [collisions]);

  const briefingRisk = briefingRisks[briefingRiskIndex] || null;

  useFrame((_, delta) => {
    if (isBriefingMode && briefingRisk && controlsRef.current) {
      const targetPos = new THREE.Vector3(
        briefingRisk.position.x + 5,
        4,
        briefingRisk.position.z + 5,
      );
      const lookTarget = new THREE.Vector3(
        briefingRisk.position.x,
        0,
        briefingRisk.position.z,
      );

      camera.position.lerp(targetPos, delta * 2);
      controlsRef.current.target.lerp(lookTarget, delta * 2);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 8, -5]} intensity={0.3} />
      <hemisphereLight args={['#4a90d9', '#1a1a2e', 0.3]} />

      <fog attach="fog" args={['#0f172a', 25, 60]} />

      <Ground size={60} gridSize={1} showGrid={displaySettings.showGrid} />

      {objects.map((obj) => {
        const isSelected = obj.id === selectedObjectId;

        if (obj.type === 'shelf') {
          return (
            <Shelf
              key={obj.id}
              object={obj as ShelfObject}
              selected={isSelected}
              onClick={() => {
                if (toolMode === 'select') {
                  selectObject(obj.id);
                }
              }}
            />
          );
        }

        if (obj.type === 'forklift') {
          return (
            <Forklift
              key={obj.id}
              object={obj as ForkliftObject}
              selected={isSelected}
              showTurnRadius={displaySettings.showTurnRadius && isSelected}
              onClick={() => {
                if (toolMode === 'select') {
                  selectObject(obj.id);
                }
              }}
            />
          );
        }

        if (obj.type === 'zone') {
          return (
            <Zone
              key={obj.id}
              object={obj as ZoneObject}
              selected={isSelected}
              onClick={() => {
                if (toolMode === 'select') {
                  selectObject(obj.id);
                }
              }}
            />
          );
        }

        return null;
      })}

      {paths.map((path) => (
        <PathLine
          key={path.id}
          path={path}
          isDrawing={isDrawingPath && path.id === currentPathId}
          showTurnRadius={displaySettings.showTurnRadius}
        />
      ))}

      {displaySettings.showCollisionZones &&
        collisions.map((c, i) => (
          <CollisionMarker
            key={`collision-${i}`}
            position={[c.position.x, 0.5, c.position.z]}
            severity={c.severity}
            label={c.description}
          />
        ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={!isBriefingMode}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enabled={!isBriefingMode}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        onClick={handleGroundClick}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

interface SceneProps {
  className?: string;
}

export function Scene({ className }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [18, 14, 18], fov: 50 }}
      gl={{ antialias: true }}
      className={className}
    >
      <color attach="background" args={['#0f172a']} />
      <SceneContent />
    </Canvas>
  );
}
