import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { Stage } from './Stage';
import { LightRig } from './LightRig';
import { Speaker } from './Speaker';
import { HoistPoint } from './HoistPoint';
import { AudienceArea } from './AudienceArea';
import { ConnectionLine } from './ConnectionLine';
import { DragController } from './DragController';
import { isStage, isLightRig, isSpeaker, isHoistPoint, isAudienceArea } from '../../types/devices';
import type { BaseDevice, DeviceType, Position } from '../../types/devices';
import { getLoadDistributions } from '../../utils/safetyEngine';
import { COLORS } from '../../constants/colors';
import { distance3D } from '../../utils/geometry';

interface GroundPlaneProps {
  onGroundClick: (position: Position) => void;
}

function GroundPlane({ onGroundClick }: GroundPlaneProps) {
  const { placingDeviceType, isPlacingDevice, cancelPlacingDevice } = useUIStore();
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isPlacingDevice && placingDeviceType) {
      const point = e.point;
      onGroundClick({ x: point.x, y: 0, z: point.z });
      cancelPlacingDevice();
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onClick={handleClick}
      onPointerMissed={(e: any) => {
        if (e.type === 'click') {
          useProjectStore.getState().selectDevice(null);
        }
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        color={COLORS.background.primary}
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}

interface PlacingPreviewProps {
  type: DeviceType | null;
}

function PlacingPreview({ type }: PlacingPreviewProps) {
  const { camera } = useThree();
  const previewRef = useRef<THREE.Group>(null);
  const { placingDeviceType } = useUIStore();

  useFrame((state) => {
    if (!previewRef.current || !placingDeviceType) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (state.mouse.x) / 2 + 0.5;
    mouse.y = -(state.mouse.y) / 2 + 0.5;
    
    raycaster.setFromCamera(state.mouse, camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    if (intersectPoint) {
      const yOffset = type === 'lightRig' ? 6 : type === 'speaker' ? 3 : type === 'hoistPoint' ? 8 : 0;
      previewRef.current.position.set(
        Math.round(intersectPoint.x * 2) / 2,
        yOffset,
        Math.round(intersectPoint.z * 2) / 2
      );
    }
  });

  if (!placingDeviceType) return null;

  const dimensions = {
    stage: [12, 0.8, 8],
    lightRig: [3, 0.3, 0.3],
    speaker: [0.6, 1.2, 0.5],
    hoistPoint: [0.3, 0.3, 0.3],
    audienceArea: [15, 0.1, 10],
  }[placingDeviceType] || [1, 1, 1];

  const color = {
    stage: COLORS.devices.stage,
    lightRig: COLORS.devices.lightRig,
    speaker: COLORS.devices.speaker,
    hoistPoint: COLORS.devices.hoistPoint,
    audienceArea: COLORS.status.info,
  }[placingDeviceType] || '#ffffff';

  const yOffset = dimensions[1] / 2;

  return (
    <group ref={previewRef}>
      <mesh position={[0, yOffset, 0]}>
        <boxGeometry args={dimensions as [number, number, number]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>
    </group>
  );
}

interface SceneContentProps {
  onGroundClick: (position: Position) => void;
}

function SceneContent({ onGroundClick }: SceneContentProps) {
  const { project, selectedDeviceId, selectDevice, updateDevice } = useProjectStore();
  const { placingDeviceType } = useUIStore();

  const loadDistributions = useMemo(() => {
    if (!project) return new Map<string, number>();
    const dists = getLoadDistributions(project.devices, project.safetySettings);
    return new Map(dists.map(d => [d.hoistPointId, d.totalLoad]));
  }, [project]);

  const connections = useMemo(() => {
    if (!project) return [];
    
    const hoistPoints = project.devices.filter(isHoistPoint);
    const equipment = project.devices.filter(d => isLightRig(d) || isSpeaker(d));
    const conns: Array<{
      id: string;
      start: Position;
      end: Position;
      loadRatio: number;
      isOverloaded: boolean;
    }> = [];

    equipment.forEach(device => {
      hoistPoints.forEach(hp => {
        const dist = distance3D(device.position, hp.position);
        if (dist < 10) {
          const load = loadDistributions.get(hp.id) || 0;
          const maxLoad = hp.maxLoad || project.safetySettings.maxHoistLoad;
          conns.push({
            id: `${device.id}-${hp.id}`,
            start: {
              x: hp.position.x,
              y: hp.position.y - 0.3,
              z: hp.position.z,
            },
            end: {
              x: device.position.x,
              y: device.position.y + (isLightRig(device) ? 0 : (device.dimensions?.height || 1) / 2),
              z: device.position.z,
            },
            loadRatio: load / maxLoad,
            isOverloaded: load >= maxLoad,
          });
        }
      });
    });

    return conns;
  }, [project, loadDistributions]);

  if (!project) return null;

  const handleDeviceDragEnd = (deviceId: string, newPosition: Position) => {
    updateDevice(deviceId, { position: newPosition });
  };

  return (
    <>
      <DragController
        devices={project.devices}
        selectedDeviceId={selectedDeviceId}
        onDragEnd={handleDeviceDragEnd}
      >
        {project.devices.map((device) => {
          const isSelected = device.id === selectedDeviceId;
          const hasRisks = project.risks.some(r => r.deviceId === device.id);
          const currentLoad = loadDistributions.get(device.id) || 0;

          if (isStage(device)) {
            return (
              <Stage
                key={device.id}
                device={device}
                isSelected={isSelected}
                onClick={() => selectDevice(device.id)}
              />
            );
          }

          if (isLightRig(device)) {
            return (
              <LightRig
                key={device.id}
                device={device}
                isSelected={isSelected}
                hasRisks={hasRisks}
                risks={project.risks}
                onClick={() => selectDevice(device.id)}
              />
            );
          }

          if (isSpeaker(device)) {
            return (
              <Speaker
                key={device.id}
                device={device}
                isSelected={isSelected}
                hasRisks={hasRisks}
                risks={project.risks}
                onClick={() => selectDevice(device.id)}
              />
            );
          }

          if (isHoistPoint(device)) {
            return (
              <HoistPoint
                key={device.id}
                device={device}
                isSelected={isSelected}
                hasRisks={hasRisks}
                risks={project.risks}
                currentLoad={currentLoad}
                onClick={() => selectDevice(device.id)}
              />
            );
          }

          if (isAudienceArea(device)) {
            return (
              <AudienceArea
                key={device.id}
                device={device}
                isSelected={isSelected}
                onClick={() => selectDevice(device.id)}
              />
            );
          }

          return null;
        })}
      </DragController>

      {connections.map(conn => (
        <ConnectionLine
          key={conn.id}
          start={conn.start}
          end={conn.end}
          isOverloaded={conn.isOverloaded}
          loadRatio={conn.loadRatio}
        />
      ))}

      <PlacingPreview type={placingDeviceType} />
      <GroundPlane onGroundClick={onGroundClick} />
    </>
  );
}

interface Scene3DProps {
  onGroundClick: (position: Position) => void;
}

export function Scene3D({ onGroundClick }: Scene3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [15, 12, 15], fov: 50 }}
      style={{ background: COLORS.background.primary }}
    >
      <color attach="background" args={[COLORS.background.primary]} />
      <fog attach="fog" args={[COLORS.background.primary, 30, 80]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
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
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.5}
        color="#ffd89b"
      />
      <directionalLight
        position={[5, 5, -10]}
        intensity={0.3}
        color={COLORS.status.info}
      />

      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d323b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3a4150"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <SceneContent onGroundClick={onGroundClick} />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={50}
        blur={2}
        far={10}
        color="#000000"
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minPolarAngle={0.2}
      />

      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
