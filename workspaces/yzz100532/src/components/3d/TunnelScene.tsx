import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, SpotLight } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import TunnelWalls from './TunnelWalls';
import RouteLine from './RouteLine';
import FacilityMarker from './FacilityMarker';
import PersonnelMarker from './PersonnelMarker';
import { useSceneStore } from '../../store/useSceneStore';

function SceneLighting() {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame((state) => {
    if (lightRef.current && targetRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.position.x = 60 + Math.sin(t * 0.3) * 2;
      lightRef.current.position.z = Math.cos(t * 0.3) * 2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} color="#4a5568" />
      <SpotLight
        ref={lightRef}
        position={[60, 8, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={200}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        target={targetRef.current}
      />
      <primitive object={targetRef.current || new THREE.Object3D()} />
      <pointLight position={[0, 3, 0]} intensity={30} color="#ffa500" distance={30} />
      <pointLight position={[120, 3, 0]} intensity={30} color="#ffa500" distance={30} />
      <pointLight position={[60, 3, 30]} intensity={30} color="#ffa500" distance={30} />
    </>
  );
}

function SceneFog() {
  return <fog attach="fog" args={['#0a0a0f', 20, 150]} />;
}

function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Noise opacity={0.03} />
      <Vignette offset={0.3} darkness={0.6} />
    </EffectComposer>
  );
}

function SceneContent() {
  const visibility = useSceneStore((state) => state.visibility);

  return (
    <>
      {visibility.walls && <TunnelWalls />}
      {visibility.route && <RouteLine />}
      {visibility.facilities && <FacilityMarker />}
      {visibility.personnel && <PersonnelMarker />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[60, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 150]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
    </>
  );
}

function CameraController() {
  const controlsRef = useRef<any>(null);

  useMemo(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(60, 2, 0);
    }
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={200}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 6}
    />
  );
}

export default function TunnelScene() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#050510' }}>
      <Canvas
        shadows
        camera={{ position: [60, 40, 80], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#050510');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          scene.fog = new THREE.Fog('#0a0a0f', 20, 150);
        }}
      >
        <SceneLighting />
        <CameraController />
        <SceneContent />
        <PostProcessing />
      </Canvas>
    </div>
  );
}
