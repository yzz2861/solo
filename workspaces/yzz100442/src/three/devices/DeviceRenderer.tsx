import { useStudioStore } from '@/store/useStudioStore';
import { AnchorDevice3D } from './AnchorDevice';
import { ProductTableDevice3D } from './ProductTableDevice';
import { CameraDevice3D } from './CameraDevice';
import { LightDevice3D } from './LightDevice';
import { ZoneDevice3D } from './ZoneDevice';
import type { StudioDevice } from '@/types/device';
import { useRef } from 'react';

interface DeviceRendererProps {}

export function DeviceRenderer({}: DeviceRendererProps) {
  const devices = useStudioStore((state) => state.devices);
  const selectedId = useStudioStore((state) => state.selectedId);
  const groupRef = useRef<any>(null);

  const renderDevice = (device: StudioDevice) => {
    const isSelected = selectedId === device.id;

    const deviceProps = {
      device,
      isSelected,
    };

    let DeviceComponent: any = null;
    switch (device.type) {
      case 'anchor':
        DeviceComponent = AnchorDevice3D;
        break;
      case 'productTable':
        DeviceComponent = ProductTableDevice3D;
        break;
      case 'camera':
        DeviceComponent = CameraDevice3D;
        break;
      case 'light':
        DeviceComponent = LightDevice3D;
        break;
      case 'zone':
        DeviceComponent = ZoneDevice3D;
        break;
      default:
        return null;
    }

    return (
      <group key={device.id} userData={{ deviceId: device.id }}>
        <DeviceComponent {...deviceProps} />
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      {devices.map(renderDevice)}
    </group>
  );
}
