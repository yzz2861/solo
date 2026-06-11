import { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { DragControls } from '@react-three/drei';
import type { BaseDevice } from '../../types/devices';
import type { Position } from '../../types/devices';
import { snapPositionToGrid } from '../../utils/geometry';

interface DragControllerProps {
  children: React.ReactNode;
  devices: BaseDevice[];
  selectedDeviceId: string | null;
  onDragEnd: (deviceId: string, newPosition: Position) => void;
}

export function DragController({ children, devices, selectedDeviceId, onDragEnd }: DragControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);

  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    const handleDragStart = (event: any) => {
      const object = event.object;
      if (object && object.userData.deviceId) {
        setDraggingDeviceId(object.userData.deviceId);
        setDragStartPos({
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        });
      }
    };

    const handleDragEnd = (event: any) => {
      const object = event.object;
      if (object && object.userData.deviceId && draggingDeviceId) {
        const newPosition = snapPositionToGrid({
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        }, 0.5);

        if (dragStartPos && (
          Math.abs(newPosition.x - dragStartPos.x) > 0.01 ||
          Math.abs(newPosition.y - dragStartPos.y) > 0.01 ||
          Math.abs(newPosition.z - dragStartPos.z) > 0.01
        )) {
          onDragEnd(draggingDeviceId, newPosition);
        }
      }
      setDraggingDeviceId(null);
      setDragStartPos(null);
    };

    controls.addEventListener('dragstart', handleDragStart);
    controls.addEventListener('dragend', handleDragEnd);

    return () => {
      controls.removeEventListener('dragstart', handleDragStart);
      controls.removeEventListener('dragend', handleDragEnd);
    };
  }, [draggingDeviceId, dragStartPos, onDragEnd]);

  return (
    <group ref={groupRef}>
      <DragControls ref={controlsRef}>
        {children}
      </DragControls>
    </group>
  );
}
