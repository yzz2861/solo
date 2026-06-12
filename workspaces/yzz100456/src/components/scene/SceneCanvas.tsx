import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Lights from './Lights';
import Dock from './Dock';
import Crane from './Crane';
import Cargo from './Cargo';
import RadiusCircle from './RadiusCircle';
import Zone from './Zone';
import type { LiftPlan } from '@/types';
import type { OperationRisk } from '@/hooks/useRiskEngine';
import { usePlanStore } from '@/hooks/usePlanStore';

interface Props {
  plan: LiftPlan;
  operationRisks: OperationRisk[];
  activeOperationId?: string;
  hasDanger: boolean;
}

function CanvasBinder() {
  const { gl } = useThree();
  const setCanvas = usePlanStore(s => s.setCanvasRef);
  useEffect(() => {
    setCanvas(gl.domElement);
    return () => setCanvas(null);
  }, [gl.domElement, setCanvas]);
  return null;
}

export default function SceneCanvas({ plan, operationRisks, activeOperationId, hasDanger }: Props) {
  const controlsRef = useRef<any>(null);
  return (
    <Canvas
      shadows
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #1a2a45 0%, #0a1628 55%, #050912 100%)' }}
    >
      <CanvasBinder />
      <PerspectiveCamera makeDefault position={[38, 30, 42]} fov={45} near={0.1} far={500} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={90}
        maxPolarAngle={Math.PI / 2.08}
        target={[0, 3, 0]}
      />
      <Lights />
      <fog attach="fog" args={['#0a1628', 60, 160]} />
      <Dock />
      {plan.zones.map(z => (
        <Zone key={z.id} zone={z} />
      ))}
      <RadiusCircle
        center={plan.crane.basePosition}
        operations={plan.operations}
        operationRisks={operationRisks}
        activeOpId={activeOperationId}
        hasDanger={hasDanger}
      />
      <Cargo cargo={plan.cargo} cranePosition={plan.crane.basePosition} />
      <Crane
        crane={plan.crane}
        operations={plan.operations}
        activeOperationId={activeOperationId}
      />
      <EffectComposer>
        <Bloom
          intensity={0.45}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.8}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
