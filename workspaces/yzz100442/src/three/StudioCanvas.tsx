import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useStudioStore } from '@/store/useStudioStore';
import { GridFloor } from './helpers/GridFloor';
import { DeviceRenderer } from './devices/DeviceRenderer';
import { SelectionHighlight } from './controls/SelectionHighlight';
import { Suspense, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface StudioCanvasProps {
  viewMode: 'perspective' | 'top' | 'front' | 'side';
}

function InteractiveScene() {
  const { raycaster, pointer, camera } = useThree();
  const updateDevice = useStudioStore((state) => state.updateDevice);
  const pushHistory = useStudioStore((state) => state.pushHistory);
  const selectDevice = useStudioStore((state) => state.selectDevice);
  const devices = useStudioStore((state) => state.devices);

  const isDragging = useRef(false);
  const draggedId = useRef<string | null>(null);
  const dragOffset = useRef(new THREE.Vector3());
  const startPos = useRef({ x: 0, z: 0 });
  const hasMoved = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  useEffect(() => {
    const handlePointerUp = () => {
      if (isDragging.current && draggedId.current && hasMoved.current) {
        pushHistory();
      }
      isDragging.current = false;
      draggedId.current = null;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [pushHistory]);

  useFrame(() => {
    if (!isDragging.current || !draggedId.current) return;

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      const newX = hitPoint.x - dragOffset.current.x;
      const newZ = hitPoint.z - dragOffset.current.z;

      if (Math.abs(newX - startPos.current.x) > 0.01 || Math.abs(newZ - startPos.current.z) > 0.01) {
        hasMoved.current = true;
      }

      updateDevice(draggedId.current, {
        position: {
          x: Math.round(newX * 10) / 10,
          y: 0,
          z: Math.round(newZ * 10) / 10,
        },
      } as any);
    }
  });

  const getDeviceIdFromEvent = (e: any): string | null => {
    let deviceId: string | null = null;
    let current = e.eventObject;

    while (current) {
      if (current.userData?.deviceId) {
        deviceId = current.userData.deviceId;
        break;
      }
      current = current.parent;
    }

    return deviceId;
  };

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return;

    const deviceId = getDeviceIdFromEvent(e);

    if (!deviceId) {
      selectDevice(null);
      return;
    }

    selectDevice(deviceId);

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        startPos.current = { x: device.position.x, z: device.position.z };
        dragOffset.current.set(hitPoint.x - device.position.x, 0, hitPoint.z - device.position.z);
        isDragging.current = true;
        draggedId.current = deviceId;
        hasMoved.current = false;
        document.body.style.cursor = 'grabbing';
      }
    }

    e.stopPropagation();
  };

  const handlePointerOver = (e: any) => {
    const deviceId = getDeviceIdFromEvent(e);
    if (deviceId && !isDragging.current) {
      setHoveredId(deviceId);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    if (!isDragging.current) {
      setHoveredId(null);
      document.body.style.cursor = 'default';
    }
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <DeviceRenderer />
      <SelectionHighlight hoveredId={hoveredId} />
    </group>
  );
}

export function StudioCanvas({ viewMode }: StudioCanvasProps) {
  const { studioSize, showGrid } = useStudioStore();

  const getCameraPosition = (): [number, number, number] => {
    const maxDim = Math.max(studioSize.width, studioSize.depth);
    switch (viewMode) {
      case 'top':
        return [0, maxDim * 1.5, 0.01];
      case 'front':
        return [0, maxDim * 0.5, -maxDim * 1.3];
      case 'side':
        return [maxDim * 1.3, maxDim * 0.5, 0];
      default:
        return [studioSize.width * 0.8, maxDim * 0.8, -studioSize.depth * 1.3];
    }
  };

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0f1a' }}
    >
      <PerspectiveCamera makeDefault position={getCameraPosition()} fov={50} />

      <color attach="background" args={['#0a0f1a']} />
      <fog attach="fog" args={['#0a0f1a', 15, 40]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, -5]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Suspense fallback={null}>
        {showGrid && <GridFloor size={studioSize} />}
        <InteractiveScene />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={30}
        maxPolarAngle={viewMode === 'top' ? Math.PI / 2 + 0.1 : Math.PI / 2.1}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}
