import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Atrium } from './Atrium';
import { Booth } from './Booth';
import { Car } from './Car';
import { Barrier } from './Barrier';
import { PowerPoint } from './PowerPoint';
import { FireExit } from './FireExit';
import { Entrance } from './Entrance';
import { PowerLine } from './PowerLine';
import { useObjectStore } from '../../store/useObjectStore';
import { useMallStore } from '../../store/useMallStore';
import { useRiskDetection } from '../../hooks/useRiskDetection';
import { useDragDrop } from '../../hooks/useDragDrop';
import type { ObjectType } from '../../types';

interface SceneProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const SceneContent = () => {
  const objects = useObjectStore((state) => state.objects);
  const selectedId = useObjectStore((state) => state.selectedId);
  const addObject = useObjectStore((state) => state.addObject);
  const selectObject = useObjectStore((state) => state.selectObject);
  const { config } = useMallStore();
  const { handlePointerMissed } = useDragDrop();
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const { camera } = useThree();

  useRiskDetection();

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.target instanceof HTMLCanvasElement) {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
        
        if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
          const newType = (e.shiftKey ? 'car' : e.altKey ? 'barrier' : 'booth') as ObjectType;
          addObject(newType, [intersectionRef.current.x, 0, intersectionRef.current.z]);
        }
      }
    },
    [camera, addObject]
  );

  const renderObject = (obj: typeof objects[0]) => {
    switch (obj.type) {
      case 'booth':
        return <Booth key={obj.id} object={obj} />;
      case 'car':
        return <Car key={obj.id} object={obj} />;
      case 'barrier':
        return <Barrier key={obj.id} object={obj} />;
      default:
        return null;
    }
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#1a1a2e" />

      <Atrium />

      {config.fireExits.map((exit) => (
        <FireExit key={exit.id} exit={exit} />
      ))}

      {config.entrances.map((entrance) => (
        <Entrance key={entrance.id} entrance={entrance} />
      ))}

      {config.powerPoints.map((power) => (
        <PowerPoint
          key={power.id}
          power={power}
          isSelected={false}
          onClick={() => {}}
        />
      ))}

      {objects.map((obj) => renderObject(obj))}

      {objects
        .filter((o) => o.hasPower && o.powerSourceId)
        .map((obj) => (
          <PowerLine key={`line-${obj.id}`} object={obj} mall={config} />
        ))}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        onDoubleClick={handleDoubleClick}
        onClick={handlePointerMissed}
      >
        <planeGeometry args={[config.atriumDimensions.width, config.atriumDimensions.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />

      <Effects>
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={0.5} />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Effects>

      <fog attach="fog" args={['#0a0a14', 20, 60]} />
    </>
  );
};

export const Scene = ({ onCanvasReady }: SceneProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  return (
    <Canvas
      ref={canvasRef}
      shadows
      camera={{ position: [20, 15, 20], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a14');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <SceneContent />
    </Canvas>
  );
};
