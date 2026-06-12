import type { StudioDevice, CameraDevice, LightDevice, AnchorDevice, ProductTableDevice, ZoneDevice } from '@/types/device';
import type { Alert } from '@/types/alert';

const distance2D = (
  p1: { x: number; z: number },
  p2: { x: number; z: number }
): number => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
};

const getDeviceGroundSize = (device: StudioDevice): { width: number; depth: number } => {
  if (device.type === 'anchor') return (device as AnchorDevice).size;
  if (device.type === 'productTable') {
    const d = device as ProductTableDevice;
    return { width: d.size.width, depth: d.size.depth };
  }
  if (device.type === 'zone') return (device as ZoneDevice).size;
  if (device.type === 'camera') return { width: 0.3, depth: 0.3 };
  if (device.type === 'light') return { width: 0.3, depth: 0.3 };
  return { width: 0.5, depth: 0.5 };
};

const checkBoxOverlap = (
  a: { x: number; z: number; w: number; d: number; rotY: number },
  b: { x: number; z: number; w: number; d: number; rotY: number }
): boolean => {
  const dist = distance2D({ x: a.x, z: a.z }, { x: b.x, z: b.z });
  const minDist = (Math.max(a.w, a.d) + Math.max(b.w, b.d)) / 2;
  return dist < minDist * 0.8;
};

export const runDetection = (devices: StudioDevice[]): Alert[] => {
  const alerts: Alert[] = [];
  const cameras = devices.filter((d) => d.type === 'camera') as CameraDevice[];
  const lights = devices.filter((d) => d.type === 'light') as LightDevice[];
  const anchors = devices.filter((d) => d.type === 'anchor') as AnchorDevice[];
  const tables = devices.filter((d) => d.type === 'productTable') as ProductTableDevice[];
  const zones = devices.filter((d) => d.type === 'zone') as ZoneDevice[];

  cameras.forEach((cam) => {
    const camGroundPos = { x: cam.position.x, z: cam.position.z };
    const camHeight = cam.height;

    anchors.forEach((anchor) => {
      const dist = distance2D(camGroundPos, { x: anchor.position.x, z: anchor.position.z });

      if (dist < 2) {
        alerts.push({
          id: `cam-too-close-${cam.id}-${anchor.id}`,
          level: 'warning',
          title: '相机距离主播过近',
          description: `${cam.name} 距离 ${anchor.name} 仅 ${dist.toFixed(1)} 米，可能拍不到全身`,
          deviceId: cam.id,
          relatedDeviceIds: [anchor.id],
          suggestion: '建议将相机后移至 3-5 米距离',
        });
      }
      if (dist > 8) {
        alerts.push({
          id: `cam-too-far-${cam.id}-${anchor.id}`,
          level: 'info',
          title: '相机距离主播较远',
          description: `${cam.name} 距离 ${anchor.name} ${dist.toFixed(1)} 米，人物可能较小`,
          deviceId: cam.id,
          relatedDeviceIds: [anchor.id],
          suggestion: '如需清晰的人像，可适当拉近相机或增大焦距',
        });
      }
    });

    tables.forEach((table) => {
      const camAngle = cam.rotation.y;
      const dx = table.position.x - cam.position.x;
      const dz = table.position.z - cam.position.z;
      const angleToTable = Math.atan2(dx, dz);
      const angleDiff = Math.abs(((angleToTable - camAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

      if (angleDiff < (cam.fov * Math.PI) / 360) {
        const dist = distance2D(camGroundPos, { x: table.position.x, z: table.position.z });
        const tableTopHeight = table.size.height;

        if (camHeight < tableTopHeight && dist < 3) {
          alerts.push({
            id: `cam-occluded-${cam.id}-${table.id}`,
            level: 'error',
            title: '商品台遮挡相机',
            description: `${table.name} 可能遮挡 ${cam.name} 的视线`,
            deviceId: cam.id,
            relatedDeviceIds: [table.id],
            suggestion: '升高相机机位、或将商品台移至侧面，避免遮挡',
          });
        }
      }
    });
  });

  lights.forEach((light) => {
    if (light.height < 1.5) {
      alerts.push({
        id: `light-too-low-${light.id}`,
        level: 'warning',
        title: '灯架高度偏低',
        description: `${light.name} 高度仅 ${light.height.toFixed(1)} 米，可能影响照明效果`,
        deviceId: light.id,
        suggestion: '建议将灯架升高至 2-3 米，获得更好的照明角度',
      });
    }
    if (light.height > 4) {
      alerts.push({
        id: `light-too-high-${light.id}`,
        level: 'info',
        title: '灯架高度较高',
        description: `${light.name} 高度 ${light.height.toFixed(1)} 米，注意层高限制`,
        deviceId: light.id,
        suggestion: '确认棚顶高度足够，避免灯光碰到天花板',
      });
    }
  });

  if (anchors.length > 0 && tables.length > 0) {
    const anchor = anchors[0];
    tables.forEach((table) => {
      const dist = distance2D(
        { x: anchor.position.x, z: anchor.position.z },
        { x: table.position.x, z: table.position.z }
      );

      if (dist > 2.5) {
        alerts.push({
          id: `anchor-to-table-far-${anchor.id}-${table.id}`,
          level: 'warning',
          title: '主播动线距离商品较远',
          description: `${anchor.name} 到 ${table.name} 距离 ${dist.toFixed(1)} 米，主播拿取商品不便`,
          deviceId: anchor.id,
          relatedDeviceIds: [table.id],
          suggestion: '建议将商品台放在主播伸手可及的范围内（1-2米）',
        });
      }
    });
  }

  const solidDevices = [...anchors, ...tables];
  for (let i = 0; i < solidDevices.length; i++) {
    for (let j = i + 1; j < solidDevices.length; j++) {
      const a = solidDevices[i];
      const b = solidDevices[j];
      const sizeA = getDeviceGroundSize(a);
      const sizeB = getDeviceGroundSize(b);

      if (
        checkBoxOverlap(
          { x: a.position.x, z: a.position.z, w: sizeA.width, d: sizeA.depth, rotY: a.rotation.y },
          { x: b.position.x, z: b.position.z, w: sizeB.width, d: sizeB.depth, rotY: b.rotation.y }
        )
      ) {
        alerts.push({
          id: `device-overlap-${a.id}-${b.id}`,
          level: 'error',
          title: '设备位置重叠',
          description: `${a.name} 与 ${b.name} 位置重叠`,
          deviceId: a.id,
          relatedDeviceIds: [b.id],
          suggestion: '将设备移开，避免物理冲突',
        });
      }
    }
  }

  const walkways = zones.filter((z) => z.zoneType === 'walkway');
  walkways.forEach((walkway) => {
    const wz = walkway.size.width / 2;
    const wd = walkway.size.depth / 2;
    const wx = walkway.position.x;
    const wzPos = walkway.position.z;

    lights.forEach((light) => {
      if (
        light.position.x > wx - wz &&
        light.position.x < wx + wz &&
        light.position.z > wzPos - wd &&
        light.position.z < wzPos + wd
      ) {
        alerts.push({
          id: `light-in-walkway-${light.id}-${walkway.id}`,
          level: 'warning',
          title: '灯架在通道内',
          description: `${light.name} 位于 ${walkway.name} 范围内，可能影响通行`,
          deviceId: light.id,
          relatedDeviceIds: [walkway.id],
          suggestion: '将灯架移至通道外侧，避免挡路',
        });
      }
    });
  });

  return alerts;
};
