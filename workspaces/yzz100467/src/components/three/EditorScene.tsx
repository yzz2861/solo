import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, FXAA, Bloom, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import FloorScene from './FloorScene';
import SignMesh from './SignMesh';
import type { Sign, ComplianceWarning, FloorPlan, WarningLevel } from '@/types';

interface SceneProps {
  floor: FloorPlan;
  signs: Sign[];
  warnings: ComplianceWarning[];
  selectedSignId: string | null;
  focusSignId: string | null;
  onSelectSign: (id: string | null) => void;
  onUpdateSignPosition: (signId: string, position: { x: number; y: number; z: number }) => void;
  onWarningClick: (signId: string) => void;
  cameraTarget?: [number, number, number];
  viewMode: 'perspective' | 'top' | 'front';
}

function CameraController({ target, viewMode }: { target?: [number, number, number]; viewMode: string }) {
  const { camera, controls } = useThree() as any;
  useEffect(() => {
    if (!controls) return;
    if (target) {
      controls.target.set(target[0], target[1] + 1, target[2]);
      camera.position.lerp(new THREE.Vector3(target[0] + 6, target[1] + 5, target[2] + 8), 0.15);
    } else if (viewMode === 'top') {
      controls.target.set(20, 0, 12);
      camera.position.set(20, 45, 12.01);
    } else if (viewMode === 'front') {
      controls.target.set(20, 1.5, 12);
      camera.position.set(20, 3, 52);
    } else {
      controls.target.set(20, 1.5, 12);
      camera.position.set(48, 28, 40);
    }
    controls.update();
  }, [target, viewMode, camera, controls]);
  return null;
}

function WarningBubbles({ warnings, signs, onClick }: {
  warnings: ComplianceWarning[]; signs: Sign[]; onClick: (signId: string) => void;
}) {
  const bySign = new Map<string, { level: WarningLevel; count: number; warnings: ComplianceWarning[] }>();
  warnings.forEach((w) => {
    const prev = bySign.get(w.signId) || { level: 'info' as WarningLevel, count: 0, warnings: [] };
    prev.count++;
    prev.warnings.push(w);
    const order: WarningLevel[] = ['error', 'warning', 'info'];
    if (order.indexOf(w.level) < order.indexOf(prev.level)) prev.level = w.level;
    bySign.set(w.signId, prev);
  });
  const signMap = new Map(signs.map((s) => [s.id, s]));
  return (
    <>
      {Array.from(bySign.entries()).map(([signId, info]) => {
        const sign = signMap.get(signId);
        if (!sign) return null;
        const color = info.level === 'error' ? '#EF4444' : info.level === 'warning' ? '#F59E0B' : '#0EA5E9';
        const bg = info.level === 'error' ? '#FEF2F2' : info.level === 'warning' ? '#FFFBEB' : '#F0F9FF';
        return (
          <group key={signId} position={[sign.position.x, sign.position.y + sign.height + 0.35, sign.position.z]}>
            <Html center distanceFactor={14} zIndexRange={[50, 0]}>
              <div
                onClick={() => onClick(signId)}
                className="cursor-pointer select-none px-2 py-1 rounded-lg text-xs font-medium shadow-card-lg border animate-pulse-soft whitespace-nowrap backdrop-blur-sm"
                style={{ background: bg, color, borderColor: color + '55' }}
              >
                <span className="mr-1">⚠</span>
                {info.count}项违规
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export default function EditorScene(props: SceneProps) {
  const warningMap = new Map<string, WarningLevel>();
  props.warnings.forEach((w) => {
    const prev = warningMap.get(w.signId);
    const order: WarningLevel[] = ['error', 'warning', 'info'];
    if (!prev || order.indexOf(w.level) < order.indexOf(prev)) warningMap.set(w.signId, w.level);
  });

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [48, 28, 40], fov: 50, near: 0.1, far: 500 }}
      onPointerMissed={() => props.onSelectSign(null)}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#EEF2F7']} />
      <fog attach="fog" args={['#EEF2F7', 60, 160]} />
      <Suspense fallback={null}>
        <FloorScene floor={props.floor} />
        {props.signs.map((s) => (
          <SignMesh
            key={s.id}
            sign={s}
            selected={props.selectedSignId === s.id}
            warningLevel={warningMap.get(s.id) ?? null}
            onSelect={props.onSelectSign}
            onDragEnd={(id, pos) => props.onUpdateSignPosition(id, pos)}
            floorSize={props.floor.size}
          />
        ))}
        <WarningBubbles warnings={props.warnings} signs={props.signs} onClick={props.onWarningClick} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.1}
          target={[20, 1.5, 12]}
        />
        <CameraController target={props.focusSignId ? (() => {
          const s = props.signs.find((x) => x.id === props.focusSignId);
          return s ? [s.position.x, s.position.y, s.position.z] as [number, number, number] : undefined;
        })() : undefined} viewMode={props.viewMode} />
        <EffectComposer multisampling={0}>
          <SSAO radius={0.6} intensity={18} luminanceInfluence={0.6} worldDistanceThreshold={25} worldDistanceFalloff={8} worldProximityThreshold={0.2} worldProximityFalloff={0.08} />
          <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.9} intensity={0.35} mipmapBlur />
          <FXAA />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

export function captureCurrentCanvas(): string | null {
  try {
    const canvas = document.querySelector('.canvas-host canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
