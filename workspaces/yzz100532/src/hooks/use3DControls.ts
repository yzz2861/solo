import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraMode } from '../store/useSceneStore';
import useSceneStore from '../store/useSceneStore';

export interface Use3DControlsOptions {
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  movementSpeed?: number;
  lookSensitivity?: number;
}

export interface Use3DControlsReturn {
  orbitControlsRef: React.RefObject<OrbitControlsImpl>;
  lockPointer: () => void;
  unlockPointer: () => void;
  resetCamera: () => void;
  initialCameraPosition: THREE.Vector3;
  initialCameraTarget: THREE.Vector3;
  options: Required<Use3DControlsOptions>;
}

const DEFAULT_OPTIONS: Required<Use3DControlsOptions> = {
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 10,
  maxDistance: 200,
  minPolarAngle: 0.1,
  maxPolarAngle: Math.PI / 2 - 0.1,
  movementSpeed: 50,
  lookSensitivity: 0.002,
};

export function use3DControls(
  options: Use3DControlsOptions = {}
): Use3DControlsReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const { camera, gl } = useThree();
  const cameraMode = useSceneStore((state) => state.cameraMode);
  const setCameraMode = useSceneStore((state) => state.setCameraMode);

  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const initialCameraPosition = useRef(new THREE.Vector3(60, 60, 60));
  const initialCameraTarget = useRef(new THREE.Vector3(60, 0, 0));

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isLocked = useRef(false);

  const unlockPointer = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  const lockPointer = useCallback(() => {
    if (cameraMode === 'firstPerson') {
      gl.domElement.requestPointerLock();
    }
  }, [cameraMode, gl.domElement]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (cameraMode !== 'firstPerson' || !isLocked.current) return;

      const { lookSensitivity } = mergedOptions;

      yawRef.current -= event.movementX * lookSensitivity;
      pitchRef.current -= event.movementY * lookSensitivity;

      pitchRef.current = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, pitchRef.current)
      );

      const lookDirection = new THREE.Vector3(
        -Math.sin(yawRef.current) * Math.cos(pitchRef.current),
        Math.sin(pitchRef.current),
        -Math.cos(yawRef.current) * Math.cos(pitchRef.current)
      );

      const lookTarget = new THREE.Vector3()
        .copy(camera.position)
        .add(lookDirection);
      camera.lookAt(lookTarget);
    },
    [camera, cameraMode, mergedOptions]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      keys.current[event.code] = true;

      if (event.code === 'KeyV' && !event.repeat) {
        const newMode: CameraMode =
          cameraMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
        setCameraMode(newMode);
      }

      if (event.code === 'Escape' && cameraMode === 'firstPerson') {
        unlockPointer();
      }
    },
    [cameraMode, setCameraMode, unlockPointer]
  );

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keys.current[event.code] = false;
  }, []);

  const handlePointerLockChange = useCallback(() => {
    isLocked.current = document.pointerLockElement === gl.domElement;

    if (isLocked.current && cameraMode === 'firstPerson') {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      yawRef.current = Math.atan2(-cameraDirection.x, -cameraDirection.z);
      pitchRef.current = Math.asin(cameraDirection.y);
    }
  }, [camera, cameraMode, gl.domElement]);

  const resetCamera = useCallback(() => {
    camera.position.copy(initialCameraPosition.current);

    if (cameraMode === 'thirdPerson' && orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(initialCameraTarget.current);
      orbitControlsRef.current.update();
    } else if (cameraMode === 'firstPerson') {
      camera.lookAt(initialCameraTarget.current);
      yawRef.current = 0;
      pitchRef.current = 0;
    }
  }, [camera, cameraMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleKeyDown, handleKeyUp, handlePointerLockChange, handleMouseMove]);

  useFrame((_, delta) => {
    if (cameraMode !== 'firstPerson' || !isLocked.current) {
      return;
    }

    const { movementSpeed } = mergedOptions;

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z =
      Number(keys.current['KeyS'] || 0) - Number(keys.current['KeyW'] || 0);
    direction.current.x =
      Number(keys.current['KeyD'] || 0) - Number(keys.current['KeyA'] || 0);
    direction.current.normalize();

    if (keys.current['KeyW'] || keys.current['KeyS']) {
      velocity.current.z -= direction.current.z * movementSpeed * delta * 10;
    }
    if (keys.current['KeyA'] || keys.current['KeyD']) {
      velocity.current.x -= direction.current.x * movementSpeed * delta * 10;
    }

    const moveX = velocity.current.x * delta;
    const moveZ = velocity.current.z * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    camera.position.addScaledVector(forward, -moveZ);
    camera.position.addScaledVector(right, -moveX);

    const minY = 2;
    const maxY = 50;
    camera.position.y = Math.max(minY, Math.min(maxY, camera.position.y));

    const boundary = 200;
    camera.position.x = Math.max(
      -boundary,
      Math.min(boundary, camera.position.x)
    );
    camera.position.z = Math.max(
      -boundary,
      Math.min(boundary, camera.position.z)
    );
  });

  useEffect(() => {
    if (cameraMode === 'firstPerson') {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = false;
      }
    } else {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true;
      }
      unlockPointer();
    }
  }, [cameraMode, unlockPointer]);

  return {
    orbitControlsRef,
    lockPointer,
    unlockPointer,
    resetCamera,
    initialCameraPosition: initialCameraPosition.current,
    initialCameraTarget: initialCameraTarget.current,
    options: mergedOptions,
  };
}

export default use3DControls;
