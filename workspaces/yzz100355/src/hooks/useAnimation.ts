import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlaybackStore } from '@/store/usePlaybackStore';

export const usePlaybackAnimation = () => {
  const lastTimeRef = useRef<number>(0);
  
  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 0;
    lastTimeRef.current = currentTime;
    
    const { isPlaying } = usePlaybackStore.getState();
    if (isPlaying && deltaTime > 0 && deltaTime < 0.1) {
      usePlaybackStore.getState().actions.update(deltaTime);
    }
  });
};

export const usePulseAnimation = (speed: number = 2) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * speed) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  return meshRef;
};

export const useFloatAnimation = (height: number = 0.5, speed: number = 1) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * speed) * height;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  return groupRef;
};

export const useCameraFollow = (target: [number, number, number] | null, smoothness: number = 0.05) => {
  const { camera } = useThree();
  const targetRef = useRef(target);
  
  useEffect(() => {
    targetRef.current = target;
  }, [target]);
  
  useFrame(() => {
    if (targetRef.current) {
      const [tx, ty, tz] = targetRef.current;
      const targetX = tx;
      const targetY = ty + 5;
      const targetZ = tz + 10;
      
      camera.position.x += (targetX - camera.position.x) * smoothness;
      camera.position.y += (targetY - camera.position.y) * smoothness;
      camera.position.z += (targetZ - camera.position.z) * smoothness;
      
      camera.lookAt(tx, ty, tz);
    }
  });
};

import { useThree } from '@react-three/fiber';
