import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useObjectStore } from '../store/useObjectStore';

export const useDragDrop = () => {
  const { startDrag, updateDragPosition, endDrag, selectObject } = useObjectStore();
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const offsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const intersectionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, objectId: string, position: [number, number, number]) => {
      e.stopPropagation();
      selectObject(objectId);
      
      const worldPosition = new THREE.Vector3(...position);
      (e.object as THREE.Object3D).updateMatrixWorld();
      (e.object as THREE.Object3D).localToWorld(worldPosition);
      
      const event = e as unknown as { raycaster: THREE.Raycaster };
      if (event.raycaster.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
        offsetRef.current.copy(intersectionRef.current).sub(worldPosition);
      }
      
      startDrag(objectId, [...position] as [number, number, number]);
      
      const target = e.target as unknown as HTMLElement;
      const canvas = target.ownerDocument?.body;
      if (canvas) {
        canvas.style.cursor = 'grabbing';
      }
    },
    [selectObject, startDrag]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>, objectId: string) => {
      e.stopPropagation();
      
      const state = useObjectStore.getState();
      if (!state.dragState.isDragging || state.dragState.objectId !== objectId) return;
      
      const event = e as unknown as { raycaster: THREE.Raycaster };
      if (event.raycaster.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
        const newPos = intersectionRef.current.clone().sub(offsetRef.current);
        updateDragPosition(objectId, [newPos.x, newPos.y, newPos.z]);
      }
    },
    [updateDragPosition]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      endDrag();
      
      const target = e.target as unknown as HTMLElement;
      const canvas = target.ownerDocument?.body;
      if (canvas) {
        canvas.style.cursor = 'auto';
      }
    },
    [endDrag]
  );

  const handlePointerMissed = useCallback(() => {
    selectObject(null);
  }, [selectObject]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerMissed,
  };
};
