import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useStudioStore } from '@/store/useStudioStore';
import type { StudioDevice } from '@/types/device';

interface SelectionHighlightProps {
  hoveredId: string | null;
}

export function SelectionHighlight({ hoveredId }: SelectionHighlightProps) {
  const selectedId = useStudioStore((state) => state.selectedId);
  const devices = useStudioStore((state) => state.devices);
  const alerts = useStudioStore((state) => state.alerts);
  const ringRef = useRef<any>(null);

  const getDeviceSize = (device: StudioDevice): number => {
    if (device.type === 'anchor') return Math.max(device.size.width, device.size.depth);
    if (device.type === 'productTable') return Math.max(device.size.width, device.size.depth);
    if (device.type === 'zone') return Math.max(device.size.width, device.size.depth);
    return 0.4;
  };

  const hasError = (deviceId: string): boolean => {
    return alerts.some((a) => a.level === 'error' && (a.deviceId === deviceId || a.relatedDeviceIds?.includes(deviceId)));
  };

  const hasWarning = (deviceId: string): boolean => {
    return alerts.some((a) => a.level === 'warning' && (a.deviceId === deviceId || a.relatedDeviceIds?.includes(deviceId)));
  };

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  const renderHighlight = (id: string, type: 'selected' | 'hover' | 'error') => {
    const device = devices.find((d) => d.id === id);
    if (!device) return null;

    const size = getDeviceSize(device);
    const radius = size * 0.7;

    let color = '#3b82f6';
    let opacity = 0.6;
    let lineWidth = 0.03;

    if (type === 'error') {
      color = '#ef4444';
      opacity = 0.8;
    } else if (type === 'hover') {
      color = '#60a5fa';
      opacity = 0.4;
    }

    return (
      <mesh
        key={`${id}-${type}`}
        position={[device.position.x, 0.05, device.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[radius - lineWidth, radius, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={2}
        />
      </mesh>
    );
  };

  return (
    <group>
      {selectedId && renderHighlight(selectedId, 'selected')}
      {hoveredId && hoveredId !== selectedId && renderHighlight(hoveredId, 'hover')}

      {devices.map((device) => {
        if (hasError(device.id) && device.id !== selectedId) {
          return renderHighlight(device.id, 'error');
        }
        return null;
      })}
    </group>
  );
}
